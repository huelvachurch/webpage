import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { collection, doc, getDoc, getDocs, setDoc, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, studiesDb } from '../firebase';
import { Shield, BookOpen, MessageSquare, MapPin, Map, Clock, AlertCircle, ChevronRight, User as UserIcon, LogOut, Check, Heart, Bell, Calendar, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { useGlobalSettings } from '../utils/useSettings';

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
  summary?: string;
  excerpt?: string;
  summaryDescription?: string;
  shortCode?: string;
  isScheduled?: boolean;
  scheduledAt?: string;
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
  const { hideHuelvaChurchCell } = useGlobalSettings();
  
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
  type TabType = 'notificaciones' | 'estudios' | 'peticiones' | 'info';
  const [activeTab, setActiveTab] = useState<TabType>('notificaciones');

  // Studies
  const [allStudies, setAllStudies] = useState<WeeklyStudy[]>([]);
  const [userInteractions, setUserInteractions] = useState<StudyInteraction[]>([]);

  // Cell Notifications state
  const [cellNotifications, setCellNotifications] = useState<any[]>([]);
  const [readNotifications, setReadNotifications] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifs_members') || '[]');
    } catch {
      return [];
    }
  });

  const activeCellNotificationsForBadge = cellNotifications.filter(n => !readNotifications.includes(n.id));

  const toggleReadNotification = (id: string) => {
    const updated = readNotifications.includes(id)
      ? readNotifications.filter(x => x !== id)
      : [...readNotifications, id];
    setReadNotifications(updated);
    localStorage.setItem('read_notifs_members', JSON.stringify(updated));
  };

  // Petitions state
  const [studiesPetitions, setStudiesPetitions] = useState<{studyTitle: string, petitions: {user: string, petitions: string[], date: string}[]}[]>([]);
  const [loadingPetitions, setLoadingPetitions] = useState(false);

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
          let celulasList: Celula[] = [];
          celulasSnap.forEach(d => celulasList.push({ id: d.id, ...d.data() } as Celula));
          if (hideHuelvaChurchCell) {
             celulasList = celulasList.filter(c => 
               !c.leader?.toLowerCase().includes('huelva church') && 
               !c.name?.toLowerCase().includes('huelva church')
             );
          }
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
  }, [user, hideHuelvaChurchCell]);

  // Load studies only if tab is 'estudios' or 'peticiones' and user has celula
  useEffect(() => {
    if (!user || userCelulaId === null || (activeTab !== 'estudios' && activeTab !== 'peticiones')) return;
    
    const fetchStudies = async () => {
      let list: WeeklyStudy[] = [];
      try {
         const studiesQuery = query(collection(studiesDb, 'studies'));
         const snap = await getDocs(studiesQuery);
         list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyStudy));

         // Filter out future scheduled studies
         list = list.filter(study => {
           // 1. Si no está programado, está enviado y se muestra
           if (study.isScheduled === false || !study.scheduledAt) {
             return true;
           }
           // 2. Si está programado, se muestra SÓLO si la fecha programada ya pasó
           const publishDate = new Date(study.scheduledAt);
           const now = new Date();
           return publishDate <= now;
         });

         // sort to get latest first by date string if exists, else by createdAt
         list.sort((a,b) => {
           const dateA = a.startDate || (a as any).date;
           const dateB = b.startDate || (b as any).date;
           if (dateA && dateB) {
              return dateB.localeCompare(dateA);
           }
           const timeA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
           const timeB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
           return timeB - timeA;
         });
      } catch (err) {
         console.warn("studies collection error:", err);
      }
      
      setAllStudies(list);
         
      if (activeTab === 'estudios') {
        try {
           const interQuery = query(collection(studiesDb, 'user_study_interactions'), where('userId', '==', user.uid));
           const interSnap = await getDocs(interQuery);
           const interList = interSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudyInteraction));
           setUserInteractions(interList);
        } catch (err) {
          console.error("Error fetching user_study_interactions", err);
        }
      }

      // Fetch petitions if tab is peticiones
      if (activeTab === 'peticiones' && list.length > 0 && myCelula) {
        setLoadingPetitions(true);
        try {
          const topStudies = list.slice(0, 3);

          // Fetch users in the same cell
          const usersQuery = query(collection(db, 'users'), where('celulaId', '==', myCelula.id), where('status', '==', 'active'));
          const usersSnap = await getDocs(usersQuery);
          const cellUsers: Record<string, string> = {};
          usersSnap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.celulaStatus === 'approved') {
              cellUsers[docSnap.id] = data.displayName || data.email || 'Miembro';
            }
          });

          // Also include the leader's data, as they might not have the same celulaStatus/celulaId structure
          const cellLeaderId = myCelula.leaderId || myCelula.id;
          if (cellLeaderId && !cellUsers[cellLeaderId]) {
             const leaderDoc = await getDoc(doc(db, 'users', cellLeaderId));
             if (leaderDoc.exists()) {
                const ld = leaderDoc.data();
                cellUsers[cellLeaderId] = ld.displayName || ld.email || 'Líder';
             }
          }
          
          // Always ensure the current user sees their own
          if (!cellUsers[user.uid]) {
             cellUsers[user.uid] = user.displayName || user.email || 'Tú';
          }

          const nextStudiesPetitions = [];

          for (const study of topStudies) {
            const studyInterQuery = query(collection(studiesDb, 'user_study_interactions'), where('studyId', '==', study.id));
            const studyInterSnap = await getDocs(studyInterQuery);
            
            const petitionsList: {user: string, petitions: string[], date: string}[] = [];
            for (const docSnap of studyInterSnap.docs) {
              const data = docSnap.data();
              if (data.petitions && data.petitions.length > 0) {
                let userName = cellUsers[data.userId];
                
                // Fallback of fetching the user on-demand if they are not preloaded mapping under active/approved cell users
                if (!userName && data.userId) {
                  try {
                    const uDoc = await getDoc(doc(db, 'users', data.userId));
                    if (uDoc.exists()) {
                      const uData = uDoc.data();
                      if (uData.celulaId === myCelula.id || data.userId === cellLeaderId) {
                        userName = uData.displayName || uData.email || 'Miembro';
                        cellUsers[data.userId] = userName; // Cache name
                      }
                    }
                  } catch (e) {
                    console.error("Error fetching user info on-demand for petitions list", e);
                  }
                }

                if (userName) {
                  const validPetitions = data.petitions.filter((p: string) => typeof p === 'string' && p.trim() !== '');
                  if (validPetitions.length > 0) {
                    petitionsList.push({
                      user: userName,
                      petitions: validPetitions,
                      date: data.lastUpdated
                    });
                  }
                }
              }
            }
            
            nextStudiesPetitions.push({
               studyTitle: study.title || (study as any).studyTitle || 'Estudio sin título',
               petitions: petitionsList
            });
          }
          
          setStudiesPetitions(nextStudiesPetitions);
        } catch (err) {
          console.error("Error fetching petitions", err);
        } finally {
          setLoadingPetitions(false);
        }
      }
    };
    fetchStudies();
  }, [user, userCelulaId, activeTab, myCelula]);

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

  const getStudyUrl = (study: WeeklyStudy, includeUid: boolean = true) => {
    let urlStr = study.link;
    if (!urlStr) {
      if (study.shortCode) {
        urlStr = `https://estudios.huelvachurch.com/s/${study.shortCode}`;
      } else {
        urlStr = `https://estudios.huelvachurch.com/?id=${study.id}`;
      }
    }
    if (includeUid && user?.uid && urlStr.includes('estudios.huelvachurch.com')) {
      urlStr += (urlStr.includes('?') ? '&' : '?') + `uid=${user.uid}`;
    }
    return urlStr;
  };

  const handleShare = (e: React.MouseEvent, study: WeeklyStudy) => {
    e.preventDefault();
    e.stopPropagation();
    const title = study.studyTitle || study.title || 'Estudio';
    const url = getStudyUrl(study, false);
    const text = `Mira este estudio de la Célula: "${title}" - ${url}`;
    
    if (navigator.share) {
      navigator.share({
        title: title,
        text: text,
        url: url
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("¡Enlace del estudio copiado al portapapeles!");
        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
      }).catch(() => {
        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
      });
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
                    {celula.name}
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

          {/* Menu de Pestañas Independiente (Similar a Liderazgo) */}
          <div className="flex flex-col md:grid md:grid-cols-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full mb-10 gap-1">
            <button
              onClick={() => setActiveTab('notificaciones')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase relative cursor-pointer ${
                activeTab === 'notificaciones' 
                  ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              Notificaciones
              {activeCellNotificationsForBadge.length > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('estudios')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === 'estudios' 
                  ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              Estudios
            </button>

            <button
              onClick={() => setActiveTab('peticiones')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === 'peticiones' 
                  ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <Heart className="w-4 h-4 shrink-0" />
              Peticiones
            </button>

            <button
              onClick={() => setActiveTab('info')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
                activeTab === 'info' 
                  ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              Información
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 md:p-10 min-h-[400px]">
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
                          {[...userInteractions]
                            .sort((a, b) => {
                              const indexA = allStudies.findIndex(s => s.id === a.studyId);
                              const indexB = allStudies.findIndex(s => s.id === b.studyId);
                              const numA = indexA === -1 ? 999999 : indexA;
                              const numB = indexB === -1 ? 999999 : indexB;
                              return numA - numB;
                            })
                            .slice(0, 3)
                            .map(interaction => {
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
                            {allStudies.slice(0, 3).map(study => (
                              <div
                                key={study.id}
                                className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-secondary transition-all h-full"
                              >
                                <a
                                  href={getStudyUrl(study)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-5 flex-grow flex flex-col cursor-pointer text-left"
                                >
                                  {study.startDate && (
                                    <div className="flex items-center mb-3 text-left">
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md font-bold">
                                        {study.startDate}
                                      </span>
                                    </div>
                                  )}
                                  <h4 className="font-bold text-slate-800 leading-tight mb-2 group-hover:text-primary transition-colors text-left">
                                    {study.studyTitle || study.title || 'Sin Título'}
                                  </h4>
                                  
                                  {(() => {
                                    const summaryText = study.summaryDescription || study.summary || study.excerpt || (study as any).excerpt_es || study.visionText || study.icebreaker;
                                    return summaryText ? (
                                      <p className="text-xs text-slate-500 line-clamp-3 mt-2 mb-4 text-left">
                                        {summaryText}
                                      </p>
                                    ) : null;
                                  })()}

                                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between w-full">
                                    <span className="text-xs font-bold text-primary group-hover:text-secondary flex items-center gap-1 transition-colors">
                                      Abrir Estudio
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                    
                                    <button
                                      type="button"
                                      onClick={(e) => handleShare(e, study)}
                                      className="p-2 text-slate-400 hover:text-secondary hover:bg-slate-50 rounded-full transition-all cursor-pointer shrink-0"
                                      title="Compartir por WhatsApp"
                                    >
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'notificaciones' && (
                  <motion.div
                    key="notificaciones"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    <div className="text-left">
                      <div className="border-b border-slate-100 pb-4 mb-6">
                        <h3 className="text-xl font-kenao text-primary flex items-center gap-2">
                          <Bell className="w-6 h-6 text-secondary" />
                          Notificaciones
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Avisos y mensajes importantes de tu líder.</p>
                      </div>
                      {cellNotifications.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-400 font-bold shadow-sm">
                          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-sm text-slate-500 font-medium">No hay notificaciones actuales.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cellNotifications.map(notice => {
                            const isRead = readNotifications.includes(notice.id);
                            return (
                              <div 
                                key={notice.id} 
                                className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative hover:shadow-md transition-all ${isRead ? 'opacity-60 bg-slate-50/50' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h4 className="font-bold text-secondary text-lg text-left">{notice.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                      <Calendar className="w-3.5 h-3.5"/> 
                                      <span>Vence: {new Date(notice.expiry).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => toggleReadNotification(notice.id)} 
                                    className={`p-1.5 rounded-full transition-colors ${isRead ? 'bg-secondary/20 text-secondary' : 'bg-slate-100 text-slate-400 hover:bg-secondary/10 hover:text-secondary'}`}
                                    title={isRead ? "Marcar como no leído" : "Marcar como leído"}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                <p className="text-sm text-slate-700 leading-relaxed font-medium text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 whitespace-pre-wrap mt-3">
                                  {notice.message}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                {activeTab === 'peticiones' && (
                  <motion.div
                    key="peticiones"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-xl font-kenao text-primary mb-6 flex items-center gap-2">
                        <Heart className="w-6 h-6 text-secondary" />
                        Peticiones de Oración
                      </h3>
 
                       {loadingPetitions ? (
                          <div className="flex justify-center p-8">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                          </div>
                       ) : (
                          <>
                            {studiesPetitions.length === 0 ? (
                               <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-10 text-center">
                                 <Heart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                 <h3 className="text-lg font-kenao text-slate-600 mb-2">Sin peticiones</h3>
                                 <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                   Aún no se han registrado peticiones en los estudios recientes de tu célula.
                                 </p>
                               </div>
                            ) : (
                               <div className="space-y-10">
                                 {studiesPetitions.map((studyData, studyIdx) => (
                                   <div key={studyIdx}>
                                      <h4 className="font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-4 text-left">
                                        Estudio: <span className="text-primary">{studyData.studyTitle}</span>
                                      </h4>
                                      {studyData.petitions.length === 0 ? (
                                         <div className="text-sm text-slate-500 py-3 px-4 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2 text-left">
                                           <BookOpen className="w-5 h-5 text-slate-300" />
                                           No hay peticiones registradas para este estudio.
                                         </div>
                                      ) : (
                                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                           {studyData.petitions.map((cp, idx) => (
                                             <div key={idx} className="bg-secondary/5 border border-secondary/15 rounded-2xl p-5 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-3 w-full mb-4 border-b border-secondary/10 pb-3">
                                                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                                                     <UserIcon className="w-5 h-5" />
                                                  </div>
                                                  <div className="text-left">
                                                     <h4 className="font-bold text-slate-800 text-sm">{cp.user}</h4>
                                                     <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">
                                                        {cp.date ? new Date(cp.date).toLocaleDateString('es-ES') : 'Sin fecha'}
                                                     </p>
                                                  </div>
                                                </div>
                                                <ul className="space-y-3 w-full">
                                                  {cp.petitions.map((pet, pidx) => (
                                                    <li key={pidx} className="text-sm text-slate-700 text-left leading-relaxed bg-white rounded-xl p-3 border border-slate-150 shadow-sm relative before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-secondary before:rounded-l-xl pl-4">
                                                      {pet}
                                                    </li>
                                                  ))}
                                                </ul>
                                             </div>
                                           ))}
                                         </div>
                                      )}
                                   </div>
                                 ))}
                               </div>
                            )}
                          </>
                       )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    );
  }
