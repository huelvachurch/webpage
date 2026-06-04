import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, handleRedirectResult } from './firebase';

interface AuthContextType {
  user: User | null;
  roles: ('admin' | 'comunicador' | 'profesor' | 'alumno' | 'lider')[];
  status: 'pending' | 'active' | 'blocked' | null;
  loading: boolean;
  isAuthReady: boolean;
  showWelcomePopup?: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  roles: [],
  status: null,
  loading: true,
  isAuthReady: false,
  showWelcomePopup: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AuthContextType['roles']>([]);
  const [status, setStatus] = useState<AuthContextType['status']>(null);
  const [showWelcomePopup, setShowWelcomePopup] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Check for redirect result on mount
    const checkRedirect = async () => {
      try {
        await handleRedirectResult();
      } catch (err) {
        console.error("Redirect login check failed:", err);
      }
    };
    checkRedirect();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setRoles([]);
        setStatus(null);
        setShowWelcomePopup(false);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        const isSuperAdmin = user.email === 'huelvachurch@gmail.com';
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const dbRoles = (data.roles || []) as AuthContextType['roles'];
          const dbStatus = data.status as AuthContextType['status'];
          const dbShowWelcome = !!data.showWelcomePopup;
          
          // If it's super admin but DB says otherwise (e.g. old record), force admin
          setRoles(isSuperAdmin ? ['admin'] : dbRoles);
          setStatus(isSuperAdmin ? 'active' : dbStatus);
          setShowWelcomePopup(dbShowWelcome);
        } else {
          // If document doesn't exist yet, check if it's the super admin email
          setRoles(isSuperAdmin ? ['admin'] : []);
          setStatus(isSuperAdmin ? 'active' : 'active');
          setShowWelcomePopup(false);
        }
        setLoading(false);
        setIsAuthReady(true);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
        setIsAuthReady(true);
      });

      return () => unsubscribeUser();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, roles, status, loading, isAuthReady, showWelcomePopup }}>
      {children}
    </AuthContext.Provider>
  );
};

// Error Boundary Component
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let message = "Algo salió mal. Por favor, intenta de nuevo más tarde.";
      try {
        const errJson = JSON.parse(this.state.error.message);
        if (errJson.error && errJson.error.includes("insufficient permissions")) {
          message = "No tienes permisos suficientes para realizar esta acción.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
            <h2 className="text-2xl font-kenao text-primary mb-4">¡Ups!</h2>
            <p className="text-primary/70 mb-6">{message}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-secondary hover:text-primary transition-all"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
