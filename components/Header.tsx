import { useState, useEffect } from 'react';
import Link from 'next/link';
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
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
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
          <Link href="/special-offers">Offers</Link>
          {user && (
            <Link href="/profile">Profile</Link>
          )}
        </nav>
        <div className="header-user">
          {loading ? (
            <span style={{ color: '#666' }}>Loading...</span>
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ color: '#333' }}>
                {user.name} {user.role === 'admin' && <span style={{ color: '#666', fontSize: '0.9em' }}>(Admin)</span>}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.9em' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.9em' }}>
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

