import { 
    bootstrap, 
    ChannelService, 
    RequestContextService, 
    RoleService, 
    AdministratorService, 
    NativeAuthenticationMethod, 
    TransactionalConnection,
    User,
    Administrator
} from '@vendure/core';
import { config } from '../../src/vendure-config';

// 1. RAW DYNAMODB DATA (Arron)
const rawUserData = {
  "username": { "S": "arronhyman@lesuto.com" },
  "access": {
    "M": {
      "business": {
        "M": {
          "1501": { "M": { "business_admin": { "BOOL": true } } },
          "A2D": { "M": { "plan_admin": { "M": { "access": { "BOOL": true } } } } },
          // ... (other businesses skipped for brevity)
          "GLENHYMANDESIGN": { "M": { "business_admin": { "BOOL": true } } }, // <--- THIS IS THE TARGET
          // ...
        }
      },
      "business_admin": { "BOOL": true },
      "god_mode": { "BOOL": true },
      "hpm_user": { "BOOL": true },
      "portal": { "BOOL": true }
    }
  },
  "email": { "S": "arronhyman@lesuto.com" },
  "first_name": { "S": "Arron" },
  "last_name": { "S": "Hyman" },
  "id": { "S": "1335585524" },
  "pw": { "S": "$2a$10$en2XBhuM4q7a36D7BgP8Mu9/zTlsgF33ZdzYpu.J2EgyGMjbRLCaK" }
};

// 2. HELPER
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

// 3. MIGRATION LOGIC
async function migrateUser() {
    const app = await bootstrap(config);
    
    const adminService = app.get(AdministratorService);
    const roleService = app.get(RoleService);
    const channelService = app.get(ChannelService);
    const ctxService = app.get(RequestContextService);
    const connection = app.get(TransactionalConnection);

    const superAdminUser = await connection.getRepository(User).findOne({ 
        where: { identifier: 'superadmin' } 
    });

    if (!superAdminUser) {
        throw new Error("❌ Fatal: Could not find 'superadmin' user.");
    }

    const ctx = await ctxService.create({ 
        apiType: 'admin',
        user: superAdminUser
    });

    const cleanUser = unwrap(rawUserData);

    // --- CONFIGURATION: TARGET CHANNEL ---
    const TARGET_BUSINESS_KEY = "GLENHYMANDESIGN"; // Only process this one

    console.log(`👤 Starting targeted migration for ${cleanUser.email}...`);

    try {
        // --- STEP A: Get Administrator ---
        let administrator = await connection.getRepository(ctx, Administrator).findOne({
            where: { emailAddress: cleanUser.email },
            relations: ['user']
        });
        
        if (!administrator) {
            console.log("   -> Creating new Administrator entity...");
            administrator = await adminService.create(ctx, {
                emailAddress: cleanUser.email,
                firstName: cleanUser.first_name,
                lastName: cleanUser.last_name,
                password: "TempPassword123!", 
                roleIds: [] 
            });
        }

        // --- STEP B: Inject Legacy Password Hash ---
        const user = await connection.getRepository(ctx, User).findOne({ 
            where: { id: administrator.user.id },
            relations: ['authenticationMethods', 'roles']
        });

        if (user) {
            const authMethod = user.authenticationMethods.find(m => m instanceof NativeAuthenticationMethod) as NativeAuthenticationMethod;
            if (authMethod) {
                // Only update if it's different to avoid redundant logs
                if (authMethod.passwordHash !== cleanUser.pw) {
                    console.log("   -> 💉 Injecting Legacy Password Hash...");
                    authMethod.passwordHash = cleanUser.pw; 
                    await connection.getRepository(ctx, NativeAuthenticationMethod).save(authMethod);
                }
            }
        }

        // --- STEP C: Handle "God Mode" ---
        if (cleanUser.access.god_mode) {
            const superAdminRole = await roleService.getSuperAdminRole(ctx);
            // @ts-ignore
            const userRoleIds = user?.roles.map(r => r.id) || [];
            
            if (!userRoleIds.includes(superAdminRole.id)) {
                await adminService.assignRole(ctx, administrator.id, superAdminRole.id);
                console.log("      ✅ Assigned SuperAdmin Role");
            }
        }

        // --- STEP D: Link ONLY to GLENHYMANDESIGN ---
        console.log(`   -> Processing specific permission for: ${TARGET_BUSINESS_KEY}...`);

        // Check if this specific business exists in the user's raw access list
        if (cleanUser.access.business && cleanUser.access.business[TARGET_BUSINESS_KEY]) {
            
            try {
                // 1. Get Channel
                const channel = await channelService.getChannelFromToken(TARGET_BUSINESS_KEY);
                
                // 2. Define Role
                const targetRoleCode = `${channel.code}-admin`;
                const allRoles = await roleService.findAll(ctx);
                const businessRole = allRoles.items.find(r => r.code === targetRoleCode);

                if (businessRole) {
                    // @ts-ignore
                    // Refresh user roles (important if we just added SuperAdmin above)
                    const updatedUser = await connection.getRepository(ctx, User).findOne({ 
                        where: { id: administrator.user.id },
                        relations: ['roles']
                    });
                    
                    // @ts-ignore
                    const existingRoles = updatedUser?.roles.map(r => r.id) || [];

                    if (!existingRoles.includes(businessRole.id)) {
                        await adminService.assignRole(ctx, administrator.id, businessRole.id);
                        console.log(`      ✅ Linked to ${channel.code} (Role: ${targetRoleCode})`);
                    } else {
                        console.log(`      ℹ️  Already linked to ${channel.code}`);
                    }
                } else {
                    console.log(`      ⚠️  Role ${targetRoleCode} is missing. Run the role creation script first.`);
                }
            } catch (err: any) {
                if (err.code === 'CHANNEL_NOT_FOUND' || err.message?.includes('channel-not-found')) {
                    console.log(`      ❌ Channel ${TARGET_BUSINESS_KEY} does not exist in Vendure.`);
                } else {
                    console.error(err);
                }
            }
        } else {
            console.log(`      ⚠️  User does not have access to ${TARGET_BUSINESS_KEY} in the raw data.`);
        }

        console.log("🎉 Targeted User Migration Complete!");

    } catch (e) {
        console.error("❌ Migration Failed:", e);
    }

    process.exit(0);
}

migrateUser();