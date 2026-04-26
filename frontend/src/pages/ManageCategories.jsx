import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';
import { validateCategoryName } from '../utils/validation';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [showMainModal, setShowMainModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [mainName, setMainName] = useState('');
  const [subName, setSubName] = useState('');
  const [parentId, setParentId] = useState(null);
  const [mainError, setMainError] = useState('');
  const [subError, setSubError] = useState('');

  async function fetchCategoriesWithChildren() {
    const parentResponse = await axiosInstance.get('/categories');
    const parentCategories = parentResponse.data || [];

    const categoriesWithChildren = await Promise.all(
      parentCategories.map(async (category) => {
        const subCategoryResponse = await axiosInstance.get(`/categories/${category.id}/sub`);
        return {
          ...category,
          subCategories: subCategoryResponse.data || [],
        };
      })
    );

    return categoriesWithChildren;
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const categoriesWithChildren = await fetchCategoriesWithChildren();
        if (!cancelled) setCategories(categoriesWithChildren);
      } catch (e) {
        if (!cancelled) {
          toast.error('Failed to load categories');
          console.error(e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadCategories() {
    try {
      const categoriesWithChildren = await fetchCategoriesWithChildren();
      setCategories(categoriesWithChildren);
    } catch (e) {
      toast.error('Failed to load categories');
      console.error(e);
    }
  }

  async function addMainCategory() {
    const validationMessage = validateCategoryName(mainName, 'Main category');
    setMainError(validationMessage);
    if (validationMessage) {
      toast.error('Please fix the category name before saving.');
      return;
    }

    try {
      await axiosInstance.post('/categories', { name: mainName });
      toast.success('Main category added');
      setShowMainModal(false);
      setMainName('');
      setMainError('');
      await reloadCategories();
    } catch (e) {
      toast.error('Failed to add main category');
      console.error(e);
    }
  }

  async function addSubCategory() {
    const validationMessage = validateCategoryName(subName, 'Sub-category');
    setSubError(validationMessage);
    if (validationMessage) {
      toast.error('Please fix the sub-category name before saving.');
      return;
    }

    try {
      await axiosInstance.post(`/categories/${parentId}/sub`, { name: subName });
      toast.success('Sub-category added');
      setShowSubModal(false);
      setSubName('');
      setSubError('');
      await reloadCategories();
    } catch (e) {
      toast.error('Failed to add sub-category');
      console.error(e);
    }
  }

  async function deleteCategory(id) {
    try {
      await axiosInstance.delete(`/categories/${id}`);
      toast.success('Category deleted');
      await reloadCategories();
    } catch (e) {
      toast.error('Failed to delete category');
      console.error(e);
    }
  }

  // Returns custom visual styling for main categories conditionally by name heuristics
  const getCategoryTheme = (name) => {
    const formattedName = name.toLowerCase();
    
    if (formattedName.includes('cultural')) {
      return { border: 'bg-tertiary', badgeBg: 'bg-secondary-container', badgeText: 'text-on-secondary-container', badgeLabel: 'Global', isUrgent: false };
    }
    if (formattedName.includes('technical')) {
      return { border: 'bg-primary', badgeBg: 'bg-secondary-container', badgeText: 'text-on-secondary-container', badgeLabel: 'Active', isUrgent: false };
    }
    if (formattedName.includes('academic')) {
      return { border: 'bg-primary-container', badgeBg: 'bg-primary-fixed', badgeText: 'text-on-primary-fixed-variant', badgeLabel: 'Core', isUrgent: false };
    }
    if (formattedName.includes('sports')) {
      return { border: 'bg-secondary', isUrgent: false };
    }
    
    // Default Styling
    return { border: 'bg-outline', badgeBg: 'bg-surface-container-high', badgeText: 'text-on-surface', badgeLabel: 'Standard', isUrgent: false };
  };

  return (
    <AdminLayout>
      {/* Editorial Header Section */}
      <header className="max-w-6xl mx-auto mb-16 pt-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-5xl font-serif font-bold text-on-surface tracking-tight">Manage Categories</h2>
            <p className="text-on-surface-variant text-lg leading-relaxed font-light">
              Organize and curate event types for the institution. Maintain the academic integrity through precise categorization and sub-division of campus activities.
            </p>
          </div>
          <button 
            onClick={() => setShowMainModal(true)}
            className="bg-linear-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined">library_add</span>
            Add Main Category
          </button>
        </div>
      </header>

      {/* Categories Bento-Inspired Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {categories.map(cat => {
          const theme = getCategoryTheme(cat.name);
          
          if (theme.isUrgent) {
            return (
              <div key={cat.id} className={`${theme.bgColor} p-8 rounded-xl relative overflow-hidden shadow-xl shadow-tertiary/10 flex flex-col`}>
                <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-tertiary opacity-10 rounded-full"></div>
                <div className="flex justify-between items-start mb-6 z-10">
                  <h3 className={`text-2xl font-serif font-bold ${theme.textColor}`}>{cat.name}</h3>
                  <span className={`material-symbols-outlined ${theme.textColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>priority_high</span>
                </div>
                <p className="text-on-tertiary-fixed-variant text-sm mb-8 leading-relaxed z-10 flex-1">
                  This category is reserved for institutional emergency broadcasts and high-priority administrative notices.
                </p>
                <div className="flex items-center justify-between mt-auto z-10">
                  <button 
                    onClick={() => { setParentId(cat.id); setShowSubModal(true); }}
                    className={`${theme.textColor} text-sm font-bold flex items-center gap-1 hover:opacity-70 transition-opacity`}
                  >
                    <span className="material-symbols-outlined text-lg">add</span> Add Sub-Category
                  </button>
                  <button 
                    onClick={() => deleteCategory(cat.id)}
                    className={`${theme.textColor}/60 hover:text-error transition-colors p-2`} 
                    title="Delete Category"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={cat.id} className="bg-surface-container-lowest p-8 rounded-xl relative overflow-hidden group shadow-sm border border-outline-variant/30 flex flex-col">
              <div className={`absolute top-0 left-0 w-1 h-full ${theme.border}`}></div>
              
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-serif font-bold text-on-surface">{cat.name}</h3>
                {theme.badgeLabel && (
                  <span className={`${theme.badgeBg} ${theme.badgeText} px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest`}>
                    {theme.badgeLabel}
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-8 flex-1">
                {cat.subCategories && cat.subCategories.length > 0 ? (
                  cat.subCategories.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between text-on-surface-variant bg-surface-container-low p-3 rounded-lg group/sub">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-sm opacity-60">subdirectory_arrow_right</span>
                        <span className="text-sm font-medium">{sub.name}</span>
                      </div>
                      <button 
                        onClick={() => deleteCategory(sub.id)}
                        className="opacity-0 group-hover/sub:opacity-100 text-error/60 hover:text-error transition-all"
                        title="Delete Sub-category"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center bg-surface-container-low/50 rounded-lg border border-dashed border-outline-variant">
                    <span className="material-symbols-outlined text-outline text-3xl mb-2">inbox</span>
                    <p className="text-on-surface-variant text-xs italic">No sub-categories defined</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto">
                <button 
                  onClick={() => { setParentId(cat.id); setShowSubModal(true); }}
                  className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-lg">add</span> Add Sub-Category
                </button>
                <button 
                  onClick={() => deleteCategory(cat.id)}
                  className="text-error/60 hover:text-error transition-colors p-2" 
                  title="Delete Main Category"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Decorative Empty State / Add New Placeholder */}
        <div 
          onClick={() => setShowMainModal(true)}
          className="border border-outline-variant/30 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-4 hover:bg-surface-container-low/50 transition-colors group cursor-pointer bg-transparent"
        >
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline group-hover:bg-primary-fixed group-hover:text-primary transition-all duration-300">
            <span className="material-symbols-outlined text-3xl">add</span>
          </div>
          <div>
            <h4 className="font-serif text-lg text-on-surface-variant font-bold">New Category</h4>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Initialize Segment</p>
          </div>
        </div>

      </div>

      {/* Featured Resource Section */}
      <section className="max-w-6xl mx-auto mt-24 mb-10">
        <div className="bg-surface-container-low rounded-2xl overflow-hidden flex flex-col md:flex-row items-stretch">
          <div className="w-full md:w-1/3 min-h-[300px] relative">
            <img 
              alt="Historical university archive building" 
              className="absolute inset-0 w-full h-full object-cover grayscale opacity-80" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZ5kWsEyuKh4uilj8eMNulBSEsD58u0vmPKjVP5n3dwsjiHFMGiLL7i6c0Tq7gqrc5ERGdKDf4Y4f5kjIGO93DQfEqISTQaexIUKJSiPp4mKvUsGFOzmOD5fTLfVP_j1nFqBfmaTyRaBIUkBRLn5072_QmdLAby47JPG-4lw6JqV_G2nDwezzxo-pPsXB_OWvKoxrYHwZw7EYgD4ZjDOiDfvlVJqtZlwVP8uG_UYpJaqPAiqRBZzAfDvI8Hkmmytt_lso3YVgtToM9"
            />
            <div className="absolute inset-0 bg-primary/20 backdrop-brightness-75"></div>
          </div>
          <div className="p-12 flex-1 flex flex-col justify-center">
            <span className="text-primary font-bold text-xs uppercase tracking-[0.2em] mb-4">Curation Tip</span>
            <h3 className="text-3xl font-serif font-bold text-on-surface mb-4">The Logic of Taxonomy</h3>
            <p className="text-on-surface-variant leading-relaxed max-w-xl text-sm">
              A well-structured categorization system improves faculty engagement by 40%. Ensure your sub-categories are mutually exclusive and collectively exhaustive to provide the cleanest navigation experience for your students.
            </p>
            <div className="mt-8 relative w-max">
              <button className="text-primary text-sm font-bold flex items-center gap-2 group">
                <span>Read the Curation Guidelines</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Category Modal */}
      {showMainModal && (
        <div className="fixed inset-0 bg-teal-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-on-surface">Add Category</h2>
              <button onClick={() => { setShowMainModal(false); setMainError(''); }} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">Define a top-level classification for institutional grouping.</p>
            <input 
              value={mainName} 
              onChange={e => { setMainName(e.target.value); setMainError(''); }} 
              className="w-full px-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary/40 rounded-xl mb-8 text-sm placeholder:opacity-50" 
              placeholder="e.g., Infrastructure, Symposium..." 
              autoFocus
            />
            {mainError && <p className="-mt-5 mb-6 text-sm font-medium text-error">{mainError}</p>}
            <div className="flex justify-end gap-3">
              <button className="px-6 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" onClick={() => { setShowMainModal(false); setMainError(''); }}>
                Cancel
              </button>
              <button className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white shadow-md shadow-primary/20 hover:opacity-90 transition-opacity" onClick={addMainCategory}>
                Initialize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Category Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-teal-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-md border border-outline-variant/30 relative overflow-hidden">
            <div className="absolute top-0 w-full left-0 h-1 bg-primary"></div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-on-surface">Add Sub-category</h2>
              <button onClick={() => { setShowSubModal(false); setSubError(''); }} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">Create a granular classification belonging to the selected main bracket.</p>
            <input 
              value={subName} 
              onChange={e => { setSubName(e.target.value); setSubError(''); }} 
              className="w-full px-4 py-3 bg-surface-container-low border-none focus:ring-2 focus:ring-primary/40 rounded-xl mb-8 text-sm placeholder:opacity-50" 
              placeholder="e.g., Cybersecurity, Open Mic..." 
              autoFocus
            />
            {subError && <p className="-mt-5 mb-6 text-sm font-medium text-error">{subError}</p>}
            <div className="flex justify-end gap-3">
              <button className="px-6 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors" onClick={() => { setShowSubModal(false); setSubError(''); }}>
                Cancel
              </button>
              <button className="px-6 py-2 rounded-xl text-sm font-bold bg-on-surface text-surface shadow-md hover:opacity-90 transition-opacity" onClick={addSubCategory}>
                Append Structure
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
