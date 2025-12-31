import { PermissionDefinition } from '@vendure/core';
import gql from 'graphql-tag';

// 1. Define the Permission Object
export const manageProductAssignmentsPermission = new PermissionDefinition({
    name: 'ManageProductAssignments',
    description: 'Allows assigning/removing products to the active channel without full update rights',
});

// 2. Define the GraphQL Schema Extension
export const productChannelSchema = gql`
    extend type Mutation {
        "Assigns a product to the current user's active channel"
        assignProductToMyChannel(productId: ID!): Boolean!
        
        "Removes a product from the current user's active channel"
        removeProductFromMyChannel(productId: ID!): Boolean!
    }
`;