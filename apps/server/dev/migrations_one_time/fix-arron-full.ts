import { 
    bootstrap, 
    TransactionalConnection,
    User,
    Role,
    Channel,
    Permission,
    Administrator
} from '@vendure/core';
import { config } from '../../src/vendure-config';

async function fixArronDirectDB() {
    // 1. Boot up
    const app = await bootstrap(config);
    const connection = app.get(TransactionalConnection);

    console.log("🚑 Starting Direct DB Repair...");

    // 2. REPOS
    const channelRepo = connection.getRepository(Channel);
    const roleRepo = connection.getRepository(Role);
    const userRepo = connection.getRepository(User);
    const adminRepo = connection.getRepository(Administrator);

    const targetChannelCode = "ghd";
    const targetEmail = "arronhyman@lesuto.com";
    const roleCode = "ghd-admin";

    // 3. FIX ROLE PERMISSIONS (We know this works from your log)
    const channel = await channelRepo.findOne({ 
        where: { code: targetChannelCode },
        relations: ['roles']
    });
    if (!channel) throw new Error(`Channel ${targetChannelCode} not found`);

    const role = await roleRepo.findOne({ 
        where: { code: roleCode },
        relations: ['channels']
    });
    if (!role) throw new Error(`Role ${roleCode} not found`);

    console.log(`💪 Updating Role Permissions...`);
    role.permissions = [
        Permission.Authenticated,
        Permission.CreateCatalog, Permission.ReadCatalog, Permission.UpdateCatalog, Permission.DeleteCatalog,
        Permission.CreateAsset, Permission.ReadAsset, Permission.UpdateAsset, Permission.DeleteAsset,
        Permission.ReadOrder, Permission.UpdateOrder, Permission.DeleteOrder,
        Permission.CreateCustomer, Permission.ReadCustomer, Permission.UpdateCustomer, Permission.DeleteCustomer,
        Permission.ReadSettings, Permission.UpdateSettings,
        Permission.ReadShippingMethod, Permission.UpdateShippingMethod,
        Permission.ReadPaymentMethod, Permission.UpdatePaymentMethod,
        Permission.ReadTaxCategory, Permission.ReadZone, Permission.ReadCountry,
    ];
    
    // Link Role to Channel
    const existingChannelIds = role.channels.map(c => c.id);
    if (!existingChannelIds.includes(channel.id)) {
        role.channels.push(channel);
    }
    await roleRepo.save(role);

    // 4. FIND USER & FIX ADMINISTRATOR
    const user = await userRepo.findOne({ where: { identifier: targetEmail } });
    if (!user) throw new Error(`User ${targetEmail} not found`);

    console.log("🔍 Checking for Administrator profile...");
    let administrator = await adminRepo.findOne({
        where: { user: { id: user.id } }
    });

    // --- THE FIX: Create it if missing ---
    if (!administrator) {
        console.log("   ⚠️ Profile missing. Creating new Administrator entity...");
        administrator = new Administrator();
        administrator.emailAddress = targetEmail;
        administrator.firstName = "Arron";
        administrator.lastName = "Hyman";
        administrator.user = user;
        await adminRepo.save(administrator);
        console.log("   ✅ Administrator profile created.");
    } else {
        console.log("   ✅ Administrator profile found.");
    }

    // 5. LINK USER TO ROLE
    console.log("🔗 Ensuring User has the correct Role...");
    const userWithRoles = await userRepo.findOne({
        where: { id: user.id },
        relations: ['roles']
    });
    
    if (userWithRoles) {
        const hasRole = userWithRoles.roles.some(r => r.id === role.id);
        if (!hasRole) {
            userWithRoles.roles.push(role);
            await userRepo.save(userWithRoles);
            console.log("   -> Role assigned successfully.");
        } else {
            console.log("   -> User already has this Role.");
        }
    }

    console.log("✅ COMPLETE! Please log in as Arron.");
    process.exit(0);
}

fixArronDirectDB();