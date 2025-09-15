'use client';

import { useState } from 'react';
import { 
  useFeedTypes, 
  useCreateFeedType, 
  useUpdateFeedType, 
  useDeleteFeedType 
} from '@/hooks/useApi';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  Save,
  X,
  Fish,
  Wheat,
  Leaf,
  Droplets,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function FeedTypesPage() {
  const { data: feedTypesData, isLoading } = useFeedTypes();
  const createFeedType = useCreateFeedType();
  const updateFeedType = useUpdateFeedType();
  const deleteFeedType = useDeleteFeedType();

  const feedTypes = feedTypesData?.data || [];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    protein_content: '',
    description: ''
  });

  const iconOptions = [
    { value: 'package', label: 'Package', icon: Package },
    { value: 'fish', label: 'Fish', icon: Fish },
    { value: 'wheat', label: 'Wheat', icon: Wheat },
    { value: 'leaf', label: 'Leaf', icon: Leaf },
    { value: 'droplets', label: 'Droplets', icon: Droplets },
    { value: 'zap', label: 'Zap', icon: Zap },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        ...formData,
        protein_content: formData.protein_content ? parseFloat(formData.protein_content) : null
      };

      if (editingId) {
        await updateFeedType.mutateAsync({ id: editingId, data: submitData });
        setEditingId(null);
      } else {
        await createFeedType.mutateAsync(submitData);
        setIsAdding(false);
      }
      setFormData({ name: '', protein_content: '', description: '' });
    } catch (error) {
      console.error('Error saving feed type:', error);
    }
  };

  const handleEdit = (feedType: any) => {
    setFormData({
      name: feedType.name,
      protein_content: feedType.protein_content?.toString() || '',
      description: feedType.description
    });
    setEditingId(feedType.id);
    setIsAdding(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the feed type "${name}"? This action cannot be undone.`)) {
      try {
        await deleteFeedType.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting feed type:', error);
      }
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', protein_content: '', description: '' });
  };

  const getProteinColor = (protein: number | null) => {
    if (!protein) return 'bg-gray-100 text-gray-800';
    if (protein >= 40) return 'bg-red-100 text-red-800';
    if (protein >= 30) return 'bg-orange-100 text-orange-800';
    if (protein >= 20) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getProteinLabel = (protein: number | null) => {
    if (!protein) return 'Not specified';
    if (protein >= 40) return 'High Protein';
    if (protein >= 30) return 'Medium-High Protein';
    if (protein >= 20) return 'Medium Protein';
    return 'Low Protein';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:flex space-y-3 md:space-y-0 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feed Types</h1>
          <p className="text-gray-600">Manage feed types and their nutritional properties</p>
        </div>
        <button
          style={{color: "white"}}
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Feed Type
        </button>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Feed Type' : 'Add New Feed Type'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Feed Type Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., Starter Feed, Grower Feed, Finisher Feed"
                />
              </div>

              <div>
                <label htmlFor="protein_content" className="block text-sm font-medium text-gray-700 mb-2">
                  Protein Content (%)
                </label>
                <input
                  type="number"
                  id="protein_content"
                  name="protein_content"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.protein_content}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                  placeholder="e.g., 32.5"
                />
                <p className="mt-1 text-sm text-gray-500">Optional: Protein percentage in the feed</p>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Describe the feed type, its purpose, and any special characteristics..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2 inline" />
                Cancel
              </button>
              <button
                type="submit"
                disabled={createFeedType.isPending || updateFeedType.isPending}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                style={{ color: 'white !important' }}
              >
                <Save className="h-4 w-4 mr-2 inline" />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feed Types List */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feed Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Protein Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {feedTypes.map((feedType) => (
                <tr key={feedType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-orange-600 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{feedType.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {feedType.protein_content ? (
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProteinColor(parseFloat(feedType.protein_content))}`}>
                          {feedType.protein_content}%
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {getProteinLabel(parseFloat(feedType.protein_content))}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Not specified</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {feedType.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(feedType.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(feedType)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(feedType.id, feedType.name)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                        disabled={deleteFeedType.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {feedTypes.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No feed types</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first feed type.</p>
        </div>
      )}

      {/* Feed Type Categories Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Feed Type Categories</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 mb-2">By Protein Content:</h4>
            <ul className="space-y-1 text-blue-700">
              <li><span className="inline-block w-3 h-3 bg-red-100 rounded-full mr-2"></span>High Protein (40%+): Fry feeds, high-performance feeds</li>
              <li><span className="inline-block w-3 h-3 bg-orange-100 rounded-full mr-2"></span>Medium-High (30-39%): Grower feeds, juvenile feeds</li>
              <li><span className="inline-block w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>Medium (20-29%): Maintenance feeds, adult feeds</li>
              <li><span className="inline-block w-3 h-3 bg-green-100 rounded-full mr-2"></span>Low (Below 20%): Supplementary feeds, treats</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 mb-2">Common Feed Types:</h4>
            <ul className="space-y-1 text-blue-700">
              <li>• Starter Feed: High protein for young fish</li>
              <li>• Grower Feed: Balanced nutrition for growth</li>
              <li>• Finisher Feed: Optimized for final growth phase</li>
              <li>• Maintenance Feed: For adult fish maintenance</li>
              <li>• Medicated Feed: With health supplements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
