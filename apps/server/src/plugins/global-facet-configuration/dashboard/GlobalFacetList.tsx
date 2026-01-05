import React, { useState } from 'react';
import { graphql } from '@/gql';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Page, PageLayout, PageBlock, PageTitle } from '@vendure/dashboard';
import { 
    Trash2, 
    Plus,
    Globe,
    AlertCircle,
    ArrowLeft,
    Layers,
    Tag
} from 'lucide-react';

// --- GraphQL Definitions ---

const GetGlobalFacetsDocument = graphql(`
    query GetGlobalFacets {
        facets(options: { take: 50, sort: { name: ASC } }) {
            items {
                id
                name
                code
                values {
                    id
                    name
                    code
                }
            }
        }
        activeAdministrator {
            id
            user {
                roles {
                    permissions
                }
            }
        }
    }
`);

const CreateFacetDocument = graphql(`
    mutation CreateGlobalFacet($input: CreateFacetInput!) {
        createFacet(input: $input) {
            id
            name
        }
    }
`);

const DeleteFacetDocument = graphql(`
    mutation DeleteGlobalFacet($id: ID!) {
        deleteFacet(id: $id) {
            result
        }
    }
`);

// New Mutations for Sub-Facets (Values)
const CreateFacetValueDocument = graphql(`
    mutation CreateGlobalFacetValue($input: [CreateFacetValueInput!]!) {
        createFacetValues(input: $input) {
            id
            name
        }
    }
`);

const DeleteFacetValueDocument = graphql(`
    mutation DeleteGlobalFacetValues($ids: [ID!]!) {
        deleteFacetValues(ids: $ids) {
            result
            message
        }
    }
`);

export const GlobalFacetList = () => {
    const queryClient = useQueryClient();
    
    // UI State
    const [selectedFacet, setSelectedFacet] = useState<any | null>(null);
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    // --- Queries ---
    const { data, isLoading } = useQuery({
        queryKey: ['global-facets'],
        queryFn: () => api.query(GetGlobalFacetsDocument),
    });

    // --- Mutations ---
    const createFacetMutation = useMutation({
        mutationFn: (variables: { input: any }) => api.query(CreateFacetDocument, variables),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-facets'] });
            setNewName(''); setNewCode('');
        },
        onError: () => alert('Failed to create facet.')
    });

    const deleteFacetMutation = useMutation({
        mutationFn: (id: string) => api.query(DeleteFacetDocument, { id }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['global-facets'] })
    });

    const createValueMutation = useMutation({
        mutationFn: (variables: { input: any[] }) => api.query(CreateFacetValueDocument, variables),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-facets'] });
            // Update local selection to reflect new data
            if(selectedFacet && data?.facets?.items) {
                const updated = data.facets.items.find(f => f.id === selectedFacet.id);
                if(updated) setSelectedFacet(updated);
            }
            setNewName(''); setNewCode('');
        },
        onError: () => alert('Failed to create value.')
    });

    const deleteValueMutation = useMutation({
        // FIX: Pass the ID inside an array: { ids: [id] }
        mutationFn: (id: string) => api.query(DeleteFacetValueDocument, { ids: [id] }),
        onSuccess: () => {
             // Invalidate to refresh the list immediately
            queryClient.invalidateQueries({ queryKey: ['global-facets'] });
        },
        onError: (err) => {
            console.error('Failed to delete value', err);
            alert('Failed to delete value.');
        }
    });
    
    // --- Loading & Auth ---
    if (isLoading) return <div className="p-8">Loading...</div>;

    const roles = data?.activeAdministrator?.user?.roles || [];
    const allPermissions = roles.flatMap(r => r.permissions);
    const isAdmin = allPermissions.includes('SuperAdmin');

    if (!isAdmin) {
        return (
            <Page pageId="global-facets-denied">
                <PageLayout>
                    <PageBlock blockId="denied" column="main">
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                            <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
                            <h2 className="text-lg font-semibold">Access Denied</h2>
                            <p>Only Super Admins can manage Global Facets.</p>
                        </div>
                    </PageBlock>
                </PageLayout>
            </Page>
        );
    }

    // --- Helper Logic ---

    // Keep selected facet sync'd with real data
    const activeFacet = selectedFacet 
        ? data?.facets?.items.find((f: any) => f.id === selectedFacet.id) 
        : null;

    const handleCreateFacet = () => {
        if (!newName || !newCode) return;
        createFacetMutation.mutate({
            input: {
                code: newCode,
                isPrivate: false,
                translations: [{ languageCode: 'en', name: newName }]
            }
        });
    };

    const handleCreateValue = () => {
        if (!newName || !newCode || !activeFacet) return;
        createValueMutation.mutate({
            input: [{
                facetId: activeFacet.id,
                code: newCode,
                translations: [{ languageCode: 'en', name: newName }]
            }]
        });
    };

    // --- RENDER ---

    return (
        <Page pageId="global-facets">
            <PageTitle>Global Facets Configuration</PageTitle>
            <PageLayout>
                <PageBlock blockId="global-facets-list" column="main">
                    
                    {/* View 1: List of Facets */}
                    {!activeFacet && (
                        <div className="flex flex-col gap-6">
                            {/* Info Banner */}
                            <div className="flex items-start gap-3 p-4 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 border border-sky-100 dark:border-sky-800/50">
                                <Globe className="w-5 h-5 mt-0.5" />
                                <div>
                                    <h3 className="font-medium">Global Sync Active</h3>
                                    <p className="text-sm opacity-80">
                                        Facets and values created here are synced to all merchants.
                                    </p>
                                </div>
                            </div>

                            {/* Create Facet Form */}
                            <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500 dark:text-gray-400">Create New Facet Group</h3>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Name</label>
                                        <input 
                                            className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
                                            value={newName} 
                                            onChange={e => setNewName(e.target.value)} 
                                            placeholder="e.g. Material"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Code</label>
                                        <input 
                                            className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
                                            value={newCode} 
                                            onChange={e => setNewCode(e.target.value)} 
                                            placeholder="e.g. material"
                                        />
                                    </div>
                                    <button 
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                                        onClick={handleCreateFacet}
                                        disabled={!newName || !newCode || createFacetMutation.isPending}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create
                                    </button>
                                </div>
                            </div>

                            {/* Facet List */}
                            <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-zinc-800">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Facet Name</th>
                                            <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Code</th>
                                            <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Values</th>
                                            <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                        {data?.facets?.items.map((facet: any) => (
                                            <tr key={facet.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer" onClick={() => {
                                                setNewName(''); setNewCode(''); // clear form
                                                setSelectedFacet(facet);
                                            }}>
                                                <td className="px-4 py-3 font-medium dark:text-gray-200">{facet.name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{facet.code}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                    {facet.values?.length || 0} items
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if(confirm('Delete entire facet group?')) deleteFacetMutation.mutate(facet.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* View 2: Facet Values (Sub-facets) */}
                    {activeFacet && (
                        <div className="flex flex-col gap-6">
                            {/* Header */}
                            <div className="flex items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
                                <button 
                                    onClick={() => {
                                        setNewName(''); setNewCode('');
                                        setSelectedFacet(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
                                >
                                    <ArrowLeft className="w-5 h-5 dark:text-gray-300" />
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-gray-400" />
                                        {activeFacet.name}
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage values for this facet</p>
                                </div>
                            </div>

                             {/* Create Value Form */}
                             <div className="p-4 border rounded-lg shadow-sm bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
                                <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-gray-500 dark:text-gray-400">Add New Value</h3>
                                <div className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Value Name</label>
                                        <input 
                                            className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
                                            value={newName} 
                                            onChange={e => setNewName(e.target.value)} 
                                            placeholder={`e.g. Cotton`}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Code</label>
                                        <input 
                                            className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700 dark:text-white" 
                                            value={newCode} 
                                            onChange={e => setNewCode(e.target.value)} 
                                            placeholder={`e.g. cotton`}
                                        />
                                    </div>
                                    <button 
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
                                        onClick={handleCreateValue}
                                        disabled={!newName || !newCode || createValueMutation.isPending}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Value
                                    </button>
                                </div>
                            </div>

                            {/* Values List */}
                            <div className="border rounded-lg overflow-hidden border-gray-200 dark:border-zinc-800">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Value Name</th>
                                            <th className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Code</th>
                                            <th className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                        {activeFacet.values?.map((val: any) => (
                                            <tr key={val.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                                                <td className="px-4 py-3 font-medium dark:text-gray-200 flex items-center gap-2">
                                                    <Tag className="w-3 h-3 text-gray-400" />
                                                    {val.name}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{val.code}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button 
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                        onClick={() => {
                                                            if(confirm('Delete this value?')) deleteValueMutation.mutate(val.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!activeFacet.values || activeFacet.values.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                    No values yet. Add one above.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </PageBlock>
            </PageLayout>
        </Page>
    );
};