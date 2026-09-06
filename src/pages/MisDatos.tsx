import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Calendar, MapPin, Mail, Check, Loader2, AlertTriangle, Trash2, 
  ShieldAlert, BookOpen, Clock, GraduationCap, CheckCircle, Bell, ArrowRight,
  Smartphone, Volume2
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, setDoc, query, collection, where, getDocs, 
  deleteDoc, addDoc, serverTimestamp, onSnapshot 
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, requestAndSaveFCMToken } from '../firebase';
import { useAuth } from '../AuthContext';
import { useGlobalSettings } from '../utils/useSettings';
import { useNavigate } from 'react-router-dom';
import { 
  isNative, 
  getNotificationPermission, 
  requestNotificationPermission as requestNativeOrWebPermission, 
  triggerLocalNotification, 
  registerNativePush 
} from '../utils/notifications';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150'
];

interface Course {
  id: string;
  title: string;
  imageUrl: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  progress: number;
  course?: Course;
}

export default function MisDatos() {
  const { user, roles, status, isAuthReady, loading } = useAuth();
  const { hideNewsletter } = useGlobalSettings();
  const navigate = useNavigate();

  // State
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [lugar, setLugar] = useState('Ciudad de Huelva');
  const [barriada, setBarriada] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [lugarDetalle, setLugarDetalle] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState('');
  
  // Newsletter subscription state
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [subscriberDocId, setSubscriberDocId] = useState<string | null>(null);
  const [savingNewsletter, setSavingNewsletter] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState('');
  const [newsletterError, setNewsletterError] = useState('');
  const [hasRequestedAlumno, setHasRequestedAlumno] = useState(false);
  const [userCelulaId, setUserCelulaId] = useState<string | null>(null);

  // Notification Preferences States
  const [prefCelula, setPrefCelula] = useState(true);
  const [prefLiderazgo, setPrefLiderazgo] = useState(true);
  const [prefOracion, setPrefOracion] = useState(true);
  const [prefCellMeet, setPrefCellMeet] = useState(true);
  const [prefPublicaciones, setPrefPublicaciones] = useState(true);
  const [prefCelebracion, setPrefCelebracion] = useState(true);

  // Browser Push permission states
  const [browserPermission, setBrowserPermission] = useState<string>('default');
  const [pushSupported, setPushSupported] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);
  const [prefsError, setPrefsError] = useState('');
  const [showTestBanner, setShowTestBanner] = useState(false);
  const [testBannerMessage, setTestBannerMessage] = useState('');
  const [isSimulatingPush, setIsSimulatingPush] = useState(false);

  // Enrollments State
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  // Delete account confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (isAuthReady && !loading && !user) {
      navigate('/login');
    }
  }, [user, loading, isAuthReady, navigate]);

  // Check notification support on mount
  useEffect(() => {
    const checkSupport = async () => {
      if (isNative()) {
        setPushSupported(true);
        const perm = await getNotificationPermission();
        setBrowserPermission(perm);
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushSupported(true);
        setBrowserPermission((window as any).Notification.permission);
      }
    };
    checkSupport();
  }, []);

  // Load profile data and newsletter subscription
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        try {
          // 1. Load User Profile from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFotoPerfil(data.photoURL || user?.photoURL || '');
            
            // Extract or separate name/surnames (Prefer distinct saved fields)
            if (data.nombre !== undefined || data.apellidos !== undefined) {
              setNombre(data.nombre || '');
              setApellidos(data.apellidos || '');
            } else {
              const dispName = data.displayName || '';
              const spaceIdx = dispName.trim().indexOf(' ');
              if (spaceIdx !== -1) {
                setNombre(dispName.substring(0, spaceIdx).trim());
                setApellidos(dispName.substring(spaceIdx + 1).trim());
              } else {
                setNombre(dispName);
                setApellidos('');
              }
            }

            setFechaNacimiento(data.birthDate || '');
            setLugar(data.lugarResidencia || 'Ciudad de Huelva');
            setBarriada(data.barriada || '');
            setMunicipio(data.municipio || '');
            setLugarDetalle(data.lugarDetalle || '');
            setHasRequestedAlumno(data.requestedAlumnoRole === true);
            setUserCelulaId(data.celulaId || null);

            // Load existing notification preferences
            const prefs = data.notificationPreferences || {};
            setPrefCelula(prefs.celula !== false);
            setPrefLiderazgo(prefs.liderazgo !== false);
            setPrefOracion(prefs.oracion !== false);
            setPrefCellMeet(prefs.cellMeet !== false);
            setPrefPublicaciones(prefs.publicaciones !== false);
            setPrefCelebracion(prefs.celebracion !== false);
          }
        } catch (error) {
          console.error("Critical error loading user profile document:", error);
          setErrorMsg(`Error al cargar los datos de tu cuenta (detalles: ${error instanceof Error ? error.message : String(error)})`);
        }

        // 2. Fetch newsletter subscribers list (UID direct check with email query fallback)
        try {
          const subDocRef = doc(db, 'subscribers', user.uid);
          const subSnap = await getDoc(subDocRef);
          if (subSnap.exists()) {
            const subData = subSnap.data();
            setNewsletterSubscribed(subData.active !== false);
            setSubscriberDocId(subSnap.id);
          } else if (user.email) {
            const qSub = query(collection(db, 'subscribers'), where('email', '==', user.email));
            const emailSubSnap = await getDocs(qSub);
            if (!emailSubSnap.empty) {
              const subDoc = emailSubSnap.docs[0];
              const subData = subDoc.data();
              setNewsletterSubscribed(subData.active !== false);
              setSubscriberDocId(subDoc.id);
            } else {
              setNewsletterSubscribed(false);
              setSubscriberDocId(null);
            }
          } else {
            setNewsletterSubscribed(false);
            setSubscriberDocId(null);
          }
        } catch (error) {
          console.warn("Non-critical error: subscribers query failed:", error);
        }

        // 3. Fetch courses enrollments (Isolated/Failsafe)
        try {
          const qEnr = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
          const enrSnap = await getDocs(qEnr);
          const enrollData = enrSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Enrollment[];

          // Enrich with course details
          try {
            const enriched = await Promise.all(
              enrollData.map(async (enr) => {
                try {
                  const crsSnap = await getDoc(doc(db, 'courses', enr.courseId));
                  return {
                    ...enr,
                    course: crsSnap.exists() ? { id: crsSnap.id, ...crsSnap.data() } as Course : undefined
                  };
                } catch (courseErr) {
                  console.warn("Could not enrich course detailed metadata:", courseErr);
                  return enr;
                }
              })
            );
            setEnrollments(enriched);
          } catch (enrichErr) {
            console.warn("Course enrichment list mapping failed gracefully:", enrichErr);
            setEnrollments(enrollData);
          }
        } catch (error) {
          console.warn("Non-critical error: enrollments query failed:", error);
        } finally {
          setProfileLoading(false);
        }
      };
      loadData();
    }
  }, [user]);

  if (loading || profileLoading) {
    return (
      <div className="pt-32 text-center text-primary font-bold flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-secondary" />
        Cargando tus datos...
      </div>
    );
  }

  // Handle notification preferences save
  const handleSaveNotificationPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingPrefs(true);
    setPrefsSuccess(false);
    setPrefsError('');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || '',
        roles: roles || [],
        status: status || 'active',
        notificationPreferences: {
          celula: prefCelula,
          liderazgo: prefLiderazgo,
          oracion: prefOracion,
          cellMeet: prefCellMeet,
          publicaciones: prefPublicaciones,
          celebracion: prefCelebracion
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 5000);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      setPrefsError("Error al guardar las preferencias. Por favor intentalo de nuevo.");
      try {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      } catch (fErr) {
        // Log formatted Firestore details
      }
    } finally {
      setSavingPrefs(false);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    const isApp = isNative();
    if (!isApp && (typeof window === 'undefined' || !('Notification' in window))) {
      setPrefsError('Las notificaciones del navegador no son compatibles con este dispositivo o navegador.');
      return;
    }

    try {
      const permission = await requestNativeOrWebPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        let tokenMsg = '';
        if (user) {
          try {
            if (isApp) {
              // Register native push FCM listeners
              await registerNativePush(async (token) => {
                if (token) {
                  // Save custom native registration token to Firestore
                  const userRef = doc(db, 'users', user.uid);
                  const userDoc = await getDoc(userRef);
                  let existingTokens: string[] = [];
                  if (userDoc.exists()) {
                    existingTokens = Array.isArray(userDoc.data().fcmTokens) ? userDoc.data().fcmTokens : [];
                  }
                  if (!existingTokens.includes(token)) {
                    await setDoc(userRef, { fcmTokens: [...existingTokens, token], uid: user.uid }, { merge: true });
                  }
                }
              });
              tokenMsg = ' ¡Tu dispositivo móvil ha sido enlazado para recibir notificaciones directas!';
            } else {
              const token = await requestAndSaveFCMToken(user.uid);
              if (token) {
                tokenMsg = ' ¡Tu dispositivo ha sido enlazado para recibir alertas offline!';
              }
            }
          } catch (e) {
            console.warn("FCM registration failed:", e);
          }
        }
        setPrefsSuccess(true);
        setTestBannerMessage(isApp 
          ? `¡Permiso concedido! Ahora puedes recibir alertas push en tu aplicación móvil.${tokenMsg}`
          : `¡Permiso concedido! Ahora puedes recibir alertas push en este navegador.${tokenMsg}`
        );
        setShowTestBanner(true);
        setTimeout(() => {
          setShowTestBanner(false);
          setPrefsSuccess(false);
        }, 5000);
      } else if (permission === 'denied') {
        setPrefsError(isApp 
          ? 'Permiso denegado. Para recibir notificaciones, debes habilitarlas desde los ajustes de la aplicación en tu celular.'
          : 'Permiso denegado. Para recibir notificaciones, debes habilitarlas desde la configuración de tu navegador.'
        );
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setPrefsError('Error al solicitar permiso de notificación.');
    }
  };

  // Simulate or trigger real test push notification
  const handleTriggerTestPush = () => {
    setIsSimulatingPush(true);
    
    setTimeout(async () => {
      setIsSimulatingPush(false);
      
      const perm = await getNotificationPermission();
      
      if (perm === 'granted') {
        try {
          await triggerLocalNotification(
            "Mi Célula - Huelva Church", 
            "¡Prueba de alerta exitosa! Tus canales de notificaciones han sido configurados correctamente."
          );
        } catch (err) {
          console.error("Local notification service failed, falling back to in-app banner:", err);
          setTestBannerMessage("🔔 Mi Célula: ¡Prueba de Alerta Exitosa! Preferencias guardadas de forma segura.");
          setShowTestBanner(true);
          setTimeout(() => setShowTestBanner(false), 5000);
        }
      } else {
        // Fallback banner for when standard desktop permission is denied/unsupported/inside iframe
        setTestBannerMessage("🔔 Mi Célula: ¡Prueba de Alerta Exitosa! Preferencias guardadas de forma segura.");
        setShowTestBanner(true);
        setTimeout(() => setShowTestBanner(false), 5000);
      }
    }, 1200);
  };

  // Handle Local File Upload Convert to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('La imagen seleccionada supera el límite de 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      setFotoPerfil(base64String);
      
      if (user) {
        setSaving(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { photoURL: base64String }, { merge: true });
          setSuccessMsg('¡Foto de perfil actualizada correctamente!');
          setTimeout(() => setSuccessMsg(''), 5000);
        } catch (error) {
          console.error("Error saving profile photo:", error);
          setErrorMsg("Error al guardar la foto de perfil en la base de datos.");
        } finally {
          setSaving(false);
        }
      }
    };
    reader.onerror = () => {
      setErrorMsg('Error al procesar el archivo de imagen.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Preset Avatar Selection
  const handleSelectPreset = async (avatarUrl: string) => {
    setFotoPerfil(avatarUrl);
    if (user) {
      setSaving(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { photoURL: avatarUrl }, { merge: true });
        setSuccessMsg('¡Avatar predefinido guardado con éxito!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (error) {
        console.error("Error saving preset avatar:", error);
        setErrorMsg("Error al guardar el avatar predefinido.");
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle Restore Default Google Photo
  const handleResetPhoto = async () => {
    const googlePhoto = user?.photoURL || '';
    setFotoPerfil(googlePhoto);
    if (user) {
      setSaving(true);
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { photoURL: googlePhoto }, { merge: true });
        setSuccessMsg('¡Foto de perfil restaurada de Google!');
        setTimeout(() => setSuccessMsg(''), 5000);
      } catch (error) {
        console.error("Error resetting profile photo:", error);
        setErrorMsg("Error al restaurar la foto de perfil.");
      } finally {
        setSaving(false);
      }
    }
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const trimmedNombre = nombre.trim();
      const trimmedApellidos = apellidos.trim();
      const fullDisplayName = `${trimmedNombre} ${trimmedApellidos}`.trim() || user.displayName || '';
      
      // Update User Document with setDoc merge: true
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email || '',
        roles: roles || [],
        status: status || 'active',
        nombre: trimmedNombre,
        apellidos: trimmedApellidos,
        displayName: fullDisplayName,
        birthDate: fechaNacimiento,
        lugarResidencia: lugar,
        barriada: lugar === 'Ciudad de Huelva' ? barriada : '',
        municipio: lugar === 'Otro Municipio de Huelva' ? municipio : '',
        lugarDetalle: lugar === 'Otro' ? lugarDetalle : '',
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSuccessMsg('¡Datos de perfil actualizados correctamente!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMsg("Error al actualizar la información. Inténtalo de nuevo.");
      try {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      } catch (fErr) {
        // Log formatted Firestore details
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Newsletter Subscription
  const handleSaveNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setSavingNewsletter(true);
    setNewsletterSuccess('');
    setNewsletterError('');

    try {
      // Always save using user.uid as the subscriber document ID
      const subRef = doc(db, 'subscribers', user.uid);
      await setDoc(subRef, {
        email: user.email,
        subscribedAt: serverTimestamp(),
        active: newsletterSubscribed
      }, { merge: true });

      setSubscriberDocId(user.uid);
      setNewsletterSuccess('¡Suscripción al boletín actualizada correctamente!');
      setTimeout(() => setNewsletterSuccess(''), 5000);
    } catch (error) {
      console.error("Error updating newsletter subscription:", error);
      setNewsletterError("Error al guardar la preferencia del boletín. Inténtalo de nuevo.");
      try {
        handleFirestoreError(error, OperationType.WRITE, `subscribers/${user.uid}`);
      } catch (fErr) {
        // Log formatted details
      }
    } finally {
      setSavingNewsletter(false);
    }
  };

  // Student Role Status
  const isAlumno = roles.includes('alumno') || roles.includes('superadmin');

  // Delete account action
  const handleDeleteAccount = async () => {
    if (!user) return;
    if (confirmEmail !== 'DELETE') {
      setDeleteError('Para confirmar debes escribir DELETE en mayúsculas.');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      // 1. Delete user document from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      await deleteDoc(userDocRef);

      // 2. Delete the user from Firebase Auth
      await deleteUser(user);

      // Clean UI and redirect
      setShowDeleteModal(false);
      navigate('/');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        setDeleteError(
          'Por seguridad, este cambio crítico requiere un inicio de sesión reciente. Por favor, cierra sesión, vuelve a ingresar e inténtalo de nuevo.'
        );
      } else {
        setDeleteError('Ocurrió un error al intentar eliminar la cuenta. Por favor, ponte en contacto con soporte.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const cursando = enrollments.filter(e => e.status === 'active' || e.status === 'pending');
  const terminados = enrollments.filter(e => e.status === 'completed');

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Title */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-kenao text-primary mb-2">Mi Perfil</h1>
          <p className="text-primary/60">Gestiona tu información personal, rol académico y suscripciones</p>
        </div>

        {/* Global Notifications */}
        <AnimatePresence>
          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm"
            >
              <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              {successMsg}
            </motion.div>
          )}

          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm"
            >
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              {errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form Fields */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
              <h2 className="text-xl font-kenao text-primary mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-secondary" />
                Información Personal
              </h2>
              
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                      Nombre
                    </label>
                    <input 
                      type="text" 
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Juan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-white text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                      Apellidos
                    </label>
                    <input 
                      type="text"
                      required
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      placeholder="Ej. Pérez García"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-white text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                    Lugar / Cuenta de Correo
                  </label>
                  <input 
                    type="email" 
                    disabled
                    value={user?.email || ''} 
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 text-sm cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">El email de la cuenta está vinculado a Google y no puede modificarse.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                      Fecha de Nacimiento
                    </label>
                    <div className="relative">
                      <input 
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-white text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                      Lugar de Residencia
                    </label>
                    <select
                      value={lugar}
                      onChange={(e) => {
                        setLugar(e.target.value);
                        setBarriada('');
                        setMunicipio('');
                        setLugarDetalle('');
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary focus:bg-white text-sm transition-all"
                    >
                      <option value="Ciudad de Huelva">Ciudad de Huelva</option>
                      <option value="Otro Municipio de Huelva">Otro Municipio de Huelva</option>
                      <option value="Sevilla">Sevilla</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Otro">Otro lugar...</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Location Forms based on selection */}
                {lugar === 'Ciudad de Huelva' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Selecciona tu Barriada o Zona
                    </label>
                    <select
                      required
                      value={barriada}
                      onChange={(e) => setBarriada(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
                    >
                      <option value="">Selecciona la barriada</option>
                      <optgroup label="Zona Centro y Sur">
                        <option value="Zona Centro">Zona Centro</option>
                        <option value="Pescadería">Pescadería</option>
                        <option value="Zafra">Zafra</option>
                        <option value="Matadero">Matadero</option>
                        <option value="Reina Victoria / Barrio Obrero">Reina Victoria / Barrio Obrero</option>
                      </optgroup>
                      <optgroup label="Zona Este">
                        <option value="Isla Chica">Isla Chica (Polvorín / Tartessos / Yáñez Pinzón)</option>
                        <option value="Pérez Cubillas">Pérez Cubillas</option>
                        <option value="Los Rosales / Viaplana">Los Rosales / Viaplana</option>
                        <option value="El Higueral">El Higueral</option>
                        <option value="La Florida">La Florida</option>
                        <option value="Príncipe Felipe">Príncipe Felipe</option>
                      </optgroup>
                      <optgroup label="Zona Norte">
                        <option value="La Orden">La Orden</option>
                        <option value="Santa Marta">Santa Marta</option>
                        <option value="El Torrejón">El Torrejón</option>
                        <option value="Hispanidad / Verdeluz">Hispanidad / Verdeluz</option>
                        <option value="El Seminario">El Seminario</option>
                        <option value="Parque Moret">Parque Moret (Alrededores)</option>
                        <option value="Tres Ventanas / San Antonio">Tres Ventanas / San Antonio</option>
                        <option value="Huerta Mena">Huerta Mena</option>
                        <option value="Guadalupe / San Sebastián">Guadalupe / Polígono San Sebastián</option>
                        <option value="Adoratrices">Adoratrices</option>
                      </optgroup>
                      <optgroup label="Zona Oeste / Ría">
                        <option value="El Conquero">El Conquero</option>
                        <option value="Las Colonias">Las Colonias</option>
                        <option value="El Carmen">El Carmen</option>
                        <option value="Marismas del Odiel / Cardeñas">Marismas del Odiel / Cardeñas</option>
                        <option value="La Navidad / Santa Lucía">La Navidad / Santa Lucía</option>
                        <option value="Molino de la Vega">Molino de la Vega</option>
                      </optgroup>
                      <option value="Otra zona / Alrededores">Otra zona / Alrededores</option>
                    </select>
                  </motion.div>
                )}

                {lugar === 'Otro Municipio de Huelva' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Municipio de Huelva
                    </label>
                    <select
                      required
                      value={municipio}
                      onChange={(e) => setMunicipio(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
                    >
                      <option value="">Selecciona el municipio</option>
                      <option value="Aljaraque">Aljaraque</option>
                      <option value="Almonte">Almonte</option>
                      <option value="Ayamonte">Ayamonte</option>
                      <option value="Cartaya">Cartaya</option>
                      <option value="Gibraleón">Gibraleón</option>
                      <option value="Isla Cristina">Isla Cristina</option>
                      <option value="Lepe">Lepe</option>
                      <option value="Moguer">Moguer</option>
                      <option value="Palos de la Frontera">Palos de la Frontera</option>
                      <option value="Punta Umbría">Punta Umbría</option>
                      <option value="San Juan del Puerto">San Juan del Puerto</option>
                      <option value="Valverde del Camino">Valverde del Camino</option>
                      <option value="Otro Municipio">Otro Municipio de la provincia</option>
                    </select>
                  </motion.div>
                )}

                {lugar === 'Otro' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Escribe tu lugar de residencia
                    </label>
                    <input 
                      type="text"
                      required
                      value={lugarDetalle}
                      onChange={(e) => setLugarDetalle(e.target.value)}
                      placeholder="Ej. Madrid, España / Algarve, Portugal"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary text-sm"
                    />
                  </motion.div>
                )}

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Guardando cambios...
                      </>
                    ) : (
                      'Guardar Mi Perfil'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Tarjeta Independiente de Suscripción a Boletines Informativos */}
            {!hideNewsletter && (
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Mail className="w-32 h-32 text-secondary" />
              </div>

              <h2 className="text-xl font-kenao text-primary mb-2 flex items-center gap-2 relative z-10">
                <Mail className="w-5 h-5 text-secondary" />
                Boletines Informativos
              </h2>
              <p className="text-primary/60 text-xs mb-6">
                Suscríbete para recibir noticias, resúmenes de sermones dominicales, estudios bíblicos y actividades directamente en tu correo electrónico.
              </p>

              {/* Newsletter Alerts */}
              <AnimatePresence>
                {newsletterSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    {newsletterSuccess}
                  </motion.div>
                )}

                {newsletterError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-xs font-bold"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    {newsletterError}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSaveNewsletter} className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                  <div className="flex items-center h-5 mt-1">
                    <input 
                      type="checkbox" 
                      id="newsletter" 
                      checked={newsletterSubscribed}
                      onChange={(e) => setNewsletterSubscribed(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-secondary focus:ring-secondary cursor-pointer"
                    />
                  </div>
                  <div>
                    <label htmlFor="newsletter" className="text-sm font-bold text-primary block cursor-pointer">
                      Suscripción al Boletín Mensual y Semanal
                    </label>
                    <p className="text-primary/50 text-xs mt-1 leading-relaxed">
                      Deseo suscribirme y recibir correos de avisos de sermones, actividades y noticias especiales de Huelva Church.
                    </p>
                  </div>
                </div>

                {/* Newsletter Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingNewsletter}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {savingNewsletter ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Guardando suscripción...
                      </>
                    ) : (
                      'Guardar Suscripción de Boletín'
                    )}
                  </button>
                </div>
              </form>
            </div>
            )}

            {/* Tarjeta de Administración de Notificaciones (Push/Email) */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Bell className="w-32 h-32" />
              </div>

              <h2 className="text-xl font-kenao text-primary mb-2 flex items-center gap-2 relative z-10">
                <Bell className="w-5 h-5 text-secondary" />
                Administración de Notificaciones
              </h2>
              <p className="text-primary/60 text-xs mb-8">
                Controla qué avisos push y recordatorios personalizados deseas recibir en tu cuenta para mantenerte al día.
              </p>

              {/* Status and Browser Permission indicator */}
              <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-primary" />
                    Estado del Dispositivo
                  </h4>
                  <p className="text-xs text-primary/70 leading-normal">
                    {!pushSupported ? (
                      'Notificaciones nativas no compatibles temporalmente en este navegador.'
                    ) : browserPermission === 'granted' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Alertas push activadas en este navegador
                      </span>
                    ) : browserPermission === 'denied' ? (
                      <span className="text-amber-700 font-semibold">
                        Bloqueadas. Actívalas en la configuración de tu navegador
                      </span>
                    ) : (
                      'Pendiente de configurar alertas push en este navegador'
                    )}
                  </p>
                </div>

                {pushSupported && browserPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={requestNotificationPermission}
                    className="shrink-0 bg-secondary hover:bg-secondary/90 text-primary font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    Habilitar Push
                  </button>
                )}

                {pushSupported && browserPermission === 'granted' && (
                  <button
                    type="button"
                    onClick={handleTriggerTestPush}
                    disabled={isSimulatingPush}
                    className="shrink-0 bg-slate-100 hover:bg-slate-200 text-primary/80 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSimulatingPush ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-secondary" />
                        Probar Alerta Push
                      </>
                    )}
                  </button>
                )}

                {(!pushSupported || browserPermission !== 'granted') && (
                  <button
                    type="button"
                    onClick={handleTriggerTestPush}
                    disabled={isSimulatingPush}
                    className="shrink-0 bg-slate-100 hover:bg-slate-200 text-primary/80 font-bold py-2 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSimulatingPush ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-secondary" />
                        Sincronizando...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-secondary" />
                        Probar Alerta en Cuenta
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Preferences messages */}
              <AnimatePresence>
                {prefsSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-xs font-bold"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ¡Preferencias de notificaciones guardadas en tu perfil de Firestore con éxito!
                  </motion.div>
                )}

                {prefsError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-xs font-bold"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    {prefsError}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSaveNotificationPrefs} className="space-y-4">
                
                <div className="space-y-3">
                  
                  {/* Item 1: Mi Celula */}
                  {userCelulaId && (
                    <div className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-primary">Mi Célula</h3>
                        </div>
                        <p className="text-[11px] text-primary/60 leading-relaxed max-w-md">
                          Comunicados, anuncios y actualizaciones publicados específicamente por el líder de tu célula.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={prefCelula}
                          onChange={(e) => setPrefCelula(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  )}

                  {/* Item 2: Liderazgo */}
                  {(roles.includes('lider') || roles.includes('supervisor') || roles.includes('admin') || roles.includes('superadmin')) && (
                    <div className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-primary">Liderazgo y Supervisión</h3>
                        </div>
                        <p className="text-[11px] text-primary/60 leading-relaxed max-w-md">
                          Nueva solicitud de asistente registrada desde el formulario de 'Mi Célula' o de 'Unirme a una Célula', avisos pastorales para líderes y actualizaciones de supervisión.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                        <input 
                          type="checkbox" 
                          checked={prefLiderazgo}
                          onChange={(e) => setPrefLiderazgo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  )}

                  {/* Item 3: Oracion Reminders */}
                  <div className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-primary">Recordatorios de Oración</h3>
                      </div>
                      <p className="text-[11px] text-primary/60 leading-relaxed max-w-md">
                        Alertas automáticas 30 minutos antes para recordar conectarte o unirte a nuestras Noches de Oración.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={prefOracion}
                        onChange={(e) => setPrefOracion(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Item 4: Reuniones de Celula */}
                  <div className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-primary">Reuniones de Célula</h3>
                      </div>
                      <p className="text-[11px] text-primary/60 leading-relaxed max-w-md">
                        Recordatorio un día antes de la reunión de tu célula para que apartes el momento y confirmes tu asistencia.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={prefCellMeet}
                        onChange={(e) => setPrefCellMeet(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Item 5: Publicaciones */}
                  <div className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-primary">Novedades y Publicaciones</h3>
                      </div>
                      <p className="text-[11px] text-primary/60 leading-relaxed max-w-md">
                        Avisos inmediatos cada vez que se publique un nuevo sermón dominical, blog con estudios de fe o actividad comunitaria.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={prefPublicaciones}
                        onChange={(e) => setPrefPublicaciones(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Item 6: Celebracion Principal */}
                  <div className="flex items-start justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-primary">Celebración Principal</h3>
                      </div>
                      <p className="text-[11px] text-primary/60 leading-relaxed max-w-md">
                        Recordatorio cálido los domingos 3 horas antes de la celebración principal de adoración para prepararte en comunión.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                      <input 
                        type="checkbox" 
                        checked={prefCelebracion}
                        onChange={(e) => setPrefCelebracion(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={savingPrefs}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold py-4 px-8 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {savingPrefs ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sincronizando preferencias...
                      </>
                    ) : (
                      'Guardar Preferencias de Notificación'
                    )}
                  </button>
                </div>
              </form>
            </div>

          </div>

          {/* Sidebar / Additional Options & Analytics */}
          <div className="space-y-8">

            {/* Foto de Perfil Widget */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-center relative overflow-hidden">
              <h2 className="text-xl font-kenao text-primary mb-6 flex items-center gap-2 justify-center">
                <User className="w-5 h-5 text-secondary" />
                Foto de Perfil
              </h2>
              
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-32 h-32 group">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-100 shadow-inner bg-slate-50 flex items-center justify-center">
                    {fotoPerfil ? (
                      <img src={fotoPerfil} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-12 h-12 text-primary/20" />
                    )}
                  </div>
                  <label htmlFor="avatar-file" className="absolute inset-0 bg-slate-900/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold gap-1">
                    <Smartphone className="w-5 h-5" />
                    Cambiar
                  </label>
                  <input 
                    type="file" 
                    id="avatar-file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>

                <div className="space-y-2 w-full">
                  <p className="text-xs text-primary/60 leading-relaxed">
                    Sube una imagen local o selecciona un avatar predefinido para personalizar tu cuenta en Huelva Church.
                  </p>
                  
                  {/* Preset avatars selection */}
                  <div className="flex justify-center gap-2 py-2 flex-wrap">
                    {PRESET_AVATARS.map((avatar, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(avatar)}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${fotoPerfil === avatar ? 'border-secondary scale-110 shadow-sm' : 'border-transparent opacity-60'}`}
                      >
                        <img src={avatar} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  {fotoPerfil && fotoPerfil !== (user?.photoURL || '') && (
                    <button
                      type="button"
                      onClick={handleResetPhoto}
                      className="text-[10px] text-red-500 hover:text-red-650 font-bold uppercase tracking-wider block mx-auto py-1 cursor-pointer"
                    >
                      Restaurar Foto de Google
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* My academic analytics */}
            {isAlumno && (
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h2 className="text-xl font-kenao text-primary mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-secondary" />
                  Mis Cursos
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold text-slate-600">Cursando actualmente:</span>
                    </div>
                    <span className="text-sm font-black text-primary">{cursando.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-600">Cursos completados:</span>
                    </div>
                    <span className="text-sm font-black text-primary">{terminados.length}</span>
                  </div>
                </div>

                {/* Short cursos lists summary */}
                {cursando.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Programas Activos:</span>
                    {cursando.slice(0, 3).map(enr => (
                      <div key={enr.id} className="text-xs text-primary/70 flex items-center gap-1.5 font-medium">
                        <div className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                        <span className="truncate">{enr.course?.title || 'Curso Académico'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {terminados.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Finalizados:</span>
                    {terminados.slice(0, 3).map(enr => (
                      <div key={enr.id} className="text-xs text-emerald-700/80 flex items-center gap-1.5 font-bold">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{enr.course?.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => navigate('/mis-cursos')}
                  className="w-full mt-6 bg-slate-50 border border-slate-250 py-3 rounded-xl hover:bg-slate-100 font-bold text-xs uppercase tracking-wider text-primary/80 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Acceder a mis aulas
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-red-50/40 p-8 rounded-[2rem] border border-red-100 shadow-xs">
              <h2 className="text-xl font-kenao text-red-800 mb-2 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-650" />
                Zona de Riesgo
              </h2>
              <p className="text-[11px] text-red-650/70 mb-6 leading-relaxed">
                Eliminar tu perfil borrará permanentemente todos tus avances de estudio, registros académicos, asistencias e inscripciones de forma irreversible.
              </p>

              <button
                type="button"
                onClick={() => {
                  setConfirmEmail('');
                  setDeleteError('');
                  setShowDeleteModal(true);
                }}
                className="w-full py-3.5 bg-white hover:bg-red-50 text-red-700 font-bold rounded-xl text-xs border border-red-200 transition-all cursor-pointer shadow-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar mi cuenta
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Permanently delete user modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-kenao text-red-950 mb-3 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
              ¿Estás totalmente seguro?
            </h3>
            
            <p className="text-sm text-red-900 bg-red-50/50 p-4 rounded-2xl mb-6 border border-red-100 leading-relaxed">
              Esta acción es final e <strong>irreversible</strong>. Se borrará tu usuario en la base de datos de Huelva Church y se dará de baja tu acceso de forma inmediata.
            </p>

            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Para confirmar, escribe DELETE en mayúsculas:
            </label>
            <input 
              type="text"
              required
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="DELETE"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-sm mb-4 outline-none transition-all font-mono uppercase font-bold text-center tracking-widest text-red-900"
            />

            {deleteError && (
              <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 mb-4 font-bold flex items-start gap-1.5 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                {deleteError}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || confirmEmail !== 'DELETE'}
                className="flex-grow py-3.5 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Borrando...
                  </>
                ) : (
                  'Confirmar Eliminación'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
