import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface SpecialOffer {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function SpecialOffers() {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<SpecialOffer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const res = await fetch('/api/special-offers');
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading special offers:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/special-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingOffer?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save special offer');
        return;
      }

      await loadOffers();
      setShowForm(false);
      setEditingOffer(null);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving special offer:', error);
      alert('Failed to save special offer');
    }
  };

  const handleEdit = (offer: SpecialOffer) => {
    setEditingOffer(offer);
    setFormData({
      name: offer.name,
      description: offer.description,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this special offer?')) {
      return;
    }

    try {
      const res = await fetch(`/api/special-offers?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('Failed to delete special offer');
        return;
      }

      await loadOffers();
    } catch (error) {
      console.error('Error deleting special offer:', error);
      alert('Failed to delete special offer');
    }
  };

  return (
    <>
      <Head>
        <title>Special Offers - Sales Email Assistant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="header">
        <div className="header-content">
          <div className="header-logo-container">
            <img 
              src="/logo.png" 
              alt="Company Logo" 
              className="header-logo"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <h1>Sales Email Assistant</h1>
          </div>
          <nav className="nav-links">
            <Link href="/">Compose</Link>
            <Link href="/history">History</Link>
            <Link href="/templates">Templates</Link>
            <Link href="/special-offers">Special Offers</Link>
          </nav>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2>Special Offers</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm);
                setEditingOffer(null);
                setFormData({ name: '', description: '' });
              }}
            >
              {showForm ? 'Cancel' : '+ New Offer'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div className="form-group">
                <label htmlFor="name">Offer Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 10% Discount - December Only"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Offer Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  placeholder="e.g., We're pleased to offer a 10% discount on the building costs if ordered this month only. Please note that the discount can be reverted to standard at any point due to material cost increases."
                />
              </div>

              <button type="submit" className="btn btn-primary">
                {editingOffer ? 'Update Offer' : 'Save Offer'}
              </button>
            </form>
          )}

          {offers.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              No special offers yet. Click "+ New Offer" to create one.
            </p>
          ) : (
            offers.map(offer => (
              <div key={offer.id} className="card" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '8px' }}>{offer.name}</h3>
                    <p style={{ color: '#555', whiteSpace: 'pre-wrap' }}>{offer.description}</p>
                    <small style={{ color: '#999', display: 'block', marginTop: '8px' }}>
                      Created: {new Date(offer.created_at).toLocaleDateString()}
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleEdit(offer)}
                      style={{ fontSize: '14px', padding: '6px 12px' }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleDelete(offer.id)}
                      style={{ fontSize: '14px', padding: '6px 12px', color: '#dc3545', borderColor: '#dc3545' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

