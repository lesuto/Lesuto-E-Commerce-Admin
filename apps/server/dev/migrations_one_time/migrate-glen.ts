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
const BATCH_LIMIT = 1; 
const DYNAMO_TABLE_NAME = "business"; 
const AWS_REGION = "us-west-2"; 

// --- HELPERS ---
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

function isError(input: any): input is { message: string; errorCode: string } {
    return input && (input.errorCode !== undefined || input.message !== undefined) && !(input instanceof Channel) && !(input instanceof Seller);
}

// --- CORE MIGRATION LOGIC ---
async function processBusiness(
    ctx: RequestContext, 
    businessData: any, 
    services: any
) {
    const { 
        channelService, roleService, adminService, sellerService, 
        userService, customerService, zoneService, countryService, connection 
    } = services;

    const businessName = businessData.name;
    const businessId = businessData.business_id;
    const channelCode = String(businessId).toLowerCase().replace(/\s+/g, '-');

    console.log(`\n📦 Processing Business: ${businessName} [${channelCode}]`);

    let channel: Channel;

    // --- Check if channel already exists ---
    try {
        const existing = await channelService.getChannelFromToken(businessId);
        if (existing && !isError(existing)) {
            console.log(`   ℹ️  Channel '${channelCode}' already exists.`);
            channel = existing;
        } else {
            throw new Error("Not found");
        }
    } catch {
        // --- Create everything if channel doesn't exist ---
        console.log("   -> Channel not found. Creating full setup...");

        // Seller
        let seller = await sellerService.create(ctx, { name: businessName, customFields: {} });
        if (isError(seller) && seller.errorCode !== 'DUPLICATE_ENTITY_ERROR') {
            throw new Error(`Seller error: ${seller.message}`);
        }

        const sellerId = seller instanceof Seller ? seller.id : (await sellerService.findOneByName(ctx, businessName))?.id;

        // Country & Zone
        const COUNTRY_CODE = 'US';
        const ZONE_NAME = 'United States Zone';

        const countries = await countryService.findAll(ctx);
        let country = countries.items.find((c: Country) => c.code === COUNTRY_CODE);
        if (!country) {
            country = await countryService.create(ctx, {
                code: COUNTRY_CODE,
                enabled: true,
                translations: [{ languageCode: LanguageCode.en, name: 'United States' }]
            });
        }

        const zones = await zoneService.findAll(ctx);
        let zone = zones.items.find((z: Zone) => z.name === ZONE_NAME);
        if (!zone) {
            zone = await zoneService.create(ctx, { name: ZONE_NAME });
        }

        const zoneWithMembers = await connection.getRepository(ctx, Zone).findOne({
            where: { id: zone.id },
            relations: ['members']
        });
        if (!zoneWithMembers?.members.some(m => m.id === country.id)) {
            await zoneService.addMembersToZone(ctx, { zoneId: zone.id, memberIds: [country.id] });
        }

        // Channel
        const channelResult = await channelService.create(ctx, {
            code: channelCode,
            token: businessId,
            defaultLanguageCode: LanguageCode.en,
            currencyCode: CurrencyCode.USD,
            pricesIncludeTax: false,
            sellerId,
            defaultShippingZoneId: zone.id,
            defaultTaxZoneId: zone.id,
        });

        if (isError(channelResult)) throw new Error(`Channel error: ${channelResult.message}`);
        channel = channelResult;
    }

    // Update custom fields
    await channelService.update(ctx, {
        id: channel.id,
        customFields: { businessId, website: businessData.website || null }
    });

    // Create/get admin role for this channel
    const roleCode = `${channelCode}-admin`;
    let role = (await roleService.findAll(ctx)).items.find((r: Role) => r.code === roleCode);

    if (!role) {
        console.log(`   -> Creating Role '${roleCode}'...`);
        role = await roleService.create(ctx, {
            code: roleCode,
            description: `Admin for ${businessName}`,
            permissions: [
                Permission.ReadCatalog, Permission.UpdateCatalog, Permission.CreateCatalog,
                Permission.ReadOrder, Permission.ReadSettings,
                Permission.ReadCustomer, Permission.UpdateCustomer
            ],
            channelIds: [channel.id]
        });
    }

    // Process users
    const users: string[] = Array.isArray(businessData.users) 
        ? businessData.users 
        : (businessData.users instanceof Set ? Array.from(businessData.users) : []);

    for (const email of users) {
        if (!email) continue;

        console.log(`      -> Processing User: ${email}`);
        let user = await userService.getUserByEmailAddress(ctx, email, { relations: ['roles'] });

        if (!user) {
            console.log("         (Creating new Administrator)");
            await adminService.create(ctx, {
                emailAddress: email,
                firstName: "Admin",
                lastName: businessName,
                password: "Password123!",
                roleIds: [role.id]
            });
        } else {
            const admin = await connection.getRepository(ctx, 'Administrator').findOne({
                where: { user: { id: user.id } }
            });

            if (admin) {
                const hasRole = user.roles.some(r => r.id === role.id);
                if (!hasRole) {
                    await adminService.assignRole(ctx, admin.id, role.id);
                }
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

        // Optional: create customer profile
        if (user || (user = await userService.getUserByEmailAddress(ctx, email))) {
            const customer = await customerService.findOneByUserId(ctx, user.id);
            if (!customer) {
                await customerService.create(ctx, {
                    emailAddress: email,
                    firstName: "Admin",
                    lastName: "User"
                }, "Password123!");
            }
        }
    }

    console.log(`   ✅ Success: ${businessName}`);
}

// --- MAIN ---
async function runMigration() {
    console.log("🚀 Bootstrapping Vendure...");
    const app = await bootstrap(config);

    const services = {
        channelService: app.get(ChannelService),
        roleService: app.get(RoleService),
        adminService: app.get(AdministratorService),
        sellerService: app.get(SellerService),
        userService: app.get(UserService),
        customerService: app.get(CustomerService),
        zoneService: app.get(ZoneService),
        countryService: app.get(CountryService),
        ctxService: app.get(RequestContextService),
        connection: app.get(TransactionalConnection),
    };

    // EXACT SAME CONTEXT AS YOUR WORKING SINGLE SCRIPT
    const superAdminUser = await services.connection.getRepository(User).findOne({
        where: { identifier: 'superadmin' }
    });
    if (!superAdminUser) throw new Error("Superadmin not found");

    const ctx = await services.ctxService.create({
        apiType: 'admin',
        user: superAdminUser
    });

    const ddbClient = new DynamoDBClient({ region: AWS_REGION });

    try {
        console.log(`🔎 Scanning DynamoDB (Limit: ${BATCH_LIMIT})...`);
        const response = await ddbClient.send(new ScanCommand({
            TableName: DYNAMO_TABLE_NAME,
            Limit: BATCH_LIMIT
        }));

        if (!response.Items?.length) {
            console.log("No records found.");
            process.exit(0);
        }

        for (const item of response.Items) {
            const businessData = unmarshall(item);
            await services.connection.withTransaction(ctx, async (txCtx) => {
                await processBusiness(txCtx, businessData, services);
            });
        }
    } catch (e: any) {
        console.error("Critical error:", e);
    }

    console.log("🏁 Migration complete.");
    process.exit(0);
}

runMigration();