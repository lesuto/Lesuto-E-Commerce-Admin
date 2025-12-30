import { gql } from 'graphql-tag';

export const marketplaceSchema = gql`
    extend type Channel {
        isSubscription: Boolean
    }
    
    extend type Mutation {
        subscribeToSupplier(supplierChannelId: ID!): Boolean!
        addMarketplaceProduct(productId: ID!): Boolean!
    }
   
    extend type Query {
        marketplaceSuppliers: [Channel!]!
        supplierProducts(supplierChannelId: ID!): [Product!]!
    }
`;