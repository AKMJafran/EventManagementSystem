import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';

export default function ManageVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: '', location: '' });

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const res = await axiosInstance.get('/venues');
      setVenues(res.data);
    } catch (e) {
      toast.error('Failed to load venues');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVenue) {
        await axiosInstance.put(`/venues/${editingVenue.id}`, formData);
        toast.success('Venue updated successfully');
      } else {
        await axiosInstance.post('/venues', formData);
        toast.success('Venue created successfully');
      }
      fetchVenues();
      setShowModal(false);
      setEditingVenue(null);
      setFormData({ name: '', capacity: '', location: '' });
    } catch (e) {
      toast.error('Failed to save venue');
      console.error(e);
    }
  };

  const handleEdit = (venue) => {
    setEditingVenue(venue);
    setFormData({ name: venue.name, capacity: venue.capacity, location: venue.location });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this venue?')) {
      try {
        await axiosInstance.delete(`/venues/${id}`);
        toast.success('Venue deleted successfully');
        fetchVenues();
      } catch (e) {
        toast.error('Failed to delete venue');
        console.error(e);
      }
    }
  };

  const openCreateModal = () => {
    setEditingVenue(null);
    setFormData({ name: '', capacity: '', location: '' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Manage Venues</h1>
          <button
            onClick={openCreateModal}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Add Venue
          </button>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">All Venues ({venues.length})</h2>
          {venues.length === 0 ? (
            <p className="text-gray-500">No venues found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Capacity</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {venues.map((venue) => (
                    <tr key={venue.id} className="border-t">
                      <td className="px-4 py-2">{venue.name}</td>
                      <td className="px-4 py-2">{venue.capacity}</td>
                      <td className="px-4 py-2">{venue.location}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleEdit(venue)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(venue.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="text-lg font-semibold mb-4">
                {editingVenue ? 'Edit Venue' : 'Add Venue'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg hover:bg-primary/90"
                  >
                    {editingVenue ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}