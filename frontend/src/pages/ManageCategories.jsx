import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';

export default function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [showMainModal, setShowMainModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [mainName, setMainName] = useState('');
  const [subName, setSubName] = useState('');
  const [parentId, setParentId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axiosInstance.get('/categories');
        if (!cancelled) setCategories(res.data);
      } catch (e) {
        toast.error('Failed to load categories');
        console.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadCategories() {
    try {
      const res = await axiosInstance.get('/categories');
      setCategories(res.data);
    } catch (e) {
      toast.error('Failed to load categories');
      console.error(e);
    }
  }

  async function addMainCategory() {
    try {
      await axiosInstance.post('/categories', { name: mainName });
      toast.success('Main category added');
      setShowMainModal(false);
      setMainName('');
      await reloadCategories();
    } catch (e) {
      toast.error('Failed to add main category');
      console.error(e);
    }
  }

  async function addSubCategory() {
    try {
      await axiosInstance.post(`/categories/${parentId}/sub`, { name: subName });
      toast.success('Sub-category added');
      setShowSubModal(false);
      setSubName('');
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Categories</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mb-4" onClick={() => setShowMainModal(true)}>Add Main Category</button>
      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center">
              <div className="font-bold text-lg">{cat.name}</div>
              <button className="bg-red-500 text-white px-2 py-1 rounded" onClick={() => deleteCategory(cat.id)}>Delete</button>
            </div>
            <div className="mt-2">
              <button className="bg-green-500 text-white px-2 py-1 rounded mb-2" onClick={() => { setParentId(cat.id); setShowSubModal(true); }}>Add Sub-Category</button>
              <div className="ml-4">
                {cat.subCategories && cat.subCategories.length > 0 ? (
                  cat.subCategories.map(sub => (
                    <div key={sub.id} className="flex justify-between items-center mb-1">
                      <span>{sub.name}</span>
                      <button className="bg-red-400 text-white px-2 py-1 rounded" onClick={() => deleteCategory(sub.id)}>Delete</button>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No sub-categories</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Main Category Modal */}
      {showMainModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Add Main Category</h2>
            <input value={mainName} onChange={e => setMainName(e.target.value)} className="w-full px-3 py-2 border rounded mb-4" placeholder="Category name" />
            <div className="flex justify-end space-x-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={addMainCategory}>Add</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowMainModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Sub-Category Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Add Sub-Category</h2>
            <input value={subName} onChange={e => setSubName(e.target.value)} className="w-full px-3 py-2 border rounded mb-4" placeholder="Sub-category name" />
            <div className="flex justify-end space-x-2">
              <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={addSubCategory}>Add</button>
              <button className="bg-gray-300 px-4 py-2 rounded" onClick={() => setShowSubModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
