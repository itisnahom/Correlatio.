import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: "correlatio-f4986.firebaseapp.com",
  projectId: "correlatio-f4986",
  storageBucket: "correlatio-f4986.firebasestorage.app",
  messagingSenderId: "865034931621",
  appId: "1:865034931621:web:39378efc2f45cca507ec4c",
  measurementId: "G-MND7KWEL7M"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Google Analytics safely (prevents errors in unsupported browsers or ad-blockers)
export const analyticsPromise = typeof window !== 'undefined'
  ? isSupported()
      .then((yes) => (yes ? getAnalytics(app) : null))
      .catch(() => null)
  : Promise.resolve(null);

export const logAnalyticsEvent = async (eventName, eventParams = {}) => {
  try {
    const analyticsInstance = await analyticsPromise;
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, eventParams);
    }
  } catch {
    // Ignore if blocked by client browser extensions
  }
};

// Auth Providers
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
