// apps/server/dev/migrations_one_time/upload-home-plan.ts

import 'dotenv/config';
import {
  bootstrap,
  RequestContext,
  LanguageCode,
  ProductService,
  ProductVariantService,
  AssetImporter,
  ChannelService,
  TaxCategoryService,
} from '@vendure/core';
import { config } from '../../src/vendure-config';

const normalizedPlan = {
  planId: "001-3097",
  alias: "3097",
  title: "Beach & Coastal 2-Bedroom House Plan with Covered Deck and Open Layout",
  subtitle: "Beach & Coastal & Craftsman 2-Bedroom House Plan",
  architect: "Glen Hyman",
  heatedSqFt: 1120,
  beds: 2,
  baths: { full: 1 },
  stories: 1,
  dimensions: {
    width: "28' 0\"",
    depth: "40' 0\"",
    maxRidgeHeight: "18' 11\"",
  },
  ceilingHeights: {
    firstFloor: "8' 1\" to 13' 2\" (variable)",
  },
  styles: ["Beach & Coastal", "Craftsman", "A-Frame", "Northwest"],
  specialFeatures: [
    "Covered Deck",
    "Covered Entry",
    "Large Laundry Room",
    "Open Layout",
    "Island Kitchen",
    "Pantry",
    "Eating Bar",
  ],
  descriptionBullets: [
    "This inviting 1-story home offers 2 bedrooms, 1 full bathroom, and 1120 sq. ft. of heated living space.",
    "Key highlights include a Covered Deck, Covered Entry, and Large Laundry Room for added comfort and convenience.",
    "The open layout features a full kitchen with island, pantry, eating bar, dual sink, and dishwasher, plus washer/dryer hookups.",
    "Variable ceiling heights range from 8'1\" to 13'2\" on the main level, creating a spacious and dynamic feel.",
    "Built with 2x6 exterior framing and an 8/12 roof pitch, perfect for Beach & Coastal, Craftsman, A-Frame, or Northwest styles.",
    "Ideal for flat lots with crawlspace foundation.",
  ],
  foundation: { standard: "Crawlspace" },
  exteriorWalls: { framing: "2x6" },
  roof: { primaryPitch: "8 on 12" },
  images: {
    rendering: "https://resources.homeplanmarketplace.com/plans/live/001/001-3097/images/TS1680539724707/image.jpeg",
    floorPlans: [
      { url: "https://resources.homeplanmarketplace.com/plans/live/001/001-3097/images/TS1680539722927/image.jpeg" },
    ],
    exteriors: [
      { url: "https://resources.homeplanmarketplace.com/plans/live/001/001-3097/images/TS1680539722868/image.jpeg" },
      { url: "https://resources.homeplanmarketplace.com/plans/live/001/001-3097/images/TS1680539722903/image.jpeg" },
      { url: "https://resources.homeplanmarketplace.com/plans/live/001/001-3097/images/TS1680539722876/image.jpeg" },
    ],
  },
  pricing: {
    startingAt: 1195,
    sets: [
      { name: "CAD", price: 1195 },
      { name: "PDF", price: 1195 },
      { name: "Multiple Use License", price: 1895 },
    ],
  },
};

