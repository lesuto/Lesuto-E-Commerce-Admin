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
        removeMarketplaceProduct(productId: ID!): Boolean! 
    }
    
    extend type Query {
        marketplaceSuppliers: [Channel!]!
        
        # --- UPDATED THIS LINE ---
        # Changed return type to ProductList! and added options argument
        supplierProducts(supplierChannelId: ID!, options: ProductListOptions): ProductList!
        
        supplier(supplierChannelId: ID!): Channel
    }
`;