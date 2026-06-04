import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Operation types for error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Firestore error info interface
export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// Standardized Firestore error handler
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user profile exists in Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Create default profile for new users
      const isSuperAdmin = user.email === 'huelvachurch@gmail.com';
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        roles: isSuperAdmin ? ['admin'] : [],
        status: isSuperAdmin ? 'active' : 'active',
        createdAt: serverTimestamp(),
        showWelcomePopup: true
      });
    }
    
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const loginWithGoogleRedirect = async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error('Login with redirect error:', error);
    throw error;
  }
};

export const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        const isSuperAdmin = user.email === 'huelvachurch@gmail.com';
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          roles: isSuperAdmin ? ['admin'] : [],
          status: isSuperAdmin ? 'active' : 'active',
          createdAt: serverTimestamp(),
          showWelcomePopup: true
        });
      }
      return user;
    }
    return null;
  } catch (error) {
    console.error('Error handling redirect result:', error);
    throw error;
  }
};

export const dismissWelcomePopup = async (uid: string) => {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      showWelcomePopup: false
    });
  } catch (error) {
    console.error('Error disabling welcome popup:', error);
  }
};

export const logout = () => signOut(auth);
