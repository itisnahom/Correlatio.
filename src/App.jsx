import React, { useState, useEffect } from 'react';
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
import { Layers, FlaskConical, Network, LogOut, Menu } from 'lucide-react';
import './App.css';

function Navbar({ user }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const location = useLocation();
  const handleLogout = async () => { try { await logout(); } catch (e) { console.error(e); } };

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
              <button className="nav-dropdown-item" onClick={handleLogout}>
                <LogOut size={14} strokeWidth={2} /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
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
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
