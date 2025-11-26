import { useState, useEffect } from 'react';
import Head from 'next/head';
import Header from '@/components/Header';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/router';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  signature_name?: string;
  signature_title?: string;
  signature_phone?: string;
  signature_email?: string;
  signature_company?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUsers() {
  const router = useRouter();
  const { user, loading } = useAuth(true);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role !== 'admin') {
        router.push('/');
        return;
      }
      loadUsers();
    }
  }, [user, loading]);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        setMessage({ type: 'error', text: 'Failed to load users' });
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (!formData.email || !formData.name) {
      setMessage({ type: 'error', text: 'Email and name are required' });
      setSaving(false);
      return;
    }

    if (!editingUser && !formData.password) {
      setMessage({ type: 'error', text: 'Password is required for new users' });
      setSaving(false);
      return;
    }

    try {
      const url = editingUser ? `/api/admin/users?id=${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: editingUser ? 'User updated!' : 'User created!' });
        setFormData({ email: '', name: '', password: '', role: 'user' });
        setEditingUser(null);
        setShowForm(false);
        loadUsers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save user' });
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      setMessage({ type: 'error', text: 'Failed to save user' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      name: userToEdit.name,
      password: '', // Don't pre-fill password
      role: userToEdit.role,
    });
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'User deleted!' });
        loadUsers();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete user' });
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setMessage({ type: 'error', text: 'Failed to delete user' });
    }
  };

  if (loading || loadingUsers) {
    return (
      <>
        <Head>
          <title>User Management - Sales Email Assistant</title>
        </Head>
        <Header />
        <div className="container">
          <div className="card">
            <p>Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (user?.role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
        <title>User Management - Sales Email Assistant</title>
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
            <h2>User Management</h2>
            <button
              className="btn btn-primary"
              onClick={() => {
                setShowForm(!showForm);
                setEditingUser(null);
                setFormData({ email: '', name: '', password: '', role: 'user' });
              }}
            >
              {showForm ? 'Cancel' : '+ New User'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '24px', padding: '20px', background: '#f8f9fa', borderRadius: '6px' }}>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingUser}
                  placeholder="user@example.com"
                />
                {editingUser && <small style={{ color: '#666' }}>Email cannot be changed</small>}
              </div>

              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="User's full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  Password {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!editingUser}
                  minLength={6}
                  placeholder={editingUser ? "Leave blank to keep current password" : "Minimum 6 characters"}
                />
                {editingUser && <small style={{ color: '#666' }}>Leave blank to keep current password</small>}
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
            </form>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{u.name}</td>
                    <td style={{ padding: '12px' }}>{u.email}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`status-badge status-${u.role}`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '0.9em' }}>
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleEdit(u)}
                          style={{ padding: '6px 12px', fontSize: '0.9em' }}
                        >
                          Edit
                        </button>
                        {u.id !== user?.id && (
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDelete(u.id)}
                            style={{ padding: '6px 12px', fontSize: '0.9em' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !loadingUsers && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
              No users found. Click "+ New User" to create one.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

