import gql from 'graphql-tag';

export const tenantApiExtensions = gql`
  extend type Query {
    "Find the token for a specific subdomain (Channel Code)"
    getChannelToken(channelCode: String!): String
  }
`;