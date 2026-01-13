import { gql } from 'graphql-tag';

export const merchantInventoryApi = gql`
    # --- Types for Inventory Aggregations ---
    
    type InventoryVendorCount {
        name: String! 
        count: Int!
    }

    type InventoryCollectionCount {
        collection: Collection!
        count: Int!
    }

    type InventoryFacetCount {
        facetValue: FacetValue!
        count: Int!
    }

    type InventoryList {
        items: [Product!]!
        totalItems: Int!
        collections: [InventoryCollectionCount!]!
        facets: [InventoryFacetCount!]!
        suppliers: [InventoryVendorCount!]! 
    }

    # --- Schema Extensions ---

    extend type Query {
        """
        Retrieves the authenticated Merchant's own inventory with 
        full aggregations for Facets, Collections, and Suppliers.
        """
        myInventory(
            options: ProductListOptions,
            collectionId: ID,
            facetValueIds: [ID!],
            supplierCodes: [String!], 
            term: String,
            stock: String
        ): InventoryList!
    }

    extend type Mutation {
        """
        Removes a product from the current Channel (Merchant Store).
        """
        removeProductFromInventory(productId: ID!): Boolean!
    }
`;