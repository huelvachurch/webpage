import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const databaseId = (firebaseConfig as any).firestoreDatabaseId || "ai-studio-abce701c-2f7d-47cd-be23-3ae6d8db43ca";
export const db = getFirestore(app, databaseId);

export const studiesDatabaseId = "ai-studio-a2eeb6ca-be40-4061-b380-b75b9d9fb2ef";
export const studiesDb = getFirestore(app, studiesDatabaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Messaging (ensuring compatibility with server-side and unsupported situations)
export let messaging: any = null;
try {
  if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("FCM Messaging is not supported on this device/environment:", e);
}

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
  const errStr = JSON.stringify(errInfo);
  console.error('Firestore Error: ', errStr);
  
  // Create a UI event for non-critical displaying instead of throwing,
  // except we still throw here so the error boundary catches it IF we want it to crash.
  // Actually, let's NOT throw to avoid full app crashes on list/get failures!
  // Instead we can just return the error object.
  return errInfo;
}

// Auth functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      sessionStorage.setItem('google_access_token', credential.accessToken);
    }
    const user = result.user;
    
    // Check if user profile exists in Firestore safely
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create default profile for new users
        const isSuperAdmin = user.email?.toLowerCase().trim() === 'huelvachurch@gmail.com';
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          roles: isSuperAdmin ? ['superadmin', 'admin'] : [],
          status: 'active',
          createdAt: serverTimestamp(),
          showWelcomePopup: true
        });
      }
    } catch (docErr) {
      console.warn('Could not verify/create Firestore user doc immediately on login:', docErr);
    }
    
    return user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.message?.includes('popup-closed-by-user') ||
      error?.message?.includes('cancelled-popup-request')
    ) {
      console.warn('Login popup closed or cancelled by user.');
    } else {
      console.error('Login error:', error);
    }
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
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        sessionStorage.setItem('google_access_token', credential.accessToken);
      }
      const user = result.user;
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const isSuperAdmin = user.email?.toLowerCase().trim() === 'huelvachurch@gmail.com';
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            roles: isSuperAdmin ? ['superadmin', 'admin'] : [],
            status: 'active',
            createdAt: serverTimestamp(),
            showWelcomePopup: true
          });
        }
      } catch (docErr) {
        console.warn('Could not verify/create Firestore user doc after redirect:', docErr);
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

/**
 * Request notification permission and get/save the FCM token to Firestore
 */
export const requestAndSaveFCMToken = async (userId: string, customVapidKey?: string): Promise<string | null> => {
  if (!messaging) {
    console.warn("FCM Messaging is not supported or initialized on this client browser");
    return null;
  }

  try {
    const permission = await window.Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error("Permiso de notificaciones denegado");
    }

    // Use the custom production key generated by the user in the Firebase console.
    const vapidKey = customVapidKey || "BDOLlzlx9cvyBCr9jEjw5Z4BbQM4-Byu_DsJxNspfyykGdiAEntGJDe-Y1u0yfs_mWSGEq5LK2bLMZdglebqGCk";

    let token = null;
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      token = await getToken(messaging, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });
    } else {
      token = await getToken(messaging, { vapidKey });
    }

    if (token) {
      console.log("FCM Token obtenido con éxito:", token);
      
      // Save it safely under user's profile:
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      let existingTokens: string[] = [];
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        existingTokens = Array.isArray(data.fcmTokens) ? data.fcmTokens : [];
      }
      
      if (!existingTokens.includes(token)) {
        await setDoc(userRef, {
          fcmTokens: [...existingTokens, token],
          uid: userId
        }, { merge: true });
      }
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error al suscribirse a notificaciones push:", error);
    throw error;
  }
};

/**
 * Register foreground message handler to process FCM payloads in the UI when the app is active
 */
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log("Mensaje FCM recibido en primer plano (Foreground):", payload);
    callback(payload);
  });
};
