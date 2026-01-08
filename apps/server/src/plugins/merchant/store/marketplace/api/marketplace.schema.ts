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

    # --- NEW TYPES ---
    type CollectionCount {
        collection: Collection!
        count: Int!
    }

    type ProductStatusCounts {
        total: Int!
        inStore: Int!
        notInStore: Int!
    }

    type SupplierProductList {
        items: [Product!]!
        totalItems: Int!
        # Replaces 'facets'
        collections: [CollectionCount!]! 
        # New Status Counts
        counts: ProductStatusCounts!
    }
    # -----------------

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
        
        # Updated Query Signature
        supplierProducts(
            supplierChannelId: ID!, 
            options: ProductListOptions,
            collectionId: ID,    # <--- New Argument
            term: String
        ): SupplierProductList!  # <--- New Return Type
        
        supplier(supplierChannelId: ID!): Channel
    }
`;