import { ChannelProvider, DEFAULT_CONTENT } from './providers/channel-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/sonner';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';

async function getChannelToken(subdomain: string): Promise<string> {
  if (!subdomain || subdomain === 'shop' || subdomain === 'localhost') return '__default_channel__';
  const apiUrl = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query GetChannelToken($channelCode: String!) { getChannelToken(channelCode: $channelCode) }`,
        variables: { channelCode: subdomain },
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    return data?.getChannelToken || '__default_channel__';
  } catch (error) {
    console.error('Channel token error:', error);
    return '__default_channel__';
  }
}

async function getCmsContent(channelToken: string): Promise<typeof DEFAULT_CONTENT> {
  const apiUrl = process.env.VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'vendure-token': channelToken,
      },
      body: JSON.stringify({
        query: `query GetCmsPage($slug: String!) { page(slug: $slug) { blocks } }`,
        variables: { slug: 'home' },
      }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = await response.json();
    return { ...DEFAULT_CONTENT, ...data?.page?.blocks };
  } catch (error) {
    console.error('CMS error:', error);
    return DEFAULT_CONTENT;
  }
}

async function DynamicContent({children}: {children: ReactNode}) {
  const headersList = await headers();
  const host = headersList.get('host') || 'shop.lesuto.local';
  const subdomain = host.split('.')[0].toLowerCase();

  const channelToken = await getChannelToken(subdomain);
  const cmsContent = await getCmsContent(channelToken);

  return (
    <ChannelProvider initialToken={channelToken} initialCms={cmsContent}>
      <Navbar />
      {children}
      <Footer />
      <Toaster />
    </ChannelProvider>
  );
}

export { DynamicContent };