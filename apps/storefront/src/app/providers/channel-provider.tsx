'use client';

import { createContext, useContext, ReactNode } from 'react';

export interface StoreContent {
  heroTitle: string;
  heroSubtitle: string;
  aboutUs: string;
  contactEmail: string;
  logoUrl: string;
}

export const DEFAULT_CONTENT: StoreContent = {
  heroTitle: 'Welcome To Your New Lesuto Storefront',
  heroSubtitle: 'Let\'s Succeed Together',
  aboutUs: 'We are a local brand...',
  contactEmail: '<contact@example.com>',
  logoUrl: '',
};

interface ChannelContextType {
  channelToken: string;
  cmsContent: StoreContent;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

export function ChannelProvider({ children, initialToken, initialCms }: { 
  children: ReactNode; 
  initialToken: string; 
  initialCms: StoreContent;
}) {
  return (
    <ChannelContext.Provider value={{ channelToken: initialToken, cmsContent: initialCms }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  const context = useContext(ChannelContext);
  if (!context) throw new Error('useChannel must be used within ChannelProvider');
  return context;
}