import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, studiesDb } from '../firebase';
import { Shield, BookOpen, MessageSquare, MapPin, Map, Clock, AlertCircle, ChevronRight, User as UserIcon, LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';

interface Celula {
  id: string;
  name: string;
  leader: string;
  schedule: string;
  address: string;
  googleMapsLink?: string;
  leaderId?: string;
  barriada?: string;
  ciudad?: string;
}

interface WeeklyStudy {
  id: string;
  yearTheme?: string;
  startDate?: string;
  endDate?: string;
  studyTitle?: string;
  title?: string;
  icebreaker?: string;
  worshipTitle?: string;
  worshipUrl?: string;
  intercessionPrompt?: string;
  visionText?: string;
  leaderAttention?: string;
  createdAt?: any;
  content?: string;
  excerpt_en?: string;
  imageUrl?: string;
  slug?: string;
  status?: string;
  category?: string;
  link?: string;
}

interface StudyInteraction {
  id: string;
  userId: string;
  studyId: string;
  studyTitle: string;
  petitions: string[];
  notes: string[];
  highlightedElements: Record<string, boolean>;
  lastUpdated: string;
}

export default function MiCelula() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User data
  const [userCelulaId, setUserCelulaId] = useState<string | null>(null);
  const [celulaStatus, setCelulaStatus] = useState<'pending' | 'approved' | null>(null);
  
  // Cell selection data
  const [availableCelulas, setAvailableCelulas] = useState<Celula[]>([]);
  const [selectedCelulaId, setSelectedCelulaId] = useState<string>('');
  
  // Active cell data
  const [myCelula, setMyCelula] = useState<Celula | null>(null);
  
  // Tabs
  type TabType = 'info' | 'estudios' | 'lider';
  const [activeTab, setActiveTab] = useState<TabType>('info');

  // Studies
  const [allStudies, setAllStudies] = useState<WeeklyStudy[]>([]);
  const [userInteractions, setUserInteractions] = useState<StudyInteraction[]>([]);

  // Cell Notifications state
  const [cellNotifications, setCellNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthReady && !user) {
      navigate('/login');
    }
  }, [user, isAuthReady, navigate]);

  // Initial load inside a snapshot for reactive changes (like leader approval/rejection)
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    let unsubUser = () => {};

    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      unsubUser = onSnapshot(userDocRef, async (userDoc) => {
        let currentCelulaId = null;
        let currentStatus = null;
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          currentCelulaId = userData.celulaId || null;
          currentStatus = userData.celulaStatus || (currentCelulaId ? 'approved' : null);
        }

        setUserCelulaId(currentCelulaId);
        setCelulaStatus(currentStatus);

        if (currentCelulaId) {
          // Fetch my celula interactively
          const celulaDoc = await getDoc(doc(db, 'celulas', currentCelulaId));
          if (celulaDoc.exists()) {
            setMyCelula({ id: celulaDoc.id, ...celulaDoc.data() } as Celula);
          } else {
             // Invalid celula
             setUserCelulaId(null);
             currentCelulaId = null;
             setCelulaStatus(null);
          }
        }

        if (!currentCelulaId) {
          // Fetch all celulas for selection
          const celulasSnap = await getDocs(collection(db, 'celulas'));
          const celulasList: Celula[] = [];
          celulasSnap.forEach(d => celulasList.push({ id: d.id, ...d.data() } as Celula));
          setAvailableCelulas(celulasList);
          setMyCelula(null);
        }
        setLoading(false);
      }, (err) => {
         console.error("Error with User DB snapshot:", err);
         setLoading(false);
      });
    } catch (err) {
      console.error("Error setting up Mi Celula listener:", err);
      setLoading(false);
    }

    return () => unsubUser();
  }, [user]);

  // Load studies only if tab is 'estudios' and user has celula
  useEffect(() => {
    if (!user || userCelulaId === null || activeTab !== 'estudios') return;
    
    const fetchStudies = async () => {
      let list: WeeklyStudy[] = [];
      try {
         const studiesQuery = query(collection(studiesDb, 'studies'));
         const snap = await getDocs(studiesQuery);
         list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyStudy));
      } catch (err) {
         console.warn("studies collection error:", err);
      }
      
      setAllStudies(list);
         
      try {
         const interQuery = query(collection(studiesDb, 'user_study_interactions'), where('userId', '==', user.uid));
         const interSnap = await getDocs(interQuery);
         const interList = interSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudyInteraction));
         setUserInteractions(interList);
      } catch (err) {
        console.error("Error fetching user_study_interactions", err);
      }
    };
    fetchStudies();
  }, [user, userCelulaId, activeTab]);

  // Load cell_notifications
  useEffect(() => {
    if (!myCelula) {
      setCellNotifications([]);
      return;
    }
    
    // We filter by the leaderId associated with the cell
    const cellLeaderId = myCelula.leaderId || myCelula.id;
    const q = query(
      collection(db, 'cell_notifications'),
      where('leaderId', '==', cellLeaderId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Filter out purely expired ones visually
      const todayStr = new Date().toISOString().split('T')[0];
      const valid = list.filter(n => !n.expiry || n.expiry >= todayStr);
      
      setCellNotifications(valid);
    });

    return () => unsubscribe();
  }, [myCelula]);

  const handleSaveCelula = async () => {
    if (!user || !selectedCelulaId) return;
    setSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        await setDoc(userDocRef, { 
          celulaId: selectedCelulaId,
          celulaStatus: 'pending',
          uid: data.uid || user.uid,
          email: data.email || user.email || '',
          roles: data.roles || [],
          status: data.status || 'active'
        }, { merge: true });
      } else {
        const isSuperAdmin = user.email === 'huelvachurch@gmail.com';
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || '',
          roles: isSuperAdmin ? ['admin'] : [],
          status: isSuperAdmin ? 'active' : 'active',
          celulaId: selectedCelulaId,
          celulaStatus: 'pending'
        });
      }

      setUserCelulaId(selectedCelulaId);
      setCelulaStatus('pending');
      
      const celulaDoc = await getDoc(doc(db, 'celulas', selectedCelulaId));
      if (celulaDoc.exists()) {
        setMyCelula({ id: celulaDoc.id, ...celulaDoc.data() } as Celula);
      }
    } catch (err) {
      console.error("Error saving celula selection:", err);
      alert("No se pudo guardar la selección.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthReady || loading) {
    return (
      <div className="pt-32 pb-20 flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {!userCelulaId ? (
        // --- ONBOARDING: Selección de Célula ---
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-2xl mx-auto bg-white rounded-[2rem] border border-slate-100 p-8 md:p-12 shadow-xl"
        >
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-kenao text-primary mb-4">Bienvenido a Mi Célula</h1>
            <p className="text-slate-600">Para personalizar tu experiencia, necesitamos saber a qué grupo asistes actualmente.</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">¿A qué célula asiste?</label>
              <select
                value={selectedCelulaId}
                onChange={(e) => setSelectedCelulaId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary transition-all"
              >
                <option value="">-- Seleccionar Célula --</option>
                {availableCelulas.map(celula => (
                  <option key={celula.id} value={celula.id}>
                    {celula.name} (Líder: {celula.leader})
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleSaveCelula}
              disabled={!selectedCelulaId || saving}
              className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:bg-secondary hover:text-primary transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              <span className="sr-only">Guardar</span>
              {saving ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </motion.div>
      ) : celulaStatus === 'pending' ? (
        // --- VISTA PENDIENTE ---
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-2xl mx-auto bg-white rounded-[2rem] border border-slate-100 p-8 md:p-12 shadow-xl text-center"
        >
          <div className="w-20 h-20 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-kenao text-primary mb-4">Petición en Espera</h1>
          <p className="text-slate-600 text-lg">
            ¡Hemos enviado tu petición! 💛 Ahora solo falta un pequeño pasito: que tu líder revise y confirme tu acceso a la célula.
            Te avisaremos en cuanto estés dentro.
          </p>
        </motion.div>
      ) : (
        // --- VISTA ACTIVA: Mi Célula ---
        <div className="max-w-4xl mx-auto">
          <div className="mb-10 text-center">
            <h1 className="text-3xl md:text-5xl font-kenao text-primary mb-4">Mi Célula</h1>
            <p className="text-slate-600">Conecta con tu grupo y continúa con tus estudios semanales.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-100 overflow-x-auto">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-4 px-6 font-bold text-sm min-w-[120px] transition-colors flex justify-center items-center gap-2 border-b-2 ${
                  activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <MapPin className="w-5 h-5" />
                Información
              </button>
              <button
                onClick={() => setActiveTab('estudios')}
                className={`flex-1 py-4 px-6 font-bold text-sm min-w-[120px] transition-colors flex justify-center items-center gap-2 border-b-2 ${
                  activeTab === 'estudios' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <BookOpen className="w-5 h-5" />
                Estudios
              </button>
              <button
                onClick={() => setActiveTab('lider')}
                className={`flex-1 py-4 px-6 font-bold text-sm min-w-[120px] transition-colors flex justify-center items-center gap-2 border-b-2 ${
                  activeTab === 'lider' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                Mi Líder
              </button>
            </div>

            <div className="p-6 md:p-10 min-h-[400px]">
              <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    {myCelula ? (
                      <>
                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                          <h2 className="text-2xl font-kenao text-primary mb-6 flex items-center justify-center md:justify-start gap-3">
                            {myCelula.name}
                          </h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex gap-3 items-start text-slate-600">
                                <UserIcon className="w-5 h-5 shrink-0 text-secondary" />
                                <div>
                                  <p className="font-bold text-xs uppercase text-slate-400">Líder</p>
                                  <p className="font-medium">{myCelula.leader || 'No especificado'}</p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start text-slate-600">
                                <Clock className="w-5 h-5 shrink-0 text-secondary" />
                                <div>
                                  <p className="font-bold text-xs uppercase text-slate-400">Horario de Reunión</p>
                                  <p className="font-medium">{myCelula.schedule || 'No especificado'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="flex gap-3 items-start text-slate-600">
                                <Map className="w-5 h-5 shrink-0 text-secondary" />
                                <div>
                                  <p className="font-bold text-xs uppercase text-slate-400">Dirección</p>
                                  <p className="font-medium">{myCelula.address || 'No especificada'}</p>
                                </div>
                              </div>
                              <div className="flex gap-3 items-start text-slate-600">
                                <MapPin className="w-5 h-5 shrink-0 text-secondary" />
                                <div>
                                  <p className="font-bold text-xs uppercase text-slate-400">Ubicación</p>
                                  <p className="font-medium">{(myCelula.barriada && myCelula.ciudad) ? `${myCelula.barriada}, ${myCelula.ciudad}` : myCelula.barriada || myCelula.ciudad || 'No especificada'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {cellNotifications.length > 0 && (
                          <div className="mt-8 space-y-4">
                            <h3 className="text-xl font-kenao text-primary flex items-center gap-2">
                              <AlertCircle className="w-6 h-6 text-emerald-500" />
                              Avisos de mi Líder
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {cellNotifications.map((ann) => (
                                <div key={ann.id} className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm">
                                  <h4 className="font-bold text-emerald-900 mb-2">{ann.title}</h4>
                                  <p className="text-sm text-emerald-800 leading-relaxed whitespace-pre-line">{ann.message}</p>
                                  {ann.expiry && (
                                    <div className="mt-4 text-[10px] uppercase font-bold text-emerald-600/60 bg-emerald-100 inline-block px-2 py-1 rounded-md tracking-wider">
                                      Vigente hasta: {ann.expiry.split('-').reverse().join('/')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p>Cargando información de la célula...</p>
                    )}
                  </motion.div>
                )}

                {activeTab === 'estudios' && (
                  <motion.div
                    key="estudios"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-10"
                  >
                    {/* Guardados */}
                    <div>
                      <h3 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
                        <Check className="w-6 h-6 text-secondary" />
                        Mis Estudios Guardados
                      </h3>
                      {userInteractions.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
                          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">Aún no tienes estudios guardados.</p>
                          <p className="text-sm text-slate-400 mt-2">Visita un estudio de la biblioteca y pulsa "Guardar en Perfil".</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userInteractions.map(interaction => {
                            const relatedStudy = allStudies.find(s => s.id === interaction.studyId);
                            return (
                              <a
                                key={interaction.id}
                                href={(() => {
                                  let urlStr = relatedStudy?.link || `https://estudios.huelvachurch.com/?id=${interaction.studyId}`;
                                  if (user?.uid && urlStr.includes('estudios.huelvachurch.com')) {
                                    urlStr += (urlStr.includes('?') ? '&' : '?') + `uid=${user.uid}`;
                                  }
                                  return urlStr;
                                })()}
                                target="_blank" rel="noopener noreferrer"
                                className="group block bg-white border border-slate-200 rounded-xl p-5 hover:border-secondary hover:shadow-md transition-all"
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-1 rounded-md mb-2 inline-block">
                                      Guardado
                                    </span>
                                    <h4 className="font-bold text-primary group-hover:text-secondary transition-colors">
                                      {interaction.studyTitle || relatedStudy?.studyTitle || relatedStudy?.title || `Estudio Guardado`}
                                    </h4>
                                    {relatedStudy?.yearTheme && (
                                      <p className="text-xs text-slate-500 mt-1 mb-2">{relatedStudy.yearTheme}</p>
                                    )}
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {interaction.petitions && interaction.petitions.length > 0 && (
                                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1 border border-slate-200">
                                          🙏 {interaction.petitions.length} Peticiones
                                        </span>
                                      )}
                                      {interaction.notes && interaction.notes.length > 0 && (
                                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1 border border-slate-200">
                                          📝 {interaction.notes.length} Notas
                                        </span>
                                      )}
                                      {interaction.highlightedElements && Object.keys(interaction.highlightedElements).length > 0 && (
                                        <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md flex items-center gap-1 border border-slate-200">
                                          ✏️ {Object.keys(interaction.highlightedElements).length} Subrayados
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-secondary/10 flex items-center justify-center shrink-0">
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-secondary transition-colors" />
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-slate-100"></div>

                    {/* Biblioteca */}
                    <div>
                        <h3 className="text-xl font-kenao text-primary mb-4">Biblioteca de Estudios</h3>
                        {allStudies.length === 0 ? (
                            <p className="text-sm text-slate-500">No hay estudios disponibles actualmente.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allStudies.map(study => (
                              <a
                                key={study.id}
                                href={(() => {
                                  let urlStr = study.link || `https://estudios.huelvachurch.com/?id=${study.id}`;
                                  if (user?.uid && urlStr.includes('estudios.huelvachurch.com')) {
                                    urlStr += (urlStr.includes('?') ? '&' : '?') + `uid=${user.uid}`;
                                  }
                                  return urlStr;
                                })()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-secondary transition-all h-full"
                              >
                                {study.worshipUrl && (
                                   <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                      <BookOpen className="w-10 h-10 text-slate-300" />
                                   </div>
                                )}
                                <div className="p-5 flex-grow flex flex-col">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-slate-100 px-2.5 py-1 rounded-md">
                                      {study.yearTheme || 'Estudio'}
                                    </span>
                                    {study.startDate && (
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md">
                                        {study.startDate}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-slate-800 leading-tight mb-2 group-hover:text-primary transition-colors">
                                    {study.studyTitle || study.title || 'Sin Título'}
                                  </h4>
                                  {study.icebreaker && (
                                    <p className="text-xs text-slate-500 line-clamp-2 mt-auto mb-4">{study.icebreaker}</p>
                                  )}
                                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-xs font-bold text-primary group-hover:text-secondary flex items-center gap-1 transition-colors">
                                      Abrir Estudio
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'lider' && (
                  <motion.div
                    key="lider"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="h-full flex flex-col items-center justify-center py-10"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                      <MessageSquare className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-kenao text-primary mb-2">Mensajería y Avisos</h3>
                    <p className="text-slate-500 text-center max-w-md">
                      Plataforma de comunicación con tu líder próximamente. Aquí podrás ver anuncios generales y chatear de forma directa.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
