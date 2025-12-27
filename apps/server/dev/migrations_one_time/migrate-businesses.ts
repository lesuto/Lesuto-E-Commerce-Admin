import {
    bootstrap,
    ChannelService,
    RequestContextService,
    RoleService,
    AdministratorService,
    SellerService,
    Permission,
    LanguageCode,
    CurrencyCode,
    UserService,
    Channel,
    Seller,
    TransactionalConnection,
    User,
    CustomerService,
    ZoneService,
    CountryService,
    Zone,
    Country,
    RequestContext,
    Role
} from '@vendure/core';
import { config } from '../../src/vendure-config';
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import 'dotenv/config';

// --- CONFIGURATION ---
const BATCH_LIMIT = 5;
const DYNAMO_TABLE_NAME = "business";
const AWS_REGION = "us-west-2";

// --- HELPER: Unwrap DynamoDB format ---
function unwrap(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if ('S' in obj) return obj.S;
    if ('N' in obj) return Number(obj.N);
    if ('BOOL' in obj) return obj.BOOL;
    if ('SS' in obj) return obj.SS;
    if ('M' in obj) return unwrap(obj.M);
    if ('L' in obj) return obj.L.map(unwrap);

    const result: any = {};
    for (const key in obj) {
        result[key] = unwrap(obj[key]);
    }
    return result;
}

// --- MAIN BATCH MIGRATION ---
async function runMigration() {
    console.log("🚀 Bootstrapping Vendure...");
    const app = await bootstrap(config);

    const channelService = app.get(ChannelService);
    const roleService = app.get(RoleService);
    const adminService = app.get(AdministratorService);
    const sellerService = app.get(SellerService);
    const userService = app.get(UserService);
    const customerService = app.get(CustomerService);
    const zoneService = app.get(ZoneService);
    const countryService = app.get(CountryService);
    const ctxService = app.get(RequestContextService);
    const connection = app.get(TransactionalConnection);

    // Superadmin context
    const superAdminUser = await connection.getRepository(User).findOne({
        where: { identifier: 'superadmin' }
    });
    if (!superAdminUser) throw new Error("Superadmin not found");

    const ctx = await ctxService.create({
        apiType: 'admin',
        user: superAdminUser
    });

    const ddbClient = new DynamoDBClient({ region: AWS_REGION });

    let processedCount = 0;
    let skippedCount = 0;
    let lastEvaluatedKey: any = undefined;

    do {
        const command = new ScanCommand({
            TableName: DYNAMO_TABLE_NAME,
            Limit: BATCH_LIMIT,
            ExclusiveStartKey: lastEvaluatedKey
        });

        const response = await ddbClient.send(command);
        const items = response.Items || [];

        if (items.length === 0) break;

        console.log(`\nFound ${items.length} businesses in this batch.`);

        for (const item of items) {
            const cleanData = unwrap(unmarshall(item));

            const businessName = cleanData.name;
            const businessId = cleanData.business_id;
            const channelCode = String(businessId).toLowerCase();

            console.log(`\n📦 Processing: ${businessName} [${channelCode}]`);

            // --- CHECK IF CHANNEL EXISTS ---
            let channelExists = false;
            let channel: Channel | undefined = undefined;
            try {
                channel = await channelService.getChannelFromToken(businessId);
                channelExists = true;
            } catch (e) {
                // Channel does not exist
            }

            if (channelExists) {
                console.log(`   ℹ️  Channel '${channelCode}' already exists → Skipping this business completely.`);
                skippedCount++;
                continue;
            }

            // --- CREATE FULL SETUP ---
            try {
                // Seller
                let sellerResult = await sellerService.create(ctx, {
                    name: businessName,
                    customFields: {}
                });

                let sellerId: any;
                if (sellerResult instanceof Seller) {
                    sellerId = sellerResult.id;
                } else {
                    // Duplicate - find existing
                    const sellers = await connection.getRepository(ctx, Seller).find({
                        where: { name: businessName }
                    });
                    if (sellers.length === 0) throw new Error("Seller duplicate but not found");
                    sellerId = sellers[0].id;
                }

                // Zone & Country
                const COUNTRY_CODE = 'US';
                const COUNTRY_NAME = 'United States';
                const ZONE_NAME = 'United States Zone';

                const allCountries = await countryService.findAll(ctx);
                let targetCountry = allCountries.items.find((c: Country) => c.code === COUNTRY_CODE);
                if (!targetCountry) {
                    targetCountry = await countryService.create(ctx, {
                        code: COUNTRY_CODE,
                        enabled: true,
                        translations: [{ languageCode: LanguageCode.en, name: COUNTRY_NAME }]
                    });
                }

                const allZones = await zoneService.findAll(ctx);
                let targetZone = allZones.items.find((z: Zone) => z.name === ZONE_NAME);
                if (!targetZone) {
                    targetZone = await zoneService.create(ctx, { name: ZONE_NAME });
                }

                const zoneWithMembers = await connection.getRepository(ctx, Zone).findOne({
                    where: { id: targetZone.id },
                    relations: ['members']
                });
                if (!zoneWithMembers?.members.some((m: Country) => m.id === targetCountry.id)) {
                    await zoneService.addMembersToZone(ctx, { zoneId: targetZone.id, memberIds: [targetCountry.id] });
                }

                // Channel
                const channelResult = await channelService.create(ctx, {
                    code: channelCode,
                    token: businessId,
                    defaultLanguageCode: LanguageCode.en,
                    currencyCode: CurrencyCode.USD,
                    pricesIncludeTax: false,
                    sellerId,
                    defaultShippingZoneId: targetZone.id,
                    defaultTaxZoneId: targetZone.id,
                });

                if (! ('id' in channelResult)) {
                    const error = channelResult as any;
                    throw new Error(`Channel creation failed: ${error.message || error.errorCode || 'Unknown'}`);
                }

                channel = channelResult as Channel;

                // Custom fields
                await channelService.update(ctx, {
                    id: channel.id,
                    customFields: {
                        businessId: cleanData.business_id,
                        website: cleanData.website
                    }
                });

                // Role - create without channelIds first to avoid forbidden, then assign via direct insert
                const roleCode = `${channelCode}-admin`;
                let role = (await roleService.findAll(ctx)).items.find((r: Role) => r.code === roleCode);

                if (!role) {
                    console.log(`   -> Creating Role '${roleCode}' (bypassing service for channel assignment)...`);

                    // Create role without channelIds
                    role = await roleService.create(ctx, {
                        code: roleCode,
                        description: `Admin for ${businessName}`,
                        permissions: [
                            Permission.ReadCatalog, Permission.UpdateCatalog, Permission.CreateCatalog,
                            Permission.ReadOrder, Permission.ReadSettings,
                            Permission.ReadCustomer, Permission.UpdateCustomer
                        ],
                    });

                    // Assign channel directly
                    await connection.rawConnection
                        .createQueryBuilder()
                        .insert()
                        .into('role_channels_channel')
                        .values({ roleId: role.id, channelId: channel.id })
                        .onConflict(`("roleId", "channelId") DO NOTHING`)
                        .execute();
                }

                // Users
                const userEmails: string[] = Array.isArray(cleanData.users)
                    ? cleanData.users
                    : (cleanData.users instanceof Set ? Array.from(cleanData.users) : []);

                for (const email of userEmails) {
                    console.log(`   👤 Processing user: ${email}`);

                    let user = await userService.getUserByEmailAddress(ctx, email);

                    if (!user) {
                        await adminService.create(ctx, {
                            emailAddress: email,
                            firstName: "Admin",
                            lastName: businessName,
                            password: "Password123!",
                            roleIds: [role.id]
                        });
                    } else {
                        const administrator = await connection.getRepository(ctx, 'Administrator').findOne({
                            where: { user: { id: user.id } }
                        });

                        if (administrator) {
                            await adminService.assignRole(ctx, administrator.id, role.id); // idempotent
                        } else {
                            await adminService.create(ctx, {
                                emailAddress: email,
                                firstName: "Admin",
                                lastName: "User",
                                password: "Password123!",
                                roleIds: [role.id]
                            });
                        }
                    }

                    // Customer profile
                    user = await userService.getUserByEmailAddress(ctx, email);
                    if (user) {
                        const customer = await customerService.findOneByUserId(ctx, user.id);
                        if (!customer) {
                            await customerService.create(ctx, {
                                emailAddress: email,
                                firstName: "Admin",
                                lastName: "User",
                                phoneNumber: "000-000-0000"
                            }, "Password123!");
                        }
                    }
                }

                console.log(`   ✅ Success: ${businessName}`);
                processedCount++;

            } catch (err: any) {
                console.error(`   ❌ Failed to create ${businessName}: ${err.message || err}`);
            }
        }

        lastEvaluatedKey = response.LastEvaluatedKey;

    } while (lastEvaluatedKey);

    console.log(`\n🏁 Migration complete.`);
    console.log(`   Created: ${processedCount} businesses`);
    console.log(`   Skipped: ${skippedCount} (channel already exists)`);
    process.exit(0);
}

runMigration();