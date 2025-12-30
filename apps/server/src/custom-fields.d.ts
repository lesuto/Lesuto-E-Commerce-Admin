import '@vendure/core';

declare module '@vendure/core' {
  interface CustomProductFields {
    ownerCompany: string;
  }

  interface CustomProductVariantFields {
    ownerCompany: string;
  }
}