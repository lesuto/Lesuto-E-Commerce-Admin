import { VendurePlugin, PluginCommonModule } from '@vendure/core';
import { ProductChannelResolver } from './resolver';
import { manageProductAssignmentsPermission, productChannelSchema } from './constants';
import path from 'path';
import fs from 'fs';

function getUiExtensionPath() {
    // FIX: Removed the duplicate 'apps/server' segment
    // process.cwd() is already inside /apps/server
    const srcPath = path.join(process.cwd(), 'src/plugins/custom-permissions/ui');
    
    const distPath = path.join(__dirname, 'ui');

    if (fs.existsSync(srcPath)) {
        console.log('\x1b[32m%s\x1b[0m', `✅ [ProductChannelPlugin] Found UI Source at: ${srcPath}`);
        return srcPath;
    } else if (fs.existsSync(distPath)) {
        console.log('\x1b[32m%s\x1b[0m', `✅ [ProductChannelPlugin] Found UI Dist at: ${distPath}`);
        return distPath;
    } else {
        console.error('\x1b[31m%s\x1b[0m', `❌ [ProductChannelPlugin] CRITICAL: Could not find UI folder!`);
        console.error(`   Checked: ${srcPath}`);
        return '';
    }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [ProductChannelResolver],
  adminApiExtensions: {
    schema: productChannelSchema,
    resolvers: [ProductChannelResolver],
  },
  configuration: config => {
    config.authOptions.customPermissions.push(manageProductAssignmentsPermission);
    return config;
  },
})
export class ProductChannelPlugin {
  static ui = {
    extensionPath: getUiExtensionPath(),
    providers: ['catalog-assignments.ts'],
  };
}