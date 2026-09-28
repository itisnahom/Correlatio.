import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { logout } from './firebase';
import { CorrelatioLogo } from './components/Auth';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ChainDetail from './components/ChainDetail';
import Basket from './components/Basket';
import Tree from './components/Tree';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import Poster from './components/Poster';
import AdminDashboard from './components/AdminDashboard';
import { Layers, FlaskConical, Network, LogOut, Menu, Download, UserX } from 'lucide-react';
import { exportUserDataCSV, deleteUserAccount } from './utils/userManagement';
import { trackPageView } from './utils/analytics';
import './App.css';

function PageTracker({ user }) {
  const location = useLocation();
  const lastTrackedRef = useRef('');

  useEffect(() => {
    const key = `${user?.uid || 'anon'}:${location.pathname}`;
    if (lastTrackedRef.current === key) return;
    lastTrackedRef.current = key;
    trackPageView(user, location.pathname);
  }, [location.pathname, user?.uid]);

  return null;
}

function Navbar({ user }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const location = useLocation();
  const handleLogout = async () => { try { await logout(); } catch (e) { console.error(e); } };

  if (location.pathname.startsWith('/adminadminadmin')) return null;

  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteUserAccount(user.uid);
    } catch (e) {
      console.error(e);
      setIsDeletingAccount(false);
      setShowDeleteAccountModal(false);
    }
  };

  const navLink = (to, icon, label) => {
    const active = location.pathname === to;
    return (
      <Link to={to} className={`nav-link${active ? ' nav-link-active' : ''}`}>
        <span className="nav-link-icon">{icon}</span>
        <span className="nav-link-text">{label}</span>
      </Link>
    );
  };

  return (
    <>
    <nav className="navbar">
      <div className="nav-left">
        <button className="mobile-menu-btn" onClick={() => setShowMobileNav(!showMobileNav)}>
          <Menu size={18} color="var(--text-2)" />
        </button>
        <Link to="/" className="nav-brand">
          <CorrelatioLogo size={18} />
          <span className="nav-brand-name">Correlatio.</span>
        </Link>
        <div className="desktop-nav-links">
          <span className="nav-sep" />
          {navLink('/', <Layers size={13} strokeWidth={2.2} />, 'Threads')}
          {navLink('/lab', <FlaskConical size={13} strokeWidth={2.2} />, 'Lab')}
          {navLink('/tree', <Network size={13} strokeWidth={2.2} />, 'Tree')}
        </div>
      </div>

      {showMobileNav && (
        <>
          <div className="nav-menu-overlay" onClick={() => setShowMobileNav(false)} />
          <div className="nav-dropdown scale-in nav-mobile-dropdown">
            <Link to="/" className="nav-dropdown-item" onClick={() => setShowMobileNav(false)}>
              <Layers size={15} strokeWidth={2} /> Threads
            </Link>
            <Link to="/lab" className="nav-dropdown-item" onClick={() => setShowMobileNav(false)}>
              <FlaskConical size={15} strokeWidth={2} /> Lab
            </Link>
            <Link to="/tree" className="nav-dropdown-item" onClick={() => setShowMobileNav(false)}>
              <Network size={15} strokeWidth={2} /> Tree
            </Link>
          </div>
        </>
      )}

      <div className="nav-user-wrap">
        <button className="nav-avatar-btn" onClick={() => setShowMenu(!showMenu)}>
          <img src={user.photoURL} alt="" className="nav-avatar" referrerPolicy="no-referrer" />
        </button>
        {showMenu && (
          <>
            <div className="nav-menu-overlay" onClick={() => setShowMenu(false)} />
            <div className="nav-dropdown scale-in">
              <div className="nav-dropdown-user">
                <img src={user.photoURL} alt="" className="nav-dropdown-avatar" referrerPolicy="no-referrer" />
                <div>
                  <div className="nav-dropdown-name">{user.displayName}</div>
                  <div className="nav-dropdown-email">{user.email}</div>
                </div>
              </div>
              <div className="nav-dropdown-divider" />
              <button className="nav-dropdown-item" onClick={async () => {
                setShowMenu(false);
                await exportUserDataCSV(user.uid);
              }}>
                <Download size={14} strokeWidth={2} /> Export Data (CSV)
              </button>
              <button className="nav-dropdown-item" style={{ color: 'var(--rose)' }} onClick={() => {
                setShowMenu(false);
                setShowDeleteAccountModal(true);
              }}>
                <UserX size={14} strokeWidth={2} /> Delete Account
              </button>
              <div className="nav-dropdown-divider" />
              <button className="nav-dropdown-item" onClick={handleLogout}>
                <LogOut size={14} strokeWidth={2} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>

    {showDeleteAccountModal && (
      <div className="glass-overlay" onClick={e => e.target === e.currentTarget && !isDeletingAccount && setShowDeleteAccountModal(false)}>
        <div className="modal scale-in" style={{ textAlign: 'center', padding: '32px 24px', maxWidth: '420px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.28)',
            boxShadow: '0 0 28px rgba(244, 63, 94, 0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--rose)', margin: '0 auto 20px'
          }}>
            <UserX size={28} strokeWidth={1.8} />
          </div>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '10px', color: 'var(--text-1)' }}>
            Delete Your Account?
          </h3>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: '1.55', margin: '0 auto 26px', maxWidth: '330px' }}>
            This will permanently erase your account, all of your active threads, and every logged data point. <strong>This action cannot be undone.</strong>
          </p>
          <div className="form-actions" style={{ gap: '10px' }}>
            <button
              type="button"
              className="btn"
              disabled={isDeletingAccount}
              onClick={handleConfirmDeleteAccount}
              style={{
                flex: 1, borderRadius: '10px', padding: '12px 16px',
                background: 'var(--rose)', color: '#fff', border: 'none',
                fontWeight: 600, boxShadow: '0 4px 16px rgba(244, 63, 94, 0.3)'
              }}
            >
              {isDeletingAccount ? 'Deleting Account…' : 'Yes, Delete Everything'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isDeletingAccount}
              onClick={() => setShowDeleteAccountModal(false)}
              style={{ borderRadius: '10px', padding: '12px 18px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsub();
  }, []);

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Loading…</span>
    </div>
  );

  return (
    <Router>
      <PageTracker user={user} />
      <div className="app-shell">
        {user && <Navbar user={user} />}
        <div className="app-content">
          <Routes>
            <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Auth user={user} /> : <Navigate to="/" />} />
            <Route path="/chain/:chainId" element={user ? <ChainDetail user={user} /> : <Navigate to="/login" />} />
            <Route path="/lab" element={user ? <Basket user={user} /> : <Navigate to="/login" />} />
            <Route path="/basket" element={<Navigate to="/lab" />} />
            <Route path="/tree" element={user ? <Tree user={user} /> : <Navigate to="/login" />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/poster" element={<Poster />} />
            <Route path="/adminadminadmin" element={<AdminDashboard user={user} />} />
            <Route path="/admin" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
