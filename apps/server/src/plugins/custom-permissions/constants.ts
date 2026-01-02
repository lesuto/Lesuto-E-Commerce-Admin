import { PermissionDefinition } from '@vendure/core';
import gql from 'graphql-tag';

// Existing single permission
export const manageProductAssignmentsPermission = new PermissionDefinition({
  name: 'ManageProductAssignments',
  description: 'Allows assigning/removing products to the active channel',
});

// Channel type permissions
export const channelTypeSupplierPermission = new PermissionDefinition({
  name: '_ChannelTypeSupplier', // Internal unique key
  description: 'Set Channel Type For Suppliers',
});

export const channelTypeStorefrontPermission = new PermissionDefinition({
  name: '_ChannelTypeStorefront',
  description: 'Set Channel Type For Storefronts',
});

// GraphQL schema
export const productChannelSchema = gql`
  extend type Mutation {
    assignProductToMyChannel(productId: ID!): Boolean!
    removeProductFromMyChannel(productId: ID!): Boolean!
  }
`;