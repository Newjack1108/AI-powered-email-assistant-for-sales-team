import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/router';

interface ProductType {
  id: string;
  name: string;
  trading_name?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export default function ProductTypes() {
  const { user, loading: authLoading } = useAuth(true); // Require authentication
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProductType, setEditingProductType] = useState<ProductType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    trading_name: '',
    description: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadProductTypes();
    }
  }, [user]);

  const loadProductTypes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/product-types');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setProductTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading product types:', error);
      setMessage({ type: 'error', text: 'Failed to load product types.' });
      setProductTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required.' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/product-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingProductType?.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: editingProductType ? 'Product type updated!' : 'Product type created!' });
        setShowForm(false);
        setEditingProductType(null);
        setFormData({ name: '', trading_name: '', description: '' });
        loadProductTypes();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save product type.' });
      }
    } catch (error: any) {
      console.error('Error saving product type:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save product type.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (productType: ProductType) => {
    setEditingProductType(productType);
    setFormData({
      name: productType.name,
      trading_name: productType.trading_name || '',
      description: productType.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product type?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/product-types?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Product type deleted!' });
        loadProductTypes();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete product type.' });
      }
    } catch (error: any) {
      console.error('Error deleting product type:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to delete product type.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      // Redirect non-admin users
      window.location.href = '/';
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="card">
            <p>Loading authentication...</p>
          </div>
        </div>
      </>
    );
  }

  if (user && user.role !== 'admin') {
    return (
      <>
        <Header />
        <div className="container">
          <div className="card">
            <p>Access Denied: You must be an admin to view this page.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Product Types Management - Sales Email Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <div className="container">
        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2>Product Types Management</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm);
                setEditingProductType(null);
                setFormData({ name: '', trading_name: '', description: '' });
              }}
            >
              {showForm ? 'Cancel' : '+ New Product Type'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div className="form-group">
                <label htmlFor="name">Product Type Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Stables Shelters"
                />
              </div>
              <div className="form-group">
                <label htmlFor="trading_name">Trading Name (Optional)</label>
                <input
                  type="text"
                  id="trading_name"
                  name="trading_name"
                  value={formData.trading_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Cheshire Stables (used in emails)"
                />
                <small style={{ color: '#666', display: 'block', marginTop: '4px' }}>
                  This is the name used when referring to this product type in generated emails
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="description">Description (Optional)</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Brief description of this product type"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <span className="loading"></span> : null}
                {editingProductType ? 'Update Product Type' : 'Create Product Type'}
              </button>
            </form>
          )}

          {loading && !showForm && <p>Loading product types...</p>}

          {!loading && productTypes.length === 0 && !showForm && (
            <p>No product types found. Click "+ New Product Type" to add one.</p>
          )}

          {!loading && productTypes.length > 0 && (
            <div className="product-types-list">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Trading Name</th>
                    <th>Description</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productTypes.map(pt => (
                    <tr key={pt.id}>
                      <td><strong>{pt.name}</strong></td>
                      <td>{pt.trading_name || <em style={{ color: '#999' }}>None</em>}</td>
                      <td>{pt.description || <em style={{ color: '#999' }}>No description</em>}</td>
                      <td>{new Date(pt.updated_at).toLocaleString()}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => handleEdit(pt)}
                          style={{ marginRight: '8px' }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDelete(pt.id)}
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
      </div>
    </>
  );
}