(async () => {
  const app = await bootstrap(config);

  const channelService = app.get(ChannelService);
  const productService = app.get(ProductService);
  const productVariantService = app.get(ProductVariantService);
  const assetImporter = app.get(AssetImporter);
  const taxCategoryService = app.get(TaxCategoryService);

  const CHANNEL_TOKEN = 'GHD';

  const channel = await channelService.getChannelFromToken(CHANNEL_TOKEN);
  if (!channel) {
    console.error(`❌ Channel with token '${CHANNEL_TOKEN}' not found!`);
    await app.close();
    process.exit(1);
  }

  const ctx = new RequestContext({
    apiType: 'admin',
    channel,
    languageCode: LanguageCode.en,
    isAuthorized: true,
    authorizedAsOwnerOnly: false,
  });

  try {
    console.log('📸 Importing assets...');
    const allImageUrls = [
      normalizedPlan.images.rendering,
      ...normalizedPlan.images.floorPlans.map(fp => fp.url),
      ...normalizedPlan.images.exteriors.map(ext => ext.url),
    ];

    const { assets, errors } = await assetImporter.getAssets(allImageUrls, ctx);
    if (errors.length > 0) console.warn('⚠️ Asset errors:', errors);
    if (assets.length === 0) throw new Error('No assets imported');

    const featuredAsset = assets[0];

    const descriptionHtml = `
<h2>${normalizedPlan.subtitle}</h2>
<p>${normalizedPlan.descriptionBullets.join('</p><p>')}</p>

<h3>Key Features</h3>
<ul>
  ${normalizedPlan.specialFeatures.map(f => `<li>${f}</li>`).join('')}
</ul>

<h3>Plan Details</h3>
<ul>
  <li><strong>Heated Sq. Ft.:</strong> ${normalizedPlan.heatedSqFt}</li>
  <li><strong>Bedrooms:</strong> ${normalizedPlan.beds} • <strong>Baths:</strong> ${normalizedPlan.baths.full}</li>
  <li><strong>Stories:</strong> ${normalizedPlan.stories}</li>
  <li><strong>Dimensions:</strong> ${normalizedPlan.dimensions.width} × ${normalizedPlan.dimensions.depth}</li>
  <li><strong>Ceiling Height:</strong> ${normalizedPlan.ceilingHeights.firstFloor}</li>
  <li><strong>Foundation:</strong> ${normalizedPlan.foundation.standard}</li>
  <li><strong>Roof Pitch:</strong> ${normalizedPlan.roof.primaryPitch}</li>
  <li><strong>Exterior Framing:</strong> ${normalizedPlan.exteriorWalls.framing}</li>
</ul>

<h3>What's Included</h3>
<ul>
  <li>General Notes</li>
  <li>Front, Rear, Left, Right Elevations</li>
  <li>Roof Plan - Birds Eye View</li>
  <li>Foundation plan, Wall Section, Stair Section</li>
  <li>Main Level Floor Plan</li>
  <li>Electrical Plan (showing fixtures, switches, outlets)</li>
</ul>

<h3>What's Not Included</h3>
<ul>
  <li>Architectural or Engineering Stamp - handled locally if required</li>
  <li>Site Plan - handled locally when required</li>
  <li>Mechanical Drawings</li>
  <li>Plumbing Drawings</li>
  <li>Energy calculations - handled locally when required</li>
</ul>
    `.trim();

    console.log('🏠 Creating product...');
    const product = await productService.create(ctx, {
      enabled: true,
      translations: [
        {
          languageCode: LanguageCode.en,
          name: normalizedPlan.title,
          slug: `house-plan-${normalizedPlan.planId.toLowerCase()}`,
          description: descriptionHtml,
        },
      ],
      featuredAssetId: featuredAsset.id,
      assetIds: assets.map(a => a.id),
      customFields: {
        planId: normalizedPlan.planId,
        alias: normalizedPlan.alias,
        architect: normalizedPlan.architect,
        heatedSqFt: normalizedPlan.heatedSqFt,
        beds: normalizedPlan.beds,
        bathsFull: normalizedPlan.baths.full,
        stories: normalizedPlan.stories,
        width: normalizedPlan.dimensions.width,
        depth: normalizedPlan.dimensions.depth,
        maxRidgeHeight: normalizedPlan.dimensions.maxRidgeHeight,
        primaryRoofPitch: normalizedPlan.roof.primaryPitch,
        foundationStandard: normalizedPlan.foundation.standard,
        exteriorFraming: normalizedPlan.exteriorWalls.framing,
        styles: normalizedPlan.styles,
        specialFeatures: normalizedPlan.specialFeatures,
        startingPrice: normalizedPlan.pricing.startingAt,
      },
    });

    // Ensure a default TaxCategory exists
    const { items: taxCategories } = await taxCategoryService.findAll(ctx);
    let defaultTaxCategory = taxCategories.find(tc => tc.isDefault);

    if (!defaultTaxCategory) {
      console.log('No default TaxCategory found — creating one...');
      defaultTaxCategory = await taxCategoryService.create(ctx, {
        name: 'Standard',
        isDefault: true,
      });
    }

    console.log('💰 Creating product variants...');
    for (const set of normalizedPlan.pricing.sets) {
      await productVariantService.create(ctx, [
        {
          productId: product.id,
          sku: `${normalizedPlan.planId}-${set.name.replace(/\s+/g, '-').toUpperCase()}`,
          price: set.price * 100,
          taxCategoryId: defaultTaxCategory.id,
          stockOnHand: 9999,
          translations: [
            {
              languageCode: LanguageCode.en,
              name: `${set.name} Set`,
            },
          ],
          customFields: {
            planSetType: set.name,
          },
        },
      ]);
    }

    console.log(`✅ SUCCESS! Plan ${normalizedPlan.planId} uploaded perfectly!`);
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Assets: ${assets.length}`);
    console.log(`   Variants: ${normalizedPlan.pricing.sets.length}`);

  } catch (error: any) {
    console.error('❌ Upload failed:', error.message || error);
    console.error(error.stack);
  } finally {
    await app.close();
    process.exit(0);
  }
})();