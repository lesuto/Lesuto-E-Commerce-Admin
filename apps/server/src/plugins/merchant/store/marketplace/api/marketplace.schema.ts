import { gql } from 'graphql-tag';

export const marketplaceSchema = gql`
    type MarketplaceVendorProfile {
        id: ID!
        nameCompany: String
        shortDescription: String
        aboutCompany: String
        commission: Float
        logo: Asset
    }

    extend type Channel {
        isSubscription: Boolean
        supplierProfile: MarketplaceVendorProfile
    }
    
    extend type Mutation {
        subscribeToSupplier(supplierChannelId: ID!): Boolean!
        addMarketplaceProduct(productId: ID!): Boolean!
        removeMarketplaceProduct(productId: ID!): Boolean! # Added this
    }
    
    extend type Query {
        marketplaceSuppliers: [Channel!]!
        supplierProducts(supplierChannelId: ID!): [Product!]!
        supplier(supplierChannelId: ID!): Channel # Added single fetch
    }
`;