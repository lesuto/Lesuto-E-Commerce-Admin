import { ChannelProvider, DEFAULT_CONTENT } from './providers/channel-provider';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/sonner';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
// 1. IMPORT THE SHARED HELPER (Uses the retry logic we just fixed)
import { getChannelToken } from "@/lib/channel-helper";

// Helper to get the API URL
const getApiUrl = () => {
  const url = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';
  return url.replace('localhost', '127.0.0.1');
};

async function getCmsContent(channelToken: string): Promise<typeof DEFAULT_CONTENT> {
  const apiUrl = getApiUrl();
  
  // 2. RETRY LOGIC FOR CMS CONTENT
  // We try twice. If it fails, we just return default content silently.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (channelToken) headers['vendure-token'] = channelToken;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query GetCmsPage($slug: String!) { page(slug: $slug) { blocks } }`,
          variables: { slug: 'home' },
        }),
        // 3. PERFORMANCE FIX: Cache this for 1 hour. 
        // Stops the "AbortError" because we aren't spamming the server.
        next: { revalidate: 3600 } 
      });

      if (!response.ok) throw new Error('CMS Fetch failed');
      const { data } = await response.json();
      
      return { ...DEFAULT_CONTENT, ...data?.page?.blocks };
    } catch (error) {
       // Wait 200ms before retry
       await new Promise(r => setTimeout(r, 200));
    }
  }

  // If it fails, just return defaults without crashing
  return DEFAULT_CONTENT;
}

async function DynamicContent({children}: {children: ReactNode}) {
  // 4. USE THE SHARED HELPER
  // This handles the subdomains, IPv4 fix, and retries automatically.
  const channelToken = await getChannelToken();
  const cmsContent = await getCmsContent(channelToken);

  // If channelToken is empty, it falls back to the .env default
  const finalToken = channelToken || process.env.VENDURE_CHANNEL_TOKEN || '';

  return (
    <ChannelProvider initialToken={finalToken} initialCms={cmsContent}>
      <Navbar />
      {children}
      <Footer />
      <Toaster />
    </ChannelProvider>
  );
}

export { DynamicContent };