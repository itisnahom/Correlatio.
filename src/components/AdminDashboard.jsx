import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ShieldCheck,
  Users,
  Eye,
  Activity,
  Layers,
  BarChart3,
  Flame,
  Lock,
  RefreshCw,
  Search,
  Download,
  Clock,
  ArrowUpRight,
  Globe,
  Monitor,
  Smartphone,
  Compass,
  ExternalLink,
  Radio,
} from 'lucide-react';
import { signInWithGoogle, analyticsPromise } from '../firebase';
import { ADMIN_EMAILS, fetchAdminDashboardData } from '../utils/analytics';
import { CorrelatioLogo } from './Auth';
import { useToast, ToastPortal } from './Toast';

const ROUTE_LABELS = {
  dashboard: { label: 'Dashboard (Threads)', color: '#f59e0b' },
  thread_detail: { label: 'Thread Analytics', color: '#10b981' },
  lab: { label: 'The Lab (Discovery)', color: '#38bdf8' },
  tree: { label: 'Correlation Tree', color: '#a78bfa' },
  legal: { label: 'Privacy & Terms', color: '#f43f5e' },
  admin: { label: 'Admin Console', color: '#14b8a6' },
  poster: { label: 'Brand Poster', color: '#fb923c' },
  other: { label: 'Other Pages', color: '#a09b8c' },
};

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const toSortedBreakdown = (obj = {}, palette = ['#f59e0b', '#10b981', '#38bdf8', '#a78bfa', '#f43f5e', '#14b8a6']) => {
  const entries = Object.entries(obj)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({ label, count }));
  entries.sort((a, b) => b.count - a.count);
  const total = entries.reduce((sum, e) => sum + e.count, 0) || 1;
  return entries.map((e, idx) => ({
    ...e,
    pct: Math.round((e.count / total) * 100),
    color: palette[idx % palette.length],
  }));
};

