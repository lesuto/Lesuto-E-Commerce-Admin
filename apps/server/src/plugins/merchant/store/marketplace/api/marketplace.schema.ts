import { gql } from 'graphql-tag';

export const marketplaceSchema = gql`
    # 1. Define a UNIQUE type name for this plugin
    # This acts as a "Read Model" for your profile data
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
        # 2. Return this new unique type
        supplierProfile: MarketplaceVendorProfile
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