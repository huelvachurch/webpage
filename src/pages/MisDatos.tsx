import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Calendar, MapPin, Mail, Check, Loader2, AlertTriangle, Trash2, 
  ShieldAlert, BookOpen, Clock, GraduationCap, CheckCircle, Bell, ArrowRight
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, setDoc, query, collection, where, getDocs, 
  deleteDoc, addDoc, serverTimestamp, onSnapshot 
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const { user, roles, isAuthReady, loading } = useAuth();
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
  
  // Newsletter subscription state
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [subscriberDocId, setSubscriberDocId] = useState<string | null>(null);
  const [hasRequestedAlumno, setHasRequestedAlumno] = useState(false);

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
            
            // Extract or separate name/surnames
            const dispName = data.displayName || '';
            const spaceIdx = dispName.trim().indexOf(' ');
            if (spaceIdx !== -1) {
              setNombre(dispName.substring(0, spaceIdx).trim());
              setApellidos(dispName.substring(spaceIdx + 1).trim());
            } else {
              setNombre(dispName);
              setApellidos('');
            }

            setFechaNacimiento(data.birthDate || '');
            setLugar(data.lugarResidencia || 'Ciudad de Huelva');
            setBarriada(data.barriada || '');
            setMunicipio(data.municipio || '');
            setLugarDetalle(data.lugarDetalle || '');
            setHasRequestedAlumno(data.requestedAlumnoRole === true);
          }

          // 2. Fetch newsletter subscribers list for this user's email
          if (user.email) {
            const qSub = query(collection(db, 'subscribers'), where('email', '==', user.email));
            const subSnap = await getDocs(qSub);
            if (!subSnap.empty) {
              const subDoc = subSnap.docs[0];
              const subData = subDoc.data();
              setNewsletterSubscribed(subData.active !== false);
              setSubscriberDocId(subDoc.id);
            } else {
              setNewsletterSubscribed(false);
              setSubscriberDocId(null);
            }
          }

          // 3. Fetch courses enrollments
          const qEnr = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
          const enrSnap = await getDocs(qEnr);
          const enrollData = enrSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Enrollment[];

          // Enrich with course details
          const enriched = await Promise.all(
            enrollData.map(async (enr) => {
              const crsSnap = await getDoc(doc(db, 'courses', enr.courseId));
              return {
                ...enr,
                course: crsSnap.exists() ? { id: crsSnap.id, ...crsSnap.data() } as Course : undefined
              };
            })
          );
          setEnrollments(enriched);

        } catch (error) {
          console.error("Error loading profile data:", error);
          setErrorMsg("Error al cargar los datos del perfil");
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

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const fullDisplayName = `${nombre.trim()} ${apellidos.trim()}`.trim() || user.displayName || '';
      
      // Update User Document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: fullDisplayName,
        birthDate: fechaNacimiento,
        lugarResidencia: lugar,
        barriada: lugar === 'Ciudad de Huelva' ? barriada : '',
        municipio: lugar === 'Otro Municipio de Huelva' ? municipio : '',
        lugarDetalle: lugar === 'Otro' ? lugarDetalle : '',
        updatedAt: serverTimestamp()
      });

      // Update Subscriptions Link
      if (user.email) {
        if (subscriberDocId) {
          // Update active status
          const subRef = doc(db, 'subscribers', subscriberDocId);
          await updateDoc(subRef, {
            active: newsletterSubscribed
          });
        } else if (newsletterSubscribed) {
          // Create subscription doc
          const newDocRef = await addDoc(collection(db, 'subscribers'), {
            email: user.email,
            subscribedAt: serverTimestamp(),
            active: true
          });
          setSubscriberDocId(newDocRef.id);
        }
      }

      setSuccessMsg('¡Datos de perfil actualizados correctamente!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setErrorMsg("Error al actualizar la información. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
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
          <h1 className="text-4xl font-kenao text-primary mb-2">Perfil</h1>
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

                {/* Newsletter Subscription Toggle */}
                <div className="pt-4 border-t border-slate-150">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center h-5 mt-1">
                      <input 
                        type="checkbox" 
                        id="newsletter" 
                        checked={newsletterSubscribed}
                        onChange={(e) => setNewsletterSubscribed(e.target.checked)}
                        className="w-5 h-5 rounded border-slate-300 text-secondary focus:ring-secondary"
                      />
                    </div>
                    <div>
                      <label htmlFor="newsletter" className="text-sm font-bold text-primary block cursor-pointer">
                        Suscripción a Newsletter
                      </label>
                      <p className="text-primary/50 text-xs mt-1 leading-relaxed">
                        Deseo suscribirme y recibir correos de resúmenes semanales, avisos especiales de sermones de domingos y actividades de Huelva Church.
                      </p>
                    </div>
                  </div>
                </div>

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
          </div>

          {/* Sidebar / Additional Options & Analytics */}
          <div className="space-y-8">

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
