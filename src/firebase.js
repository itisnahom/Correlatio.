import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// REPLACE THIS with your actual Firebase project config later
const firebaseConfig = {
  apiKey: "AIzaSyAmJ2Nh6QyAAm_B2adpIT2h1tOXR-AbwxA",
  authDomain: "correlatio-f4986.firebaseapp.com",
  projectId: "correlatio-f4986",
  storageBucket: "correlatio-f4986.firebasestorage.app",
  messagingSenderId: "865034931621",
  appId: "1:865034931621:web:39378efc2f45cca507ec4c"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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
