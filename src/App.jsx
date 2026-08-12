import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { logout } from './firebase';
import { CorrelatioLogo } from './components/Auth';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ChainDetail from './components/ChainDetail';
import './App.css';

function Navbar({ user }) {
  const handleLogout = async () => { try { await logout(); } catch (e) { console.error(e); } };
  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <CorrelatioLogo size={18} />
        <span className="nav-brand-name">Correlatio</span>
      </Link>
      <div className="nav-user">
        <img src={user.photoURL} alt="" className="nav-avatar" referrerPolicy="no-referrer" />
        <span className="nav-username">{user.displayName?.split(' ')[0]}</span>
        <span className="nav-sep" />
        <button className="nav-signout" onClick={handleLogout}>Sign out</button>
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
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
