import { db, logAnalyticsEvent } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  collectionGroup,
  getDocs,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

export const ADMIN_EMAILS = [
  'itisnahom@gmail.com',
  ...(import.meta.env.VITE_ADMIN_EMAIL ? [import.meta.env.VITE_ADMIN_EMAIL.toLowerCase()] : []),
];

export const isAdminUser = (user) => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase();
  return ADMIN_EMAILS.includes(email);
};

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const normalizeRouteKey = (pathname) => {
  if (!pathname || pathname === '/') return 'dashboard';
  if (pathname.startsWith('/chain/')) return 'thread_detail';
  if (pathname.startsWith('/lab') || pathname.startsWith('/basket')) return 'lab';
  if (pathname.startsWith('/tree')) return 'tree';
  if (pathname.startsWith('/privacy') || pathname.startsWith('/terms')) return 'legal';
  if (pathname.startsWith('/adminadminadmin')) return 'admin';
  if (pathname.startsWith('/poster')) return 'poster';
  return 'other';
};

const getVisitorId = () => {
  try {
    let vid = localStorage.getItem('correlatio_vid');
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('correlatio_vid', vid);
    }
    return vid;
  } catch {
    return 'v_anon';
  }
};

const getClientEnvironment = () => {
  if (typeof window === 'undefined') {
    return {
      device: 'Desktop',
      os: 'Unknown',
      browser: 'Unknown',
      source: 'Direct',
      timezone: 'UTC',
    };
  }

  const ua = navigator.userAgent || '';

  // Device category
  let device = 'Desktop';
  if (/Mobi|Android.*Mobile|iPhone|iPod/i.test(ua) || window.innerWidth < 768) {
    device = 'Mobile';
  } else if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) {
    device = 'Tablet';
  }

  // Operating System
  let os = 'Other';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Browser
  let browser = 'Other';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  // Acquisition / Traffic Source (check session cache first so internal SPA navigation keeps initial referrer)
  let source = 'Direct';
  try {
    const cachedSource = sessionStorage.getItem('correlatio_traffic_source');
    if (cachedSource) {
      source = cachedSource;
    } else {
      const params = new URLSearchParams(window.location.search);
      const utmSource = params.get('utm_source') || params.get('ref');
      const ref = document.referrer || '';

      if (utmSource) {
        source = utmSource.trim();
      } else if (ref) {
        try {
          const refUrl = new URL(ref);
          const host = refUrl.hostname.replace(/^www\./, '').toLowerCase();
          if (host && host !== window.location.hostname.toLowerCase()) {
            if (host.includes('google.')) source = 'Google Search';
            else if (host.includes('bing.')) source = 'Bing Search';
            else if (host.includes('t.co') || host.includes('twitter.') || host.includes('x.com')) source = 'Twitter / X';
            else if (host.includes('github.')) source = 'GitHub';
            else if (host.includes('reddit.')) source = 'Reddit';
            else if (host.includes('linkedin.')) source = 'LinkedIn';
            else if (host.includes('instagram.')) source = 'Instagram';
            else if (host.includes('youtube.')) source = 'YouTube';
            else if (host.includes('producthunt.')) source = 'Product Hunt';
            else source = host;
          }
        } catch {
          source = 'Direct';
        }
      }
      sessionStorage.setItem('correlatio_traffic_source', source);
    }
  } catch {
    source = 'Direct';
  }

  // Timezone / Region
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    timezone = 'UTC';
  }

  return { device, os, browser, source, timezone };
};

const LOCAL_TELEMETRY_KEY = 'correlatio_telemetry_overview_v1';

const readLocalTelemetry = () => {
  try {
    const raw = localStorage.getItem(LOCAL_TELEMETRY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeLocalTelemetry = (data) => {
  try {
    localStorage.setItem(LOCAL_TELEMETRY_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
};

const buildNextOverviewPayload = (existing = {}, { routeKey, todayKey, visitorId, env, user, pathname }) => {
  const totalViews = (existing.totalViews || 0) + 1;

  const viewsByPage = { ...existing.viewsByPage };
  viewsByPage[routeKey] = (viewsByPage[routeKey] || 0) + 1;

  const viewsByDay = { ...existing.viewsByDay };
  viewsByDay[todayKey] = (viewsByDay[todayKey] || 0) + 1;

  const viewsBySource = { ...existing.viewsBySource };
  viewsBySource[env.source] = (viewsBySource[env.source] || 0) + 1;

  const viewsByDevice = { ...existing.viewsByDevice };
  viewsByDevice[env.device] = (viewsByDevice[env.device] || 0) + 1;

  const viewsByOS = { ...existing.viewsByOS };
  viewsByOS[env.os] = (viewsByOS[env.os] || 0) + 1;

  const viewsByBrowser = { ...existing.viewsByBrowser };
  viewsByBrowser[env.browser] = (viewsByBrowser[env.browser] || 0) + 1;

  const viewsByTimezone = { ...existing.viewsByTimezone };
  viewsByTimezone[env.timezone] = (viewsByTimezone[env.timezone] || 0) + 1;

  const knownVisitors = Array.isArray(existing.knownVisitors) ? [...existing.knownVisitors] : [];
  if (!knownVisitors.includes(visitorId)) {
    knownVisitors.push(visitorId);
    if (knownVisitors.length > 500) knownVisitors.shift();
  }

  const prevSessions = Array.isArray(existing.recentSessions) ? existing.recentSessions : [];
  const sessionEntry = {
    visitorId,
    uid: user?.uid || null,
    displayName: user?.displayName || 'Guest Visitor',
    email: user?.email || null,
    photoURL: user?.photoURL || null,
    route: pathname || '/',
    routeKey,
    device: env.device,
    os: env.os,
    browser: env.browser,
    source: env.source,
    timezone: env.timezone,
    timestamp: new Date().toISOString(),
  };
  const filteredSessions = prevSessions.filter((s) => s.visitorId !== visitorId);
  const recentSessions = [sessionEntry, ...filteredSessions].slice(0, 20);

  return {
    measurementId: 'G-MND7KWEL7M',
    totalViews,
    uniqueVisitorsCount: knownVisitors.length,
    knownVisitors,
    viewsByPage,
    viewsByDay,
    viewsBySource,
    viewsByDevice,
    viewsByOS,
    viewsByBrowser,
    viewsByTimezone,
    recentSessions,
    updatedAtISO: new Date().toISOString(),
  };
};

/**
 * Syncs basic user profile metadata and page view telemetry to Firestore and GA4.
 */
export const trackPageView = async (user, pathname) => {
  try {
    const todayKey = getTodayKey();
    const routeKey = normalizeRouteKey(pathname);
    const visitorId = getVisitorId();
    const env = getClientEnvironment();

    // 0. Forward SPA route view to Google Analytics 4 (G-MND7KWEL7M)
    logAnalyticsEvent('page_view', {
      page_path: pathname || '/',
      page_title: routeKey,
      device_category: env.device,
      traffic_source: env.source,
      time_zone: env.timezone,
      user_type: user?.uid ? 'authenticated' : 'guest',
    });

    // 1. Always update local telemetry cache immediately so guest & SPA navigations are never lost
    const localExisting = readLocalTelemetry();
    const nextLocal = buildNextOverviewPayload(localExisting, {
      routeKey,
      todayKey,
      visitorId,
      env,
      user,
      pathname,
    });
    writeLocalTelemetry(nextLocal);

    // 2. Try global analytics/overview document (works when global rules are enabled)
    const overviewRef = doc(db, 'analytics', 'overview');
    const overviewSnap = await getDoc(overviewRef).catch(() => null);
    if (overviewSnap) {
      const globalExisting = overviewSnap.exists() ? overviewSnap.data() : localExisting;
      const nextGlobal = buildNextOverviewPayload(globalExisting, {
        routeKey,
        todayKey,
        visitorId,
        env,
        user,
        pathname,
      });
      await setDoc(
        overviewRef,
        {
          ...nextGlobal,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }

    // 3. If user is authenticated, sync to users/{uid} AND users/{uid}/meta/telemetry
    //    (These paths are always permitted by standard `match /users/{userId}/{document=**}` rules!)
    if (user?.uid) {
      const userTelemetryRef = doc(db, 'users', user.uid, 'meta', 'telemetry');
      const userTelemetrySnap = await getDoc(userTelemetryRef).catch(() => null);
      const baseTelemetry =
        userTelemetrySnap && userTelemetrySnap.exists() ? userTelemetrySnap.data() : localExisting;

      const nextUserTelemetry = buildNextOverviewPayload(baseTelemetry, {
        routeKey,
        todayKey,
        visitorId,
        env,
        user,
        pathname,
      });

      await setDoc(
        userTelemetryRef,
        {
          ...nextUserTelemetry,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});

      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: user.displayName || 'User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: user.metadata?.creationTime || null,
          lastSignInTime: user.metadata?.lastSignInTime || null,
          lastSeenAt: serverTimestamp(),
          lastSeenISO: new Date().toISOString(),
          lastRoute: pathname || '/',
          device: env.device,
          os: env.os,
          browser: env.browser,
          source: env.source,
          timezone: env.timezone,
          totalViews: increment(1),
        },
        { merge: true }
      ).catch(() => {});
    }
  } catch {
    // Telemetry should never disrupt user experience
  }
};

/**
 * Updates aggregate thread and log counts on the user's root document (privacy-safe: counts only).
 */
export const syncUserAggregateStats = async (user, { threadCount, sampleActive, totalLogs, currentStreak, longestStreak }) => {
  if (!user?.uid) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: user.metadata?.creationTime || null,
        lastSignInTime: user.metadata?.lastSignInTime || null,
        lastSeenAt: serverTimestamp(),
        lastSeenISO: new Date().toISOString(),
        threadCount: threadCount ?? 0,
        sampleActive: Boolean(sampleActive),
        totalLogs: totalLogs ?? 0,
        currentStreak: currentStreak ?? 0,
        longestStreak: longestStreak ?? 0,
      },
      { merge: true }
    );
  } catch {
    // Ignore if offline or restricted
  }
};

const computeStreakFromDates = (dateStrings) => {
  if (!dateStrings || dateStrings.length === 0) return { current: 0, longest: 0 };
  const uniqueDays = Array.from(
    new Set(
      dateStrings
        .map((iso) => {
          const d = new Date(iso);
          if (isNaN(d.getTime())) return null;
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })
        .filter(Boolean)
    )
  ).sort();

  if (uniqueDays.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const todayKey = getTodayKey();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

  const lastDay = uniqueDays[uniqueDays.length - 1];
  if (lastDay !== todayKey && lastDay !== yesterdayKey) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let i = uniqueDays.length - 1; i > 0; i--) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((curr - prev) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) current += 1;
    else break;
  }

  return { current, longest: Math.max(longest, current) };
};

/**
 * Fetches full admin telemetry, user directory, and aggregate platform metrics.
 */
export const fetchAdminDashboardData = async (currentUser) => {
  const env = getClientEnvironment();

  // Ensure current admin user and overview telemetry are synced first
  if (currentUser?.uid) {
    await trackPageView(currentUser, window.location?.pathname || '/adminadminadmin');
  }

  let rulesRestricted = false;

  const [globalOverviewSnap, userTelemetrySnap, usersSnap, allChainsGroupSnap, ownUserSnap] = await Promise.all([
    getDoc(doc(db, 'analytics', 'overview')).catch(() => null),
    currentUser?.uid ? getDoc(doc(db, 'users', currentUser.uid, 'meta', 'telemetry')).catch(() => null) : Promise.resolve(null),
    getDocs(collection(db, 'users')).catch((err) => {
      if (err?.code === 'permission-denied') rulesRestricted = true;
      return null;
    }),
    getDocs(collectionGroup(db, 'chains')).catch(() => null),
    currentUser?.uid ? getDoc(doc(db, 'users', currentUser.uid)).catch(() => null) : Promise.resolve(null),
  ]);

  const localOverview = readLocalTelemetry();
  const userOverview = userTelemetrySnap && userTelemetrySnap.exists() ? userTelemetrySnap.data() : {};
  const globalOverview = globalOverviewSnap && globalOverviewSnap.exists() ? globalOverviewSnap.data() : {};

  // Pick the most complete overview source and merge maps
  const overview = {
    ...localOverview,
    ...userOverview,
    ...globalOverview,
    totalViews: Math.max(
      globalOverview.totalViews || 0,
      userOverview.totalViews || 0,
      localOverview.totalViews || 0,
      1
    ),
    viewsByPage: {
      ...localOverview.viewsByPage,
      ...userOverview.viewsByPage,
      ...globalOverview.viewsByPage,
    },
    viewsByDay: {
      ...localOverview.viewsByDay,
      ...userOverview.viewsByDay,
      ...globalOverview.viewsByDay,
    },
    viewsBySource: {
      ...localOverview.viewsBySource,
      ...userOverview.viewsBySource,
      ...globalOverview.viewsBySource,
    },
    viewsByDevice: {
      ...localOverview.viewsByDevice,
      ...userOverview.viewsByDevice,
      ...globalOverview.viewsByDevice,
    },
    viewsByOS: {
      ...localOverview.viewsByOS,
      ...userOverview.viewsByOS,
      ...globalOverview.viewsByOS,
    },
    viewsByBrowser: {
      ...localOverview.viewsByBrowser,
      ...userOverview.viewsByBrowser,
      ...globalOverview.viewsByBrowser,
    },
    viewsByTimezone: {
      ...localOverview.viewsByTimezone,
      ...userOverview.viewsByTimezone,
      ...globalOverview.viewsByTimezone,
    },
    recentSessions:
      (Array.isArray(globalOverview.recentSessions) && globalOverview.recentSessions.length > 0
        ? globalOverview.recentSessions
        : Array.isArray(userOverview.recentSessions) && userOverview.recentSessions.length > 0
        ? userOverview.recentSessions
        : localOverview.recentSessions) || [],
  };

  // Map user documents by UID (combines /users docs + phantom parent UIDs discovered via collectionGroup('chains'))
  const toIsoString = (val) => {
    if (!val) return null;
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (typeof val?.toDate === 'function') {
      return val.toDate().toISOString();
    }
    if (typeof val?.seconds === 'number') {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString();
    }
    return null;
  };

  const userDocsMap = new Map();

  if (usersSnap && Array.isArray(usersSnap.docs)) {
    usersSnap.docs.forEach((d) => {
      const dData = d.data() || {};
      userDocsMap.set(d.id, {
        ...dData,
        isHistorical: !dData.email,
      });
    });
  }

  // Also discover historical users who created chains before /users/{uid} root docs were written
  if (allChainsGroupSnap && Array.isArray(allChainsGroupSnap.docs)) {
    allChainsGroupSnap.docs.forEach((chainDoc) => {
      const parentUserRef = chainDoc.ref.parent?.parent;
      const uid = parentUserRef?.id;
      const cData = chainDoc.data() || {};
      const chainCreatedISO = toIsoString(cData.createdAt);

      if (uid && !userDocsMap.has(uid)) {
        userDocsMap.set(uid, {
          uid,
          displayName: `User (${uid.slice(0, 6)})`,
          email: '',
          isHistorical: true,
          createdAt: chainCreatedISO,
          lastSeenISO: chainCreatedISO,
          lastRoute: '/',
        });
      } else if (uid && userDocsMap.has(uid) && chainCreatedISO) {
        const prev = userDocsMap.get(uid);
        if (!prev.createdAt || new Date(chainCreatedISO) < new Date(prev.createdAt)) {
          prev.createdAt = chainCreatedISO;
        }
        if (!prev.lastSeenISO || new Date(chainCreatedISO) > new Date(prev.lastSeenISO)) {
          prev.lastSeenISO = chainCreatedISO;
        }
      }
    });
  }

  if (userDocsMap.size === 0) {
    if (ownUserSnap && ownUserSnap.exists()) {
      userDocsMap.set(ownUserSnap.id, ownUserSnap.data());
    } else if (currentUser?.uid) {
      userDocsMap.set(currentUser.uid, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Admin',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        createdAt: currentUser.metadata?.creationTime || null,
        lastSeenISO: new Date().toISOString(),
      });
    }
  }

  const rawUserDocs = Array.from(userDocsMap.entries()).map(([id, data]) => ({ id, data }));

  // Hydrate users and backfill thread/log/streak counts + exact activity timestamps from their chains subcollection
  const activityByDayFromLogs = {};
  const usersList = await Promise.all(
    rawUserDocs.map(async (uDoc) => {
      const data = uDoc.data || {};
      let threadCount = data.threadCount;
      let totalLogs = data.totalLogs;
      let sampleActive = data.sampleActive;
      let currentStreak = data.currentStreak;
      let longestStreak = data.longestStreak;
      let earliestActivityISO = toIsoString(data.createdAt);
      let latestActivityISO = toIsoString(data.lastSeenISO) || toIsoString(data.lastSignInTime);

      if (threadCount === undefined || totalLogs === undefined || data.isHistorical || uDoc.id === currentUser?.uid) {
        try {
          const chainsSnap = await getDocs(collection(db, `users/${uDoc.id}/chains`));
          let customThreads = 0;
          let hasSample = false;
          let logsSum = 0;
          const allDates = [];

          await Promise.all(
            chainsSnap.docs.map(async (cDoc) => {
              const cData = cDoc.data();
              const cCreatedISO = toIsoString(cData.createdAt);
              if (cCreatedISO) {
                allDates.push(cCreatedISO);
              }

              const isSamp = Boolean(
                cData.isSample ||
                  cData.name === 'Productivity Ecosystem' ||
                  cData.name === 'Sleep, Focus & Caffeine'
              );
              if (isSamp) hasSample = true;
              else customThreads += 1;

              const lSnap = await getDocs(collection(db, `users/${uDoc.id}/chains/${cDoc.id}/logs`));
              lSnap.docs.forEach((lDoc) => {
                const lData = lDoc.data();
                const lIso = toIsoString(lData.timestamp) || toIsoString(lData.createdAt);
                if (!lData.isTestData) {
                  logsSum += 1;
                  if (lIso) {
                    allDates.push(lIso);
                    const d = new Date(lIso);
                    if (!isNaN(d.getTime())) {
                      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                      activityByDayFromLogs[dayKey] = (activityByDayFromLogs[dayKey] || 0) + 1;
                    }
                  }
                } else if (lIso && data.isHistorical) {
                  allDates.push(lIso);
                }
              });
            })
          );

          threadCount = customThreads;
          totalLogs = logsSum;
          sampleActive = hasSample;
          if (allDates.length > 0) {
            const sortedDates = [...allDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
            if (!earliestActivityISO) earliestActivityISO = sortedDates[0];
            const newest = sortedDates[sortedDates.length - 1];
            if (!latestActivityISO || new Date(newest) > new Date(latestActivityISO)) {
              latestActivityISO = newest;
            }
            const streaks = computeStreakFromDates(allDates);
            currentStreak = streaks.current;
            longestStreak = Math.max(longestStreak || 0, streaks.longest);
          }
        } catch {
          threadCount = threadCount ?? 0;
          totalLogs = totalLogs ?? 0;
        }
      }

      return {
        uid: uDoc.id,
        displayName: data.displayName || 'Unnamed User',
        email: data.email || '—',
        isHistorical: Boolean(data.isHistorical || !data.email),
        photoURL: data.photoURL || '',
        createdAt: earliestActivityISO || (uDoc.id === currentUser?.uid ? currentUser?.metadata?.creationTime : null),
        lastSeenISO: latestActivityISO || null,
        lastRoute: data.lastRoute || '/',
        totalViews: Math.max(data.totalViews || 1, uDoc.id === currentUser?.uid ? overview.totalViews || 1 : 1),
        threadCount: threadCount || 0,
        sampleActive: Boolean(sampleActive),
        totalLogs: totalLogs || 0,
        currentStreak: currentStreak || 0,
        longestStreak: longestStreak || 0,
        starterSeeded: Boolean(data.starterSeeded),
        device: data.device || (uDoc.id === currentUser?.uid ? env.device : 'Desktop'),
        os: data.os || (uDoc.id === currentUser?.uid ? env.os : '—'),
        browser: data.browser || (uDoc.id === currentUser?.uid ? env.browser : '—'),
        source: data.source || 'Direct',
        timezone: data.timezone || (uDoc.id === currentUser?.uid ? env.timezone : '—'),
      };
    })
  );

  // Merge historical log activity into viewsByDay so the 14-day chart also reflects past active days
  Object.entries(activityByDayFromLogs).forEach(([dayKey, count]) => {
    overview.viewsByDay[dayKey] = Math.max(overview.viewsByDay[dayKey] || 0, count);
  });

  // Sort by most recently seen first
  usersList.sort((a, b) => {
    const tA = a.lastSeenISO ? new Date(a.lastSeenISO).getTime() : 0;
    const tB = b.lastSeenISO ? new Date(b.lastSeenISO).getTime() : 0;
    return tB - tA;
  });

  return {
    overview,
    users: usersList,
    rulesRestricted,
  };
};