const AdminDashboard = ({ user }) => {
  const { toasts, showToast } = useToast();

  const isOwnerEmail = Boolean(
    user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())
  );

  // Require explicit Google OAuth admin verification per session
  const [isVerified, setIsVerified] = useState(() => {
    if (!user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) return false;
    return sessionStorage.getItem('correlatio_admin_verified') === user.uid;
  });
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Dashboard telemetry state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState({});
  const [usersList, setUsersList] = useState([]);
  const [rulesRestricted, setRulesRestricted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'active24h' | 'creators' | 'streaks'
  const [gaConnected, setGaConnected] = useState(false);

  useEffect(() => {
    analyticsPromise
      .then((instance) => setGaConnected(Boolean(instance)))
      .catch(() => setGaConnected(false));
  }, []);

  useEffect(() => {
    if (user && isOwnerEmail && sessionStorage.getItem('correlatio_admin_verified') === user.uid) {
      setIsVerified(true);
    } else {
      setIsVerified(false);
    }
  }, [user, isOwnerEmail]);

  useEffect(() => {
    if (user && isOwnerEmail && isVerified) {
      loadAdminData();
    }
  }, [user, isOwnerEmail, isVerified]);

  const loadAdminData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchAdminDashboardData(user);
      setOverview(data.overview || {});
      setUsersList(data.users || []);
      setRulesRestricted(Boolean(data.rulesRestricted));
      if (isManualRefresh) {
        showToast('Live telemetry refreshed', 'success', 2200);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Could not load some telemetry data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setAuthError('');
    setVerifying(true);
    try {
      const signedInUser = await signInWithGoogle();
      if (signedInUser) {
        const email = (signedInUser.email || '').toLowerCase();
        if (ADMIN_EMAILS.includes(email)) {
          sessionStorage.setItem('correlatio_admin_verified', signedInUser.uid);
          setIsVerified(true);
          showToast('Admin identity verified', 'success');
        } else {
          setAuthError('Access denied: This Google account is not authorized as an administrator.');
        }
      }
    } catch {
      setAuthError('Google authentication was cancelled or failed.');
    } finally {
      setVerifying(false);
    }
  };

  const handleLockSession = () => {
    sessionStorage.removeItem('correlatio_admin_verified');
    setIsVerified(false);
    showToast('Admin session locked', 'info');
  };

  const handleExportUsersCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,';
    csv += 'Name,Email,UID,Threads,TotalLogs,CurrentStreak,LongestStreak,PageViews,Device,OS,Browser,TrafficSource,Timezone,LastRoute,LastSeen,Joined\n';
    usersList.forEach((u) => {
      csv += `"${u.displayName}","${u.email}","${u.uid}",${u.threadCount},${u.totalLogs},${u.currentStreak},${u.longestStreak},${u.totalViews},"${u.device || ''}","${u.os || ''}","${u.browser || ''}","${u.source || ''}","${u.timezone || ''}","${u.lastRoute}","${u.lastSeenISO || ''}","${u.createdAt || ''}"\n`;
    });
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `correlatio_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported user directory CSV', 'success');
  };

  // Computed metrics
  const metrics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const active24h = usersList.filter(
      (u) => u.lastSeenISO && now - new Date(u.lastSeenISO).getTime() <= dayMs
    ).length;
    const active7d = usersList.filter(
      (u) => u.lastSeenISO && now - new Date(u.lastSeenISO).getTime() <= 7 * dayMs
    ).length;

    const totalCustomThreads = usersList.reduce((sum, u) => sum + (u.threadCount || 0), 0);
    const activeSamples = usersList.filter((u) => u.sampleActive).length;
    const totalLogs = usersList.reduce((sum, u) => sum + (u.totalLogs || 0), 0);
    const maxStreak = usersList.reduce((max, u) => Math.max(max, u.longestStreak || u.currentStreak || 0), 0);

    const userViewsSum = usersList.reduce((sum, u) => sum + (u.totalViews || 0), 0);
    const totalViews = Math.max(overview.totalViews || 0, userViewsSum);
    const uniqueVisitors = Math.max(
      overview.uniqueVisitorsCount || 0,
      Array.isArray(overview.knownVisitors) ? overview.knownVisitors.length : 0,
      usersList.length
    );

    const recentSessions = Array.isArray(overview.recentSessions) ? overview.recentSessions : [];
    const liveNowCount = Math.max(
      1,
      recentSessions.filter((s) => s.timestamp && now - new Date(s.timestamp).getTime() <= 15 * 60 * 1000).length
    );

    const todayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const viewsToday = overview.viewsByDay?.[todayKey] || 0;

    return {
      totalUsers: usersList.length,
      uniqueVisitors,
      liveNowCount,
      active24h,
      active7d,
      totalCustomThreads,
      activeSamples,
      totalLogs,
      maxStreak,
      totalViews,
      viewsToday,
    };
  }, [usersList, overview]);

  // 14-day traffic chart data
  const dailyViewsData = useMemo(() => {
    const days = [];
    const today = new Date();
    const byDay = overview.viewsByDay || {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days.push({
        date: label,
        views: byDay[key] || 0,
      });
    }
    return days;
  }, [overview]);

  // Route popularity breakdown
  const routeBreakdown = useMemo(() => {
    const byPage = overview.viewsByPage || {};
    const entries = Object.entries(ROUTE_LABELS).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      color: cfg.color,
      count: byPage[key] || 0,
    }));
    entries.sort((a, b) => b.count - a.count);
    const maxCount = Math.max(...entries.map((e) => e.count), 1);
    return entries.map((e) => ({ ...e, pct: Math.round((e.count / maxCount) * 100) }));
  }, [overview]);

  // GA4 Web Telemetry Breakdowns
  const sourceBreakdown = useMemo(
    () => toSortedBreakdown(overview.viewsBySource, ['#f59e0b', '#38bdf8', '#10b981', '#a78bfa', '#f43f5e']),
    [overview]
  );
  const deviceBreakdown = useMemo(
    () => toSortedBreakdown(overview.viewsByDevice, ['#10b981', '#38bdf8', '#f59e0b']),
    [overview]
  );
  const osBreakdown = useMemo(
    () => toSortedBreakdown(overview.viewsByOS, ['#38bdf8', '#f59e0b', '#a78bfa', '#10b981', '#f43f5e']),
    [overview]
  );
  const browserBreakdown = useMemo(
    () => toSortedBreakdown(overview.viewsByBrowser, ['#f59e0b', '#10b981', '#38bdf8', '#a78bfa']),
    [overview]
  );
  const timezoneBreakdown = useMemo(
    () => toSortedBreakdown(overview.viewsByTimezone, ['#a78bfa', '#38bdf8', '#10b981', '#f59e0b', '#f43f5e']).slice(0, 6),
    [overview]
  );
  const recentSessions = useMemo(
    () => (Array.isArray(overview.recentSessions) ? overview.recentSessions.slice(0, 10) : []),
    [overview]
  );

  // Summary of pre-telemetry historical accounts (how many & when they were active)
  const historicalSummary = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const legacy = usersList.filter((u) => u.isHistorical);
    if (legacy.length === 0) return null;

    const validDates = legacy
      .flatMap((u) => [u.lastSeenISO, u.createdAt])
      .filter(Boolean)
      .map((iso) => new Date(iso))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    const earliestISO = validDates.length > 0 ? validDates[0].toISOString() : null;
    const latestISO = validDates.length > 0 ? validDates[validDates.length - 1].toISOString() : null;

    const active7d = legacy.filter(
      (u) => u.lastSeenISO && now - new Date(u.lastSeenISO).getTime() <= 7 * dayMs
    ).length;
    const active30d = legacy.filter(
      (u) => u.lastSeenISO && now - new Date(u.lastSeenISO).getTime() <= 30 * dayMs
    ).length;
    const threads = legacy.reduce((sum, u) => sum + (u.threadCount || 0), 0);
    const logs = legacy.reduce((sum, u) => sum + (u.totalLogs || 0), 0);

    return {
      count: legacy.length,
      earliestISO,
      latestISO,
      active7d,
      active30d,
      threads,
      logs,
    };
  }, [usersList]);

  // Filtered user list (clean: only identified user profiles, no unnamed pre-telemetry rows)
  const filteredUsers = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return usersList
      .filter((u) => !u.isHistorical)
      .filter((u) => {
        if (userFilter === 'active24h') {
          if (!u.lastSeenISO || now - new Date(u.lastSeenISO).getTime() > dayMs) return false;
        } else if (userFilter === 'creators') {
          if ((u.threadCount || 0) < 1) return false;
        } else if (userFilter === 'streaks') {
          if ((u.currentStreak || 0) < 1) return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (u.displayName || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.uid || '').toLowerCase().includes(q)
        );
      });
  }, [usersList, userFilter, searchQuery]);

  // ============================================================================
  // GATE: REQUIRE LOGIN & ADMIN SESSION VERIFICATION
  // ============================================================================
  if (!user || !isOwnerEmail || !isVerified) {
    return (
      <div className="fade-up" style={{ minHeight: '78vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div
          className="card"
          style={{
            maxWidth: '440px',
            width: '100%',
            padding: '36px 32px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, #151513 0%, #0e0e0d 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 252, 245, 0.06)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'var(--amber)',
              boxShadow: '0 0 28px rgba(245, 158, 11, 0.18)',
            }}
          >
            <Lock size={26} strokeWidth={1.8} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <CorrelatioLogo size={18} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)' }}>
              Restricted Access
            </span>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--text-1)' }}>
            Admin Command Center
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: '1.55', marginBottom: '24px' }}>
            {!user
              ? 'Authentication is required. Sign in with your administrator Google account to access platform metrics, views, and user insights.'
              : isOwnerEmail
              ? `Signed in as ${user.email}. Please verify your administrator Google session to unlock the console.`
              : `Signed in as ${user.email}. This account does not have administrator privileges.`}
          </p>

          {authError && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: 'var(--rose)',
                fontSize: '0.8rem',
                marginBottom: '18px',
              }}
            >
              {authError}
            </div>
          )}

          <button
            type="button"
            className="btn btn-amber"
            disabled={verifying}
            onClick={handleGoogleAdminLogin}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <ShieldCheck size={17} strokeWidth={2.2} style={{ marginRight: '8px' }} />
            {verifying
              ? 'Verifying Identity…'
              : !user || !isOwnerEmail
              ? 'Sign in with Google as Admin'
              : 'Verify Admin Identity with Google'}
          </button>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <Link to="/" style={{ color: 'var(--text-3)', fontSize: '0.8rem', textDecoration: 'none' }}>
              ← Return to Dashboard
            </Link>
          </div>
        </div>
        <ToastPortal toasts={toasts} />
      </div>
    );
  }

  // ============================================================================
  // VERIFIED ADMIN PROFILE & COMMAND CENTER
  // ============================================================================
  return (
    <div className="fade-up" style={{ paddingBottom: '64px' }}>
      {/* Top Admin Profile Card */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          marginTop: '20px',
          marginBottom: '24px',
          background:
            'radial-gradient(ellipse 65% 60% at 85% 20%, rgba(245, 158, 11, 0.12) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 80%), linear-gradient(180deg, #151412 0%, #0f0f0d 100%)',
          border: '1px solid rgba(245, 158, 11, 0.26)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: 0 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={user.photoURL}
              alt={user.displayName}
              referrerPolicy="no-referrer"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                border: '2px solid rgba(245, 158, 11, 0.5)',
                objectFit: 'cover',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              }}
            />
            <span
              className="pulsatile-dot"
              style={{
                '--dot-color': '#10b981',
                '--glow-color': 'rgba(16, 185, 129, 0.85)',
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '12px',
                height: '12px',
                border: '2px solid #0f0f0d',
              }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.45rem', margin: 0, color: 'var(--text-1)' }}>
                {user.displayName || 'Administrator'}
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: 'var(--emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                }}
              >
                <ShieldCheck size={12} strokeWidth={2.5} />
                Super Admin
              </span>
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span>{user.email}</span>
              <span style={{ color: 'var(--text-3)' }}>•</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.73rem',
                  fontFamily: 'monospace',
                  color: gaConnected ? 'var(--emerald)' : 'var(--amber)',
                  background: 'rgba(255, 252, 245, 0.04)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                }}
              >
                <span
                  className="pulsatile-dot"
                  style={{
                    '--dot-color': gaConnected ? '#10b981' : '#f59e0b',
                    '--glow-color': gaConnected ? 'rgba(16, 185, 129, 0.75)' : 'rgba(245, 158, 11, 0.6)',
                    width: '6px',
                    height: '6px',
                  }}
                />
                GA4 Stream: G-MND7KWEL7M ({gaConnected ? 'Connected' : 'Synced'})
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '0.8rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              color: 'var(--sky)',
            }}
          >
            <Globe size={14} strokeWidth={2.2} />
            GA4 Console
            <ExternalLink size={12} />
          </a>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={refreshing}
            onClick={() => loadAdminData(true)}
            style={{ borderRadius: '10px', padding: '9px 14px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} strokeWidth={2.2} style={{ marginRight: '6px' }} />
            {refreshing ? 'Refreshing…' : 'Refresh Live Data'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExportUsersCSV}
            style={{ borderRadius: '10px', padding: '9px 14px', fontSize: '0.8rem' }}
          >
            <Download size={14} strokeWidth={2.2} style={{ marginRight: '6px' }} />
            Export Users CSV
          </button>
          <button
            type="button"
            className="btn-danger-soft"
            onClick={handleLockSession}
            style={{ padding: '9px 14px', fontSize: '0.8rem' }}
          >
            <Lock size={14} strokeWidth={2.2} />
            Lock Console
          </button>
        </div>
      </div>

      {/* 6 Primary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Registered Users
            </span>
            <Users size={17} color="var(--amber)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {loading ? '—' : metrics.totalUsers}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--emerald)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={13} />
            {metrics.uniqueVisitors} total unique visitors
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Page Views
            </span>
            <Eye size={17} color="var(--sky)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {loading ? '—' : metrics.totalViews.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--sky)', marginTop: '6px' }}>
            +{metrics.viewsToday} views recorded today
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Active Users (7d)
            </span>
            <Activity size={17} color="var(--emerald)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {loading ? '—' : metrics.active7d}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '6px' }}>
            {metrics.liveNowCount} active in last 15m • {metrics.active24h} in 24h
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Custom Threads
            </span>
            <Layers size={17} color="#a78bfa" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {loading ? '—' : metrics.totalCustomThreads}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '6px' }}>
            +{metrics.activeSamples} starter sample threads active
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Logged Data Points
            </span>
            <BarChart3 size={17} color="var(--amber)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {loading ? '—' : metrics.totalLogs.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '6px' }}>
            Avg {metrics.totalUsers > 0 ? (metrics.totalLogs / metrics.totalUsers).toFixed(1) : '0.0'} logs / user
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Top Platform Streak
            </span>
            <Flame size={17} color="var(--rose)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
            {loading ? '—' : `${metrics.maxStreak}d`}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '6px' }}>
            Longest consecutive daily streak
          </div>
        </div>
      </div>

      {/* Traffic Chart + Feature Popularity Breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '18px',
          marginBottom: '20px',
        }}
      >
        {/* 14-Day Views Area Chart */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-1)' }}>Page Views (Last 14 Days)</h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Daily navigation & screen view activity synced with GA4
              </p>
            </div>
            <span className="sample-badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: 'var(--sky)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
              G-MND7KWEL7M
            </span>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyViewsData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminViewsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,252,245,0.04)" strokeDasharray="3 6" />
                <XAxis dataKey="date" tick={{ fill: '#706b60', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#706b60', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(12, 12, 11, 0.95)',
                    border: '1px solid rgba(255, 252, 245, 0.12)',
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Page Views"
                  stroke="#f59e0b"
                  strokeWidth={2.2}
                  fill="url(#adminViewsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Route / Feature Popularity */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-1)' }}>Views by Feature / Screen</h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
              Most visited sections of the application
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {routeBreakdown.map((item) => (
              <div key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ color: 'var(--text-1)', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {item.count.toLocaleString()}
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 252, 245, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(item.count > 0 ? 6 : 0, item.pct)}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: '99px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GA4 Web Telemetry: Traffic Sources, Devices/OS/Browsers, Regions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '18px',
          marginBottom: '20px',
        }}
      >
        {/* Traffic Acquisition / Sources */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', margin: 0, color: 'var(--text-1)' }}>Traffic Acquisition</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Referrers, search & UTM channels
              </p>
            </div>
            <Compass size={17} color="var(--amber)" />
          </div>
          {sourceBreakdown.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', padding: '16px 0' }}>No traffic source data yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {sourceBreakdown.map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.79rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {item.count} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({item.pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255, 252, 245, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(8, item.pct)}%`, height: '100%', background: item.color, borderRadius: '99px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices, OS & Browsers */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', margin: 0, color: 'var(--text-1)' }}>Devices & Platforms</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Form factor, OS & browser split
              </p>
            </div>
            <Monitor size={17} color="var(--emerald)" />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {deviceBreakdown.map((d) => (
              <div
                key={d.label}
                style={{
                  flex: '1 1 80px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255, 252, 245, 0.03)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '4px' }}>
                  {d.label === 'Mobile' ? <Smartphone size={12} color="var(--sky)" /> : <Monitor size={12} color="var(--emerald)" />}
                  {d.label}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
                  {d.pct}%
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {osBreakdown.slice(0, 4).map((os) => (
              <div key={os.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-2)' }}>OS: <strong style={{ color: 'var(--text-1)' }}>{os.label}</strong></span>
                <span style={{ color: 'var(--text-3)', fontFamily: "'Space Grotesk', sans-serif" }}>{os.count} views ({os.pct}%)</span>
              </div>
            ))}
            {browserBreakdown.length > 0 && (
              <div style={{ paddingTop: '8px', marginTop: '4px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {browserBreakdown.map((b) => (
                  <span
                    key={b.label}
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: 'rgba(255, 252, 245, 0.04)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-2)',
                    }}
                  >
                    {b.label}: {b.pct}%
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Regions / Timezones */}
        <div className="card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '0.96rem', margin: 0, color: 'var(--text-1)' }}>Visitor Regions</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Active geographic timezones
              </p>
            </div>
            <Globe size={17} color="#a78bfa" />
          </div>
          {timezoneBreakdown.length === 0 ? (
            <div style={{ color: 'var(--text-3)', fontSize: '0.8rem', padding: '16px 0' }}>No region telemetry recorded yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {timezoneBreakdown.map((tz) => (
                <div key={tz.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-2)', fontFamily: 'monospace' }}>{tz.label}</span>
                    <span style={{ color: 'var(--text-1)', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {tz.count} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({tz.pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '5px', background: 'rgba(255, 252, 245, 0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(8, tz.pct)}%`, height: '100%', background: tz.color, borderRadius: '99px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Visitor Session Stream (Includes Anonymous Guests & Logged-In Users) */}
      {recentSessions.length > 0 && (
        <div className="card" style={{ padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radio size={16} color="var(--emerald)" />
              <h3 style={{ fontSize: '0.98rem', margin: 0, color: 'var(--text-1)' }}>
                Real-Time Visitor Stream (Recent Sessions)
              </h3>
            </div>
            <span style={{ fontSize: '0.73rem', color: 'var(--text-3)' }}>
              Tracks both signed-in members and anonymous landing-page visitors
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
            {recentSessions.slice(0, 6).map((s) => (
              <div
                key={s.visitorId + s.timestamp}
                style={{
                  padding: '11px 14px',
                  borderRadius: '12px',
                  background: 'rgba(255, 252, 245, 0.025)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.displayName || 'Guest Visitor'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>
                    {s.device} · {s.os} · {s.browser}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--amber)', marginTop: '2px', fontFamily: 'monospace' }}>
                    {s.route} • via {s.source}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--emerald)', fontWeight: 600 }}>
                    {formatRelativeTime(s.timestamp)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'monospace', marginTop: '2px' }}>
                    {(s.timezone || '').split('/').pop()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered Users Directory Table */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Registered Users Directory
              <span className="section-count">{filteredUsers.length} shown</span>
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', margin: '3px 0 0' }}>
              Privacy-safe view: shows account status and aggregate activity counts without exposing private habit names or journal notes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search
                size={14}
                color="var(--text-3)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input"
                placeholder="Search name, email, or UID…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '34px', height: '36px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'active24h', label: 'Active 24h' },
                { id: 'creators', label: 'Created Threads' },
                { id: 'streaks', label: 'Active Streak' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setUserFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: userFilter === f.id ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid var(--border)',
                    background: userFilter === f.id ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                    color: userFilter === f.id ? 'var(--amber)' : 'var(--text-2)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {rulesRestricted && (
          <div
            style={{
              padding: '14px 18px',
              marginBottom: '18px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: '1.5', flex: '1 1 320px' }}>
              <strong style={{ color: 'var(--amber)' }}>Firestore Security Rules Notice:</strong> Your Firebase project currently restricts accounts to reading only their own <code style={{ color: 'var(--text-1)' }}>users/&#123;uid&#125;</code> path. To let your admin account (<code style={{ color: 'var(--text-1)' }}>itisnahom@gmail.com</code>) list all users and global telemetry in Firebase Console → Firestore Database → Rules, copy the rule snippet.
            </div>
            <button
              type="button"
              className="btn btn-amber"
              style={{ borderRadius: '9px', padding: '8px 14px', fontSize: '0.76rem', fontWeight: 700 }}
              onClick={() => {
                const ruleSnippet = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    function isAdmin() {\n      return request.auth != null && request.auth.token.email == "itisnahom@gmail.com";\n    }\n    match /analytics/{docId} {\n      allow read: if isAdmin();\n      allow write: if true;\n    }\n    match /{path=**}/chains/{chainId} {\n      allow read: if isAdmin();\n    }\n    match /users/{userId} {\n      allow read: if (request.auth != null && request.auth.uid == userId) || isAdmin();\n      allow write: if request.auth != null && request.auth.uid == userId;\n      match /{document=**} {\n        allow read: if (request.auth != null && request.auth.uid == userId) || isAdmin();\n        allow write: if request.auth != null && request.auth.uid == userId;\n      }\n    }\n  }\n}`;
                navigator.clipboard.writeText(ruleSnippet);
                showToast('Copied Firestore Admin Rules to clipboard!', 'success');
              }}
            >
              Copy Firestore Admin Rules
            </button>
          </div>
        )}

        {historicalSummary && (
          <div
            style={{
              padding: '13px 16px',
              marginBottom: '18px',
              borderRadius: '12px',
              background: 'rgba(255, 252, 245, 0.025)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  background: 'rgba(245, 158, 11, 0.14)',
                  color: 'var(--amber)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                +{historicalSummary.count} Pre-Telemetry Accounts
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
                {historicalSummary.latestISO ? (
                  <>
                    Last active <strong style={{ color: 'var(--text-1)' }}>{formatRelativeTime(historicalSummary.latestISO)}</strong>
                    {' '}({formatShortDate(historicalSummary.earliestISO)} – {formatShortDate(historicalSummary.latestISO)})
                  </>
                ) : (
                  'Signed in prior to telemetry tracking'
                )}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.76rem', color: 'var(--text-3)', flexWrap: 'wrap' }}>
              <span>
                Active 7d: <strong style={{ color: 'var(--text-1)' }}>{historicalSummary.active7d}</strong>
              </span>
              <span>•</span>
              <span>
                Active 30d: <strong style={{ color: 'var(--text-1)' }}>{historicalSummary.active30d}</strong>
              </span>
              <span>•</span>
              <span>
                <strong style={{ color: 'var(--text-1)' }}>{historicalSummary.threads}</strong> threads &{' '}
                <strong style={{ color: 'var(--text-1)' }}>{historicalSummary.logs}</strong> logs
              </span>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '12px 10px' }}>User</th>
                <th style={{ padding: '12px 10px' }}>Status / Last Seen</th>
                <th style={{ padding: '12px 10px' }}>Custom Threads</th>
                <th style={{ padding: '12px 10px' }}>Total Logs</th>
                <th style={{ padding: '12px 10px' }}>Streak</th>
                <th style={{ padding: '12px 10px' }}>Environment & Region</th>
                <th style={{ padding: '12px 10px' }}>Views & Last Route</th>
                <th style={{ padding: '12px 10px' }}>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
                    Loading user directory…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
                    No users match the current filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isOnlineRecently =
                    u.lastSeenISO && Date.now() - new Date(u.lastSeenISO).getTime() <= 24 * 60 * 60 * 1000;
                  const isUserAdmin = ADMIN_EMAILS.includes((u.email || '').toLowerCase());

                  return (
                    <tr
                      key={u.uid}
                      style={{
                        borderBottom: '1px solid rgba(255, 252, 245, 0.04)',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt=""
                              referrerPolicy="no-referrer"
                              style={{ width: '34px', height: '34px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: 'rgba(245, 158, 11, 0.14)',
                                color: 'var(--amber)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {(u.displayName || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.displayName}</span>
                              {isUserAdmin && (
                                <span className="sample-badge" style={{ fontSize: '0.58rem', padding: '1px 6px' }}>
                                  Admin
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="pulsatile-dot"
                            style={{
                              '--dot-color': isOnlineRecently ? '#10b981' : '#706b60',
                              '--glow-color': isOnlineRecently ? 'rgba(16, 185, 129, 0.7)' : 'transparent',
                              width: '7px',
                              height: '7px',
                            }}
                          />
                          <span style={{ color: isOnlineRecently ? 'var(--text-1)' : 'var(--text-3)', fontWeight: isOnlineRecently ? 600 : 400 }}>
                            {formatRelativeTime(u.lastSeenISO)}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '14px 10px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-1)', fontFamily: "'Space Grotesk', sans-serif" }}>
                          {u.threadCount}
                        </span>
                        {u.sampleActive && (
                          <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: 'var(--text-3)' }}>
                            (+1 sample)
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 10px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", color: 'var(--text-1)' }}>
                        {u.totalLogs}
                      </td>

                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: u.currentStreak > 0 ? 'var(--amber)' : 'var(--text-3)', fontWeight: 600 }}>
                          <Flame size={13} />
                          {u.currentStreak}d
                          {u.longestStreak > u.currentStreak && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 400 }}>
                              (best {u.longestStreak}d)
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ color: 'var(--text-2)', fontSize: '0.78rem', fontWeight: 500 }}>
                          {u.os || '—'} · {u.browser || '—'}
                        </div>
                        <div style={{ fontSize: '0.69rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                          {u.timezone || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 10px' }}>
                        <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>{u.totalViews} views</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                          {u.lastRoute}
                        </div>
                      </td>

                      <td style={{ padding: '14px 10px', color: 'var(--text-3)', fontSize: '0.76rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {formatShortDate(u.createdAt)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastPortal toasts={toasts} />
    </div>
  );
};

export default AdminDashboard;
