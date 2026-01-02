import gql from 'graphql-tag';

export const supplierProfileApiExtensions = gql`
  type SupplierProfile {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    nameCompany: String
    shortDescription: String
    aboutCompany: String
    applyForMarketplace: Boolean!
    commission: Float
    logo: Asset
  }

  input UpdateSupplierProfileInput {
    nameCompany: String
    shortDescription: String
    aboutCompany: String
    applyForMarketplace: Boolean
    commission: Float
    logoId: ID
  }

  extend type Query {
    "Fetches the profile for the current active channel"
    activeChannelProfile: SupplierProfile
  }

  extend type Mutation {
    "Updates the profile for the current active channel"
    updateActiveChannelProfile(input: UpdateSupplierProfileInput!): SupplierProfile!
  }
`;