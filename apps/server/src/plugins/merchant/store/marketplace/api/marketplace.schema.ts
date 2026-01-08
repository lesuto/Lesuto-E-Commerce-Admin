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

    type FacetCount {
        facetValue: FacetValue!
        count: Int!
    }

    type SupplierProductList {
        items: [Product!]!
        totalItems: Int!
        facets: [FacetCount!]!
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
            facetValueIds: [ID!],
            term: String
        ): SupplierProductList!
        
        supplier(supplierChannelId: ID!): Channel
    }
`;