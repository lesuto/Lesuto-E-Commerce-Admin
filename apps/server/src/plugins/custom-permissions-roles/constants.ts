import { PermissionDefinition } from '@vendure/core';
import gql from 'graphql-tag';

// Channel type permissions
export const channelTypeSupplierPermission = new PermissionDefinition({
  name: '_ChannelTypeSupplier', // Internal unique key
  description: 'Set Channel Type For Suppliers',
});

export const channelTypeMerchantPermission = new PermissionDefinition({
  name: '_ChannelTypeMerchant',
  description: 'Set Channel Type For Merchants',
});

// GraphQL schema
export const productChannelSchema = gql`
  extend type Mutation {
    assignProductToMyChannel(productId: ID!): Boolean!
    removeProductFromMyChannel(productId: ID!): Boolean!
  }
`;