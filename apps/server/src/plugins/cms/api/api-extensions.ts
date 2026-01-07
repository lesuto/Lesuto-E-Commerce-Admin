import gql from 'graphql-tag';

export const commonApiExtensions = gql`
  # We removed "type PageBlock" because we don't need it anymore.
  
  type Page implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    slug: String!
    title: String!
    blocks: JSON  # <--- CHANGED: Now it is just a JSON object
  }

  extend type Query {
    page(slug: String!): Page
  }
`;

export const adminApiExtensions = gql`
  ${commonApiExtensions}

  extend type Mutation {
    savePage(slug: String!, title: String!, blocks: JSON!): Page
  }
`;

export const shopApiExtensions = gql`
  ${commonApiExtensions}
`;