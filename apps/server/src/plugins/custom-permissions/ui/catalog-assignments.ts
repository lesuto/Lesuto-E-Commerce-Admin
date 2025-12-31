console.log('✅ CUSTOM UI EXTENSION LOADED SUCCESSFULLY');
import { registerBulkAction } from '@vendure/admin-ui/react';
import gql from 'graphql-tag';

const ASSIGN_TO_CHANNEL = gql`
  mutation AssignToChannel($productId: ID!) {
    assignProductToMyChannel(productId: $productId)
  }
`;

const REMOVE_FROM_CHANNEL = gql`
  mutation RemoveFromChannel($productId: ID!) {
    removeProductFromMyChannel(productId: $productId)
  }
`;

export default [
  // Action: Add to My Catalog
  registerBulkAction({
    location: 'product-list',
    label: 'Add to My Catalog',
    icon: 'plus-circle',
    requiresPermission: 'ManageProductAssignments',
    // FIXED: Added explicit types for selection and host
    onClick: async ({ selection, host }: { selection: any[]; host: any }) => {
      const { dataService, notificationService } = host;
      
      let successCount = 0;
      
      for (const item of selection) {
        try {
          await dataService
            .mutate(ASSIGN_TO_CHANNEL, { productId: item.id })
          successCount++;
        } catch (e) {
          console.error(`Failed to assign product ${item.id}`, e);
        }
      }
      
      if (successCount > 0) {
        notificationService.success(`Added ${successCount} products to your catalog`);
      }
    },
  }),

  // Action: Remove from My Catalog
  registerBulkAction({
    location: 'product-list',
    label: 'Remove from My Catalog',
    icon: 'minus-circle',
    requiresPermission: 'ManageProductAssignments',
    // FIXED: Added explicit types for selection and host
    onClick: async ({ selection, host }: { selection: any[]; host: any }) => {
      const { dataService, notificationService } = host;
      
      let successCount = 0;
      
      for (const item of selection) {
        try {
          await dataService
            .mutate(REMOVE_FROM_CHANNEL, { productId: item.id })
          successCount++;
        } catch (e) {
          console.error(`Failed to remove product ${item.id}`, e);
        }
      }

      if (successCount > 0) {
        notificationService.success(`Removed ${successCount} products from your catalog`);
      }
    },
  }),
];