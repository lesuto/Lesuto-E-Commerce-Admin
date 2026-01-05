import { gql } from 'graphql-tag';

export const adminApiExtensions = gql`
    type GlobalSyncResult {
        success: Boolean!
        message: String!
        processedVariants: Int
    }

    extend type Mutation {
        "Syncs variants from a specific channel to all others. If no ID provided, runs a universal sync."
        syncGlobalVariants(sourceChannelId: ID): GlobalSyncResult!
    }
`;