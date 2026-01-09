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

    type CollectionCount {
        collection: Collection!
        count: Int!
    }

    type FacetCount {
        facetValue: FacetValue!
        count: Int!
    }

    type ProductStatusCounts {
        total: Int!
        inStore: Int!
        notInStore: Int!
        active: Int
        disabled: Int
        inStock: Int
        outOfStock: Int
    }

    type SupplierProductList {
        items: [Product!]!
        totalItems: Int!
        collections: [CollectionCount!]!
        facets: [FacetCount!]!
        counts: ProductStatusCounts!
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
        
        supplierProducts(
            supplierChannelId: ID!, 
            options: ProductListOptions,
            collectionId: ID,
            facetValueIds: [ID!],
            term: String,
            stock: String,
            status: String,
            enabled: Boolean
        ): SupplierProductList!
        
        supplier(supplierChannelId: ID!): Channel
    }
`;