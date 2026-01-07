import { 
  defineDashboardExtension, 
  Page, 
  PageLayout, 
  PageTitle, 
  PageBlock,
  Card 
} from '@vendure/dashboard';
import { useQuery, useMutation } from '@apollo/client';
import { useState } from 'react';
import { GET_CMS_PAGE, SAVE_CMS_PAGE } from './queries';

interface StoreContent {
  heroTitle: string;
  heroSubtitle: string;
  aboutUs: string;
  contactEmail: string;
  logoUrl: string;
}

const DEFAULT_CONTENT: StoreContent = {
  heroTitle: 'Welcome To Your New Lesuto Storefront',
  heroSubtitle: 'Let\'s Succeed Together',
  aboutUs: 'We are a local brand...',
  contactEmail: 'contact@example.com',
  logoUrl: '',
};

function StoreEditor() {
  // REMOVED: usePageTitle('Edit Storefront'); <-- This hook does not exist in standard exports
  
  const [content, setContent] = useState<StoreContent>(DEFAULT_CONTENT);
  const [isSaved, setIsSaved] = useState(false);

  const { data, loading } = useQuery(GET_CMS_PAGE, {
    variables: { slug: 'home' },
    onCompleted: (data) => {
      if (data?.page?.blocks) {
        setContent({ ...DEFAULT_CONTENT, ...data.page.blocks });
      }
    }
  });

  const [savePage, { loading: saving }] = useMutation(SAVE_CMS_PAGE);

  const handleSave = async () => {
    try {
      await savePage({
        variables: {
          slug: 'home',
          title: 'Homepage',
          blocks: content,
        },
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save", err);
      alert("Error saving page");
    }
  };

  const handleChange = (field: keyof StoreContent, value: string) => {
    setContent(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div>Loading editor...</div>;

  return (
    <Page pageId="cms-editor">
      <PageTitle>Customize Your Store</PageTitle>
      
      <PageLayout>
        {/* FIXED: column="sidebar" -> column="side" */}
        <PageBlock column="main" blockId="store-editor-form">
          <Card>
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Branding & Hero</h3>
                <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border mb-4"
                  value={content.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://..."
                />

                <label className="block text-sm font-medium text-gray-700">Hero Title</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border mb-4"
                  value={content.heroTitle}
                  onChange={(e) => handleChange('heroTitle', e.target.value)}
                />

                <label className="block text-sm font-medium text-gray-700">Hero Subtitle</label>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  value={content.heroSubtitle}
                  onChange={(e) => handleChange('heroSubtitle', e.target.value)}
                />
              </div>

              <hr />

              <div>
                <h3 className="text-lg font-semibold mb-2">Content</h3>
                <label className="block text-sm font-medium text-gray-700">About Us</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border h-24"
                  value={content.aboutUs}
                  onChange={(e) => handleChange('aboutUs', e.target.value)}
                />
                
                <label className="block text-sm font-medium text-gray-700 mt-4">Contact Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  value={content.contactEmail}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{ padding: '8px 16px', background: '#0070f3', color: 'white', borderRadius: '4px' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {isSaved && <span className="text-green-600">Saved!</span>}
              </div>

            </div>
          </Card>
        </PageBlock>

        {/* FIXED: column="sidebar" -> column="side" */}
        <PageBlock column="side" blockId="store-editor-help">
          <Card>
            <div className="p-4">
              <h3 className="font-semibold mb-2">Preview Data</h3>
              <p className="text-xs text-gray-500 mb-4">
                This JSON is what gets sent to your storefront.
              </p>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">
                {JSON.stringify(content, null, 2)}
              </pre>
            </div>
          </Card>
        </PageBlock>

      </PageLayout>
    </Page>
  );
}

export default defineDashboardExtension({
  routes: [
    {
      path: '/cms',
      loader: () => ({ breadcrumb: 'Edit Store' }),
      navMenuItem: {
        id: 'cms',
        title: 'Edit Store',
        sectionId: 'catalog',
      },
      component: StoreEditor,
    },
  ],
});