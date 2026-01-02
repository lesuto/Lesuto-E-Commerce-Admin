import React, { useState, useEffect } from 'react';
import { Page, PageTitle, PageLayout, PageBlock, Card } from '@vendure/dashboard';

import { graphql } from '@/gql';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@vendure/dashboard';

// --- GraphQL Definitions (unchanged) ---
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

export function ProfilePage() {
    // 1. Initialize form with safe defaults
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

    // 2. Use useQuery instead of manual useEffect
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

    // 3. Sync Data to Form State when data arrives
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
        if (!form.logoId && !form.logoFile) {
            alert('Please upload a logo before saving.');
            return;
        }

        let finalLogoId = form.logoId;

        // A. Upload Logo Logic
        if (form.logoFile) {
            setUploading(true);
            try {
                const result = await createAssetMutation.mutateAsync({
                    input: [{ file: form.logoFile }],
                });

                const asset = result.createAssets[0];
                if (asset && 'id' in asset) {
                    finalLogoId = asset.id;
                } else {
                    throw new Error('Asset upload failed');
                }
            } catch (err) {
                console.error('Upload failed', err);
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        // B. Update Profile Logic
        try {
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
            refetch();
        } catch (err) {
            console.error('Update failed', err);
        }
    };

    // 4. Loading State
    if (isLoading) {
        return (
            <Page pageId="supplier-profile">
                <PageTitle>Supplier Profile</PageTitle>
                <PageBlock column="main" blockId="loading-block">
                    <div className="p-6 text-center text-muted-foreground">Loading profile data...</div>
                </PageBlock>
            </Page>
        )
    }

    // 5. Error State
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
        )
    }

    return (
        <Page pageId="supplier-profile">
            <PageTitle>Supplier Profile</PageTitle>
            <PageLayout>
                <PageBlock column="main" blockId="supplier-profile-block">
                    <Card className="max-w-3xl mx-auto shadow-md rounded-lg overflow-hidden">
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
                                        disabled={uploading}
                                        className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground file:cursor-pointer hover:file:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    />
                                </div>
                                {uploading && <p className="mt-2 text-xs text-muted-foreground">Uploading new logo...</p>}
                            </div>

                            <hr className="border-border" />

                            {/* Short Description */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Company Name</label>
                                <input
                                    type="text"
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
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                                    value={form.shortDescription}
                                    onChange={e => setForm({ ...form, shortDescription: e.target.value })}
                                />
                            </div>

                            {/* About Company */}
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">About The Company</label>
                                <textarea
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
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-shadow"
                                    value={form.commission}
                                    onChange={e => setForm({ ...form, commission: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            {/* Footer Actions */}
                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={updateProfileMutation.isPending || uploading}
                                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    {updateProfileMutation.isPending || uploading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </Card>
                </PageBlock>
            </PageLayout>
        </Page>
    );
}