import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import gql from 'graphql-tag'; 
import { 
    RefreshCw, 
    Globe, 
    Store
} from 'lucide-react';

// ------------------------------------------------------------------
// 1. GraphQL Definitions
// ------------------------------------------------------------------

const GET_SUPPLIER_CHANNELS = gql`
  query GetSupplierChannels {
    channels {
      items {
        id
        code
        token
        customFields {
          isSupplier
        }
      }
    }
  }
`;

const SYNC_GLOBAL_VARIANTS = gql`
  mutation SyncGlobalVariants($sourceChannelId: ID) {
    syncGlobalVariants(sourceChannelId: $sourceChannelId) {
      success
      message
      processedVariants
    }
  }
`;

// ------------------------------------------------------------------
// 2. Types
// ------------------------------------------------------------------

interface Channel {
  id: string;
  code: string;
  customFields?: {
    isSupplier?: boolean;
  };
}

// FIX: Define the shape of the Query Response
interface ChannelsQueryResponse {
  channels: {
    items: Channel[];
  };
}

interface SyncResponse {
  syncGlobalVariants: {
    success: boolean;
    message: string;
    processedVariants: number;
  };
}

// ------------------------------------------------------------------
// 3. Component
// ------------------------------------------------------------------

export const GlobalVariantSync = () => {
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');

    // --- 1. Query Data ---
    // FIX: Pass <ChannelsQueryResponse> to useQuery so TypeScript knows 'data' has 'channels'
    const { data, isLoading, error } = useQuery<ChannelsQueryResponse>({
        queryKey: ['supplier-channels'],
        queryFn: () => api.query(GET_SUPPLIER_CHANNELS),
    });

    // --- 2. Mutation ---
    const syncMutation = useMutation({
        mutationFn: (variables: { sourceChannelId?: string }) => 
            api.query(SYNC_GLOBAL_VARIANTS, variables),
        onSuccess: (result: any) => {
            const res = result.syncGlobalVariants;
            if (res?.success) {
                alert(`✅ Success: ${res.message} (${res.processedVariants} variants processed)`);
            } else {
                alert('⚠️ Sync finished but reported an issue.');
            }
        },
        onError: (err) => {
            console.error('Sync Error:', err);
            alert('❌ Sync failed. Please check the console logs.');
        }
    });

    // --- Derived State ---
    const supplierChannels = useMemo(() => {
        // Now TypeScript knows 'data' has 'channels'
        if (!data?.channels?.items) return [];
        return data.channels.items.filter((c) => c.customFields?.isSupplier === true);
    }, [data]);

    // --- Handlers ---
    const handleSync = (sourceId?: string) => {
        const isFullSync = !sourceId;
        if (isFullSync && !confirm('Are you sure you want to run a Universal Sync? This checks all channels and may take time.')) {
            return;
        }

        syncMutation.mutate({ sourceChannelId: sourceId });
    };

    const isSyncing = syncMutation.isPending;

    // --- Loading / Error States ---
    if (isLoading) return <div className="p-8">Loading channels...</div>;
    if (error) return <div className="p-8 text-red-600">Error loading channels.</div>;

    return (
        <Page pageId="global-variant-sync">
            <PageTitle>Global Variant Configuration</PageTitle>
            <PageLayout>
                <PageBlock blockId="global-variant-controls" column="main">
                    
                    {/* Header / Info Card */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-md bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800/50 mb-6">
                        <div className="flex items-start gap-3">
                            <Globe className="w-5 h-5 mt-0.5" />
                            <div>
                                <h3 className="font-medium">Global Inventory Sync</h3>
                                <p className="text-sm opacity-80">
                                    Manage how product variants are synchronized across your supplier network.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        
                        {/* Option 1: Specific Supplier Sync */}
                        <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-sm">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                <Store className="w-5 h-5 text-gray-500" />
                                Sync by Supplier
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-2xl">
                                Select a specific supplier to push their newly created variants to all other sales channels immediately.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 items-end">
                                <div className="w-full sm:w-72">
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                        Select Supplier
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                                        value={selectedChannelId}
                                        onChange={(e) => setSelectedChannelId(e.target.value)}
                                    >
                                        <option value="">-- Choose a Supplier --</option>
                                        {supplierChannels.map((channel) => (
                                            <option key={channel.id} value={channel.id}>
                                                {channel.code}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => handleSync(selectedChannelId)}
                                    disabled={!selectedChannelId || isSyncing}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md shadow-sm text-white font-medium transition-colors
                                        ${!selectedChannelId || isSyncing 
                                            ? 'bg-gray-300 cursor-not-allowed dark:bg-zinc-700 dark:text-zinc-500' 
                                            : 'bg-indigo-600 hover:bg-indigo-700'
                                        }`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isSyncing && selectedChannelId ? 'animate-spin' : ''}`} />
                                    {isSyncing && selectedChannelId ? 'Syncing...' : 'Sync Supplier'}
                                </button>
                            </div>
                        </div>

                        {/* Option 2: Universal Sync */}
                        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-medium text-amber-800 dark:text-amber-500 mb-1">Universal Sync</h3>
                                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                                    Run a full check across <strong>all channels</strong>. Ensures every variant exists everywhere.
                                </p>
                            </div>
                            
                            <button
                                onClick={() => handleSync(undefined)}
                                disabled={isSyncing}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-500 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium whitespace-nowrap"
                            >
                                <RefreshCw className={`w-4 h-4 ${isSyncing && !selectedChannelId ? 'animate-spin' : ''}`} />
                                {isSyncing && !selectedChannelId ? 'Processing...' : 'Run Universal Sync'}
                            </button>
                        </div>

                    </div>
                </PageBlock>
            </PageLayout>
        </Page>
    );
};