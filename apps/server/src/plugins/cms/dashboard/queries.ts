import { gql } from '@apollo/client';

export const GET_CMS_PAGE = gql`
  query GetCmsPage($slug: String!) {
    page(slug: $slug) {
      id
      title
      blocks
    }
  }
`;

export const SAVE_CMS_PAGE = gql`
  mutation SaveCmsPage($slug: String!, $title: String!, $blocks: JSON!) {
    savePage(slug: $slug, title: $title, blocks: $blocks) {
      id
      updatedAt
    }
  }
`;