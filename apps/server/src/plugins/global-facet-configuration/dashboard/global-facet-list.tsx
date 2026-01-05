import { useState } from 'react';
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
    Tag,
    Edit2,
    X,
    RefreshCw // <--- Imported for Sync Button
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

const UpdateFacetDocument = graphql(`
    mutation UpdateGlobalFacet($input: UpdateFacetInput!) {
        updateFacet(input: $input) {
            id
            name
            code
        }
    }
`);

const DeleteFacetDocument = graphql(`
    mutation DeleteGlobalFacet($id: ID!) {
        deleteFacet(id: $id) {
            result
            message
        }
    }
`);

const CreateFacetValueDocument = graphql(`
    mutation CreateGlobalFacetValue($input: [CreateFacetValueInput!]!) {
        createFacetValues(input: $input) {
            id
            name
        }
    }
`);

const UpdateFacetValueDocument = graphql(`
    mutation UpdateGlobalFacetValue($input: [UpdateFacetValueInput!]!) {
        updateFacetValues(input: $input) {
            id
            name
            code
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

// --- NEW: Sync Mutation ---
const SyncFacetsDocument = graphql(`
    mutation SyncGlobalFacets {
        syncGlobalFacets
    }
`);

export const GlobalFacetList = () => {
    const queryClient = useQueryClient();

    // UI State
    const [selectedFacet, setSelectedFacet] = useState<any | null>(null);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null); // If set, we are in Edit Mode
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    // --- Queries ---
    const { data, isLoading } = useQuery({
        queryKey: ['global-facets'],
        queryFn: () => api.query(GetGlobalFacetsDocument),
    });

    // --- Mutations ---

    // 1. Sync All (Manual Trigger)
    const syncMutation = useMutation({
        mutationFn: () => api.query(SyncFacetsDocument),
        onSuccess: () => alert('Sync Complete! All channels now have these facets.'),
        onError: () => alert('Sync Failed. Check server logs.')
    });

    // 2. Facets
    const createFacetMutation = useMutation({
        mutationFn: (variables: { input: any }) => api.query(CreateFacetDocument, variables),
        onSuccess: () => resetForm(),
        onError: () => alert('Failed to create facet.')
    });

    const updateFacetMutation = useMutation({
        mutationFn: (variables: { input: any }) => api.query(UpdateFacetDocument, variables),
        onSuccess: () => resetForm(),
        onError: () => alert('Failed to update facet.')
    });

    const deleteFacetMutation = useMutation({
        mutationFn: async (id: string) => {
            // We await the result here so we can check it
            const response = await api.query(DeleteFacetDocument, { id });
            return response.deleteFacet;
        },
        onSuccess: (data) => {
            // Check if Vendure actually deleted it
            if (data.result === 'DELETED') {
                queryClient.invalidateQueries({ queryKey: ['global-facets'] });
                // Optional: Clear selection if we deleted the currently viewed item
                if (selectedFacet && selectedFacet.id === editingId) {
                    setSelectedFacet(null);
                }
            } else {
                // If NOT deleted (e.g., foreign key constraint), show the warning
                alert(`Cannot delete this Facet Group.\n\nReason: ${data.message || 'It is currently in use by Products.'}`);
            }
        },
        onError: (err) => {
            console.error(err);
            alert('System error occurred while trying to delete.');
        }
    });

    // 3. Facet Values
    const createValueMutation = useMutation({
        mutationFn: (variables: { input: any[] }) => api.query(CreateFacetValueDocument, variables),
        onSuccess: () => resetForm(true),
        onError: () => alert('Failed to create value.')
    });

    const updateValueMutation = useMutation({
        mutationFn: (variables: { input: any[] }) => api.query(UpdateFacetValueDocument, variables),
        onSuccess: () => resetForm(true),
        onError: () => alert('Failed to update value.')
    });

    const deleteValueMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await api.query(DeleteFacetValueDocument, { ids: [id] });
            return res.deleteFacetValues;
        },
        onSuccess: (results) => {
            const failed = results.find((r: any) => r.result === 'NOT_DELETED');
            if (failed) {
                alert(`Cannot delete: ${failed.message}`);
            } else {
                queryClient.invalidateQueries({ queryKey: ['global-facets'] });
            }
        },
        onError: (err) => {
            console.error(err);
            alert('System error during deletion.');
        }
    });

    // --- Helpers ---

    const resetForm = (refreshList = true) => {
        if (refreshList) queryClient.invalidateQueries({ queryKey: ['global-facets'] });

        // If we were editing a value, re-sync the selected facet
        if (selectedFacet && data?.facets?.items) {
            const updated = data.facets.items.find((f: any) => f.id === selectedFacet.id);
            if (updated) setSelectedFacet(updated);
        }

        setEditingId(null);
        setNewName('');
        setNewCode('');
    };

    const startEditing = (item: any) => {
        setEditingId(item.id);
        setNewName(item.name);
        setNewCode(item.code);
    };

    const activeFacet = selectedFacet
        ? data?.facets?.items.find((f: any) => f.id === selectedFacet.id)
        : null;

    // --- Handlers: Facets ---

    const handleSaveFacet = () => {
        if (!newName || !newCode) return;

        if (editingId) {
            // Update Existing
            updateFacetMutation.mutate({
                input: {
                    id: editingId,
                    code: newCode,
                    translations: [{ languageCode: 'en', name: newName }]
                }
            });
        } else {
            // Create New
            createFacetMutation.mutate({
                input: {
                    code: newCode,
                    isPrivate: false,
                    translations: [{ languageCode: 'en', name: newName }]
                }
            });
        }
    };

    // --- Handlers: Values ---

    const handleSaveValue = () => {
        if (!newName || !newCode || !activeFacet) return;

        if (editingId) {
            // Update Existing
            updateValueMutation.mutate({
                input: [{
                    id: editingId,
                    code: newCode,
                    translations: [{ languageCode: 'en', name: newName }]
                }]
            });
        } else {
            // Create New
            createValueMutation.mutate({
                input: [{
                    facetId: activeFacet.id,
                    code: newCode,
                    translations: [{ languageCode: 'en', name: newName }]
                }]
            });
        }
    };


    // --- Loading & Auth ---
    if (isLoading) return <div className="p-8">Loading...</div>;

    const roles = data?.activeAdministrator?.user?.roles || [];
    const allPermissions = roles.flatMap((r: any) => r.permissions);
    const isAdmin = allPermissions.includes('SuperAdmin');

    if (!isAdmin) return <div className="p-8 text-red-500">Access Denied</div>;


    // --- RENDER ---
    return (
        <Page pageId="global-facets">
            <PageTitle>Global Facets Configuration</PageTitle>
            <PageLayout>
                <PageBlock blockId="global-facets-list" column="main">

                    {/* View 1: List of Facets */}
                    {!activeFacet && (
                        <div className="flex flex-col gap-6">
                            {/* NEW: Sync Banner */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-md bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200 border border-sky-100 dark:border-sky-800/50">
                                <div className="flex items-start gap-3">
                                    <Globe className="w-5 h-5 mt-0.5" />
                                    <div>
                                        <h3 className="font-medium">Global Sync Active</h3>
                                        <p className="text-sm opacity-80">
                                            Facets created here are synced to all merchants.
                                        </p>
                                    </div>
                                </div>

                                {/* Manual Sync Button */}
                                <button
                                    onClick={() => syncMutation.mutate()}
                                    disabled={syncMutation.isPending}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-sky-200 dark:border-sky-800 rounded-md shadow-sm hover:bg-sky-50 dark:hover:bg-sky-900/40 transition-colors text-sm font-medium"
                                >
                                    <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                    {syncMutation.isPending ? 'Syncing...' : 'Force Sync All'}
                                </button>
                            </div>

                            {/* Form (Create or Edit) */}
                            <div className={`p-4 border rounded-lg shadow-sm transition-colors ${editingId ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'}`}>
                                <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${editingId ? 'text-amber-600 dark:text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {editingId ? 'Edit Facet' : 'Create New Facet Group'}
                                </h3>
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

                                    {editingId && (
                                        <button
                                            className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-200 rounded-md hover:bg-gray-300 flex items-center gap-2"
                                            onClick={() => resetForm(false)}
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </button>
                                    )}

                                    <button
                                        className={`px-4 py-2 text-white rounded-md flex items-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary-dark'}`}
                                        onClick={handleSaveFacet}
                                        disabled={!newName || !newCode || createFacetMutation.isPending || updateFacetMutation.isPending}
                                    >
                                        {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {editingId ? 'Update' : 'Create'}
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
                                                resetForm(false);
                                                setSelectedFacet(facet);
                                            }}>
                                                <td className="px-4 py-3 font-medium dark:text-gray-200">{facet.name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{facet.code}</td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                    {facet.values?.length || 0} items
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditing(facet);
                                                        }}
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm(`Delete "${facet.name}" and all its values?`)) {
                                                                deleteFacetMutation.mutate(facet.id);
                                                            }
                                                        }}
                                                        title="Delete"
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

                    {/* View 2: Facet Values */}
                    {activeFacet && (
                        <div className="flex flex-col gap-6">
                            <div className="flex items-center gap-4 border-b border-gray-200 dark:border-zinc-800 pb-4">
                                <button
                                    onClick={() => {
                                        resetForm(false);
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

                            {/* Form (Create/Edit Value) */}
                            <div className={`p-4 border rounded-lg shadow-sm transition-colors ${editingId ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'}`}>
                                <h3 className={`text-sm font-semibold mb-3 uppercase tracking-wider ${editingId ? 'text-amber-600 dark:text-amber-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {editingId ? 'Edit Value' : 'Add New Value'}
                                </h3>
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

                                    {editingId && (
                                        <button
                                            className="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-200 rounded-md hover:bg-gray-300 flex items-center gap-2"
                                            onClick={() => resetForm(false)}
                                        >
                                            <X className="w-4 h-4" />
                                            Cancel
                                        </button>
                                    )}

                                    <button
                                        className={`px-4 py-2 text-white rounded-md flex items-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary-dark'}`}
                                        onClick={handleSaveValue}
                                        disabled={!newName || !newCode || createValueMutation.isPending || updateValueMutation.isPending}
                                    >
                                        {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        {editingId ? 'Update' : 'Add'}
                                    </button>
                                </div>
                            </div>

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
                                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                                    <button
                                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                                                        onClick={() => startEditing(val)}
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                                        onClick={() => {
                                                            if (confirm('Delete this value?')) deleteValueMutation.mutate(val.id);
                                                        }}
                                                        title="Delete"
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
                </PageBlock>
            </PageLayout>
        </Page>
    );
};