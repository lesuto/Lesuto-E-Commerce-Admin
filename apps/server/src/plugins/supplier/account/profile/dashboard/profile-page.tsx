import React, { useState, useEffect } from 'react';
import { Page, PageTitle, PageLayout, PageBlock, Card } from '@vendure/dashboard';
import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@vendure/dashboard';

// --- GraphQL Definitions ---
const GET_PROFILE = graphql(`
  query GetProfile {
    activeChannelProfile {
      id
      nameCompany
      shortDescription
      aboutCompany
      applyForMarketplace
      commission
      logo {
        id
        preview
      }
    }
  }
`);

const UPDATE_PROFILE = graphql(`
  mutation UpdateProfile($input: UpdateSupplierProfileInput!) {
    updateActiveChannelProfile(input: $input) {
      id
      nameCompany
      shortDescription
      logo {
        id
        preview
      }
    }
  }
`);

const CREATE_ASSETS = graphql(`
  mutation CreateAssets($input: [CreateAssetInput!]!) {
    createAssets(input: $input) {
      ... on Asset {
        id
        preview
      }
      ... on MimeTypeError {
        errorCode
        message
      }
    }
  }
`);

// --- Custom Toast Component ---
// A clean, "native-looking" notification box that sits top-right
// --- Custom Toast Component (High Contrast / Inverted) ---
function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    const isSuccess = type === 'success';

    return (
        <div className={`
            fixed top-4 right-4 z-[100] flex items-center w-full max-w-xs p-4 space-x-3 text-sm rounded-md shadow-lg border animate-in slide-in-from-right-5 fade-in duration-300
            
            /* --- COLOR LOGIC --- */
            /* Default (Light Mode) -> Dark Toast */
            bg-gray-900 text-white border-gray-800
            
            /* Dark Mode -> White Toast */
            dark:bg-white dark:text-gray-900 dark:border-gray-200
        `}>
            <div className={`
                flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full
                
                /* Icon Colors adapted for contrast */
                ${isSuccess 
                    ? 'bg-green-900 text-green-300 dark:bg-green-100 dark:text-green-600' 
                    : 'bg-red-900 text-red-300 dark:bg-red-100 dark:text-red-600'
                }
            `}>
                {isSuccess ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>
            
            {/* Message */}
            <div className="flex-1 font-medium">
                {message}
            </div>

            {/* Close Button */}
            <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-white dark:text-gray-400 dark:hover:text-gray-600 transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// --- Main Form Component ---
export function ProfilePage() {
    // 1. Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [form, setForm] = useState({
        nameCompany: '',
        shortDescription: '',
        aboutCompany: '',
        applyForMarketplace: false,
        commission: 0,
        logoId: null as string | null,
        logoFile: null as File | null,
        logoPreview: '',
    });

    const [uploading, setUploading] = useState(false);

    // 2. Data Fetching
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['activeChannelProfile'],
        queryFn: () => api.query(GET_PROFILE),
        refetchOnWindowFocus: false,
    });

    const updateProfileMutation = useMutation({
        mutationFn: (args: any) => api.mutate(UPDATE_PROFILE, args),
    });

    const createAssetMutation = useMutation({
        mutationFn: (args: any) => api.mutate(CREATE_ASSETS, args),
    });

    const isSaving = uploading || updateProfileMutation.isPending;

    // 3. Sync Data
    useEffect(() => {
        if (data?.activeChannelProfile) {
            const p = data.activeChannelProfile;
            setForm({
                nameCompany: p.nameCompany || '',
                shortDescription: p.shortDescription || '',
                aboutCompany: p.aboutCompany || '',
                applyForMarketplace: p.applyForMarketplace || false,
                commission: p.commission || 0,
                logoId: p.logo?.id || null,
                logoFile: null,
                logoPreview: p.logo?.preview || '',
            });
        }
    }, [data]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setForm((prev) => ({
                ...prev,
                logoFile: file,
                logoPreview: URL.createObjectURL(file),
            }));
        }
    };

    const handleSave = async () => {
        // Validation
        if (!form.logoId && !form.logoFile) {
            setToast({ message: 'Please upload a logo before saving.', type: 'error' });
            return;
        }

        try {
            let finalLogoId = form.logoId;

            // A. Upload Logo Logic
            if (form.logoFile) {
                setUploading(true);
                const result = await createAssetMutation.mutateAsync({
                    input: [{ file: form.logoFile }],
                });

                const asset = result.createAssets[0];
                if (asset && 'id' in asset) {
                    finalLogoId = asset.id;
                } else {
                    throw new Error('Asset upload failed');
                }
                setUploading(false);
            }

            // B. Update Profile Logic
            await updateProfileMutation.mutateAsync({
                input: {
                    nameCompany: form.nameCompany,
                    shortDescription: form.shortDescription,
                    aboutCompany: form.aboutCompany,
                    applyForMarketplace: form.applyForMarketplace,
                    commission: Number(form.commission),
                    logoId: finalLogoId,
                }
            });

            await refetch();

            // SUCCESS NOTIFICATION
            setToast({ message: 'Profile updated successfully', type: 'success' });

        } catch (err: any) {
            console.error('Update failed', err);
            setToast({ 
                message: err.message || 'An error occurred while saving', 
                type: 'error' 
            });
        } finally {
            setUploading(false);
        }
    };

    if (isLoading) {
        return (
            <Page pageId="supplier-profile">
                <PageTitle>Supplier Profile</PageTitle>
                <PageBlock column="main" blockId="loading-block">
                    <div className="p-12 flex justify-center text-muted-foreground">
                        Loading profile data...
                    </div>
                </PageBlock>
            </Page>
        );
    }

    if (isError) {
        return (
            <Page pageId="supplier-profile">
                <PageTitle>Supplier Profile Error</PageTitle>
                <PageBlock column="main" blockId="error-block">
                    <div className="bg-destructive/10 p-6 text-destructive rounded-lg shadow-sm">
                        Error loading profile. Please ensure the Supplier plugin is installed.
                    </div>
                </PageBlock>
            </Page>
        );
    }

    return (
        <Page pageId="supplier-profile">
            <PageTitle>Supplier Profile</PageTitle>
            <PageLayout>
                <PageBlock column="main" blockId="supplier-profile-block">
                    
                    {/* --- RENDER TOAST HERE --- */}
                    {toast && (
                        <Toast 
                            message={toast.message} 
                            type={toast.type} 
                            onClose={() => setToast(null)} 
                        />
                    )}

                    <Card className="max-w-3xl mx-auto shadow-md rounded-lg overflow-hidden relative">
                        
                        {/* Loading Overlay */}
                        {isSaving && (
                            <div className="absolute inset-0 bg-background/80 z-50 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="flex flex-col items-center p-4 bg-background rounded-lg shadow-lg border border-border">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                                    <span className="text-sm font-medium text-foreground">
                                        {uploading ? 'Uploading Logo...' : 'Saving Changes...'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-6">
                            {/* Logo Section */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Logo</label>
                                <div className="flex items-center gap-4">
                                    {form.logoPreview && (
                                        <img
                                            src={form.logoPreview}
                                            className="h-20 w-20 object-cover rounded-md border border-border shadow-sm"
                                            alt="Logo preview"
                                        />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={isSaving}
                                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground file:cursor-pointer hover:file:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    />
                                </div>
                            </div>

                            <hr className="border-border" />

                            {/* Company Name */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
                                <input
                                    type="text"
                                    disabled={isSaving}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                                    value={form.nameCompany}
                                    onChange={e => setForm({ ...form, nameCompany: e.target.value })}
                                />
                            </div>

                            {/* Short Description */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Short Description</label>
                                <input
                                    type="text"
                                    disabled={isSaving}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                                    value={form.shortDescription}
                                    onChange={e => setForm({ ...form, shortDescription: e.target.value })}
                                />
                            </div>

                            {/* About Company */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">About The Company</label>
                                <textarea
                                    disabled={isSaving}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-vertical transition-shadow"
                                    value={form.aboutCompany}
                                    onChange={e => setForm({ ...form, aboutCompany: e.target.value })}
                                />
                            </div>

                            {/* Marketplace Application */}
                            <div className="flex items-center gap-3 py-2">
                                <input
                                    type="checkbox"
                                    id="apply"
                                    disabled={isSaving}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                                    checked={form.applyForMarketplace}
                                    onChange={e => setForm({ ...form, applyForMarketplace: e.target.checked })}
                                />
                                <label htmlFor="apply" className="text-sm font-medium text-foreground cursor-pointer">
                                    Apply To Sell On Marketplace
                                </label>
                            </div>

                            {/* Commission */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Commission %</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    disabled={isSaving}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                                    value={form.commission}
                                    onChange={e => setForm({ ...form, commission: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </Card>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}