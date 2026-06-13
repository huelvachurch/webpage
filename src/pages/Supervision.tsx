import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  AlertCircle, 
  Send, 
  Trash2, 
  Link2Off,
  Calendar,
  Shield,
  FileText,
  TrendingUp,
  Bell,
  Search,
  Check
} from 'lucide-react';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';

export default function Supervision() {
  const { user, roles, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState<'lideres' | 'estadisticas' | 'notificaciones'>('lideres');
  const [loading, setLoading] = useState(true);

  // States
  const [lideres, setLideres] = useState<any[]>([]);
  const [cellMembers, setCellMembers] = useState<any[]>([]); // To store cell members birthdays & information
  const [reports, setReports] = useState<any[]>([]); // To store reports for statistics
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [newNotice, setNewNotice] = useState({ title: '', message: '', expiry: '' });
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [leaderToUnlink, setLeaderToUnlink] = useState<any | null>(null);
  const [unlinkInput, setUnlinkInput] = useState('');
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState<string>('all');
  const [contactNotifications, setContactNotifications] = useState<any[]>([]);
  const [notificationToDelete, setNotificationToDelete] = useState<any>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [superNoticeToDelete, setSuperNoticeToDelete] = useState<any>(null);
  const [superNoticeDeleteInput, setSuperNoticeDeleteInput] = useState('');

  const isSupervisor = roles.includes('supervisor');

  useEffect(() => {
    if (!isAuthReady || !user || !isSupervisor) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load leaders who chose this supervisor
        const usersQ = query(collection(db, 'users'), where('supervisorId', '==', user.uid));
        const usersSnap = await getDocs(usersQ);
        
        const allCellsSnap = await getDocs(collection(db, 'celulas'));
        const allCells = allCellsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

        (window as any).DEBUG_ALL_CELLS = allCells;
        (window as any).DEBUG_USERS = usersSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
        
        const lList: any[] = [];
        
        for (const u of usersSnap.docs) {
          const uData = u.data();
          if (uData.roles?.includes('lider')) {
            const uidStr1 = u.id?.trim();
            const uidStr2 = uData.uid?.trim();
            const emailStr = uData.email?.trim().toLowerCase();

            const cellMapLeader = allCells.find(c => 
              (c.leaderId && uidStr1 && c.leaderId.trim() === uidStr1) || 
              (c.leaderId && uidStr2 && c.leaderId.trim() === uidStr2)
            );
            
            const cellMapCoLeader = allCells.find(c => 
              (c.coLeaderId && uidStr1 && c.coLeaderId.trim() === uidStr1) || 
              (c.coLeaderId && uidStr2 && c.coLeaderId.trim() === uidStr2) ||
              (c.coLeaderEmail && emailStr && c.coLeaderEmail.trim().toLowerCase() === emailStr)
            );
            
            const cellMapCoLeaderPending = allCells.find(c => 
              (c.coLeaderInviteeId && uidStr1 && c.coLeaderInviteeId.trim() === uidStr1) || 
              (c.coLeaderInviteeId && uidStr2 && c.coLeaderInviteeId.trim() === uidStr2) ||
              (c.coLeaderInviteeEmail && emailStr && c.coLeaderInviteeEmail.trim().toLowerCase() === emailStr)
            );
            
            let cellData = null;
            let isCoLeader = false;
            let isPendingCoLeader = false;

            if (cellMapCoLeader) {
              cellData = cellMapCoLeader;
              isCoLeader = true;
            } else if (cellMapCoLeaderPending) {
              cellData = cellMapCoLeaderPending;
              isCoLeader = true;
              isPendingCoLeader = true;
            } else if (cellMapLeader) {
              cellData = cellMapLeader;
              isCoLeader = false;
            } else {
              isCoLeader = uData.roles?.includes('colider') || false;
            }
            
            lList.push({ id: u.id, ...uData, cell: cellData, isCoLeader, isPendingCoLeader });
          }
        }
        setLideres(lList);

        // Load birthdays from both leaders and their cell members
        const bDaysList: any[] = [];
        for (const u of lList) {
          if (u.birthDate) {
            bDaysList.push({
              id: `user-${u.id}`,
              name: u.displayName || u.email,
              birthDate: u.birthDate,
              birthYearOptional: !!u.birthYearOptional,
              category: u.isCoLeader ? 'colider' : 'lider'
            });
          }
        }

        if (lList.length > 0) {
          const leaderIds = lList.map(l => l.id);
          const chunks = [];
          for (let i = 0; i < leaderIds.length; i += 30) {
            chunks.push(leaderIds.slice(i, i + 30));
          }
          
          for (const chunk of chunks) {
            const membersQ = query(
              collection(db, 'cell_members'),
              where('leaderId', 'in', chunk)
            );
            const membersSnap = await getDocs(membersQ);
            membersSnap.forEach(docSnap => {
              const mData = docSnap.data();
              if (mData.birthDate) {
                bDaysList.push({
                  id: docSnap.id,
                  name: mData.name,
                  birthDate: mData.birthDate,
                  birthYearOptional: !!mData.birthYearOptional,
                  category: mData.category || mData.categories?.[0] || 'asistente'
                });
              }
            });
          }
        }
        setCellMembers(bDaysList);

        // Load meeting reports for statistics
        const rList: any[] = [];
        if (lList.length > 0) {
          const leaderIds = lList.map(l => l.id);
          const chunks = [];
          for (let i = 0; i < leaderIds.length; i += 30) {
            chunks.push(leaderIds.slice(i, i + 30));
          }
          
          for (const chunk of chunks) {
            const reportsQ = query(
              collection(db, 'meeting_reports'),
              where('leaderId', 'in', chunk)
            );
            const reportsSnap = await getDocs(reportsQ);
            reportsSnap.forEach(docSnap => {
              rList.push({ id: docSnap.id, ...docSnap.data() });
            });
          }
        }
        rList.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));
        setReports(rList);

      } catch (err) {
        console.error("Error loading data in Supervision:", err);
      }

      try {
        // Load notifications
        const notiQ = query(collection(db, 'supervisor_notifications'), where('supervisorId', '==', user.uid));
        const notiSnap = await getDocs(notiQ);
        const nList: any[] = [];
        notiSnap.forEach(d => nList.push({ id: d.id, ...d.data() }));
        nList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotificaciones(nList);
      } catch (err) {
        console.error("Error loading notifications in Supervision:", err);
      }

      setLoading(false);
    };

    loadData();
  }, [user, isAuthReady, isSupervisor]);

  // Listen to contact notifications in real-time
  useEffect(() => {
    if (!isSupervisor || !isAuthReady || !user) return;

    const q = query(
      collection(db, 'contact_notifications'),
      where('supervisorId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setContactNotifications(list);
    }, (err) => {
      console.error("Error listening to supervisor contact notifications:", err);
    });

    return () => unsubscribe();
  }, [isSupervisor, isAuthReady, user]);

  const toggleReadContactNotification = async (notifId: string, currentRead: boolean) => {
    try {
      const docRef = doc(db, 'contact_notifications', notifId);
      await updateDoc(docRef, { readBySupervisor: !currentRead });
    } catch (err) {
      console.error("Error marking contact notification as read/unread for supervisor:", err);
    }
  };

  const handleDeleteContactNotification = async () => {
    if (!notificationToDelete) return;
    try {
      await deleteDoc(doc(db, 'contact_notifications', notificationToDelete.id));
      setNotificationToDelete(null);
      setDeleteConfirmationInput('');
    } catch (err) {
      console.error("Error deleting contact notification:", err);
    }
  };

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'supervisor_notifications', id), {
        supervisorId: user.uid,
        supervisorName: user.displayName || user.email,
        title: newNotice.title,
        message: newNotice.message,
        expiry: newNotice.expiry,
        createdAt: new Date().toISOString()
      });
      setNotificaciones([{
        id, supervisorId: user.uid, title: newNotice.title, message: newNotice.message, expiry: newNotice.expiry, createdAt: new Date().toISOString()
      }, ...notificaciones]);
      setNewNotice({ title: '', message: '', expiry: '' });
      alert("Notificación difundida con éxito.");
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async () => {
    if (!superNoticeToDelete) return;
    try {
      await deleteDoc(doc(db, 'supervisor_notifications', superNoticeToDelete.id));
      setNotificaciones(prev => prev.filter(n => n.id !== superNoticeToDelete.id));
      setSuperNoticeToDelete(null);
      setSuperNoticeDeleteInput('');
    } catch(e) {
      console.error(e);
    }
  };

  const handleRemoveLider = async (liderId: string) => {
    try {
      await updateDoc(doc(db, 'users', liderId), {
        supervisorId: null
      });
      setLideres(prev => prev.filter(l => l.id !== liderId));
      setCellMembers(prev => prev.filter(m => m.id !== `user-${liderId}`));
      alert('El líder ha sido liberado con éxito.');
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error. Verifica tus permisos o intenta de nuevo.');
    }
  };

  // Birthday Helper Functions
  const getCurrentMonthName = (offset: number) => {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const d = new Date();
    let m = d.getMonth() + offset;
    if (m > 11) m -= 12;
    if (m < 0) m += 12;
    return months[m];
  };

  const getBirthdaysForMonth = (offset: number) => {
    const today = new Date();
    let targetMonth = today.getMonth() + offset;
    if (targetMonth > 11) targetMonth -= 12;
    if (targetMonth < 0) targetMonth += 12;

    return cellMembers
      .filter(m => {
        if (!m.birthDate) return false;
        const parts = m.birthDate.split('-');
        if (parts.length < 2) return false;
        let monthIndex = -1;
        if (parts.length === 3) {
          monthIndex = parseInt(parts[1], 10) - 1;
        } else if (parts.length === 2) {
          monthIndex = parseInt(parts[0], 10) - 1;
        }
        return monthIndex === targetMonth;
      })
      .sort((a, b) => {
        const getDay = (dateStr: string) => {
          const parts = dateStr.split('-');
          if (parts.length === 3) return parseInt(parts[2], 10);
          if (parts.length === 2) return parseInt(parts[1], 10);
          return 1;
        };
        return getDay(a.birthDate) - getDay(b.birthDate);
      });
  };

  const formatBirthdateDayOnly = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return parseInt(parts[2], 10);
    } else if (parts.length === 2) {
      return parseInt(parts[1], 10);
    }
    return '';
  };

  const getAgeToTurn = (birthDateStr: string) => {
    if (!birthDateStr) return 0;
    const parts = birthDateStr.split('-');
    if (parts.length < 1) return 0;
    const birthYear = parseInt(parts[0], 10);
    return new Date().getFullYear() - birthYear;
  };

  // Aggregated Statistical Metrics for Supervision
  const filteredReports = selectedLeaderFilter === 'all' 
    ? reports 
    : reports.filter((r: any) => r.leaderId === selectedLeaderFilter);

  const totalReportsNum = filteredReports.length;
  const sumBelievers = filteredReports.reduce((acc, cr) => acc + (cr.believersCount || 0), 0);
  const sumNonBelievers = filteredReports.reduce((acc, cr) => acc + (cr.nonBelieversCount || 0), 0);
  const sumTotalPresent = filteredReports.reduce((acc, cr) => acc + (cr.totalPresent || 0), 0);
  const averagePresent = totalReportsNum > 0 ? (sumTotalPresent / totalReportsNum).toFixed(1) : '0';

  // Format statistics dataset for AreaChart trend
  const chartDataset = [...filteredReports]
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate))
    .slice(-10) // last 10 meetings
    .map(r => ({
      fecha: r.meetingDate.split('-').slice(1).reverse().join('/'), // DD/MM format
      'Bautizados': r.believersBaptizedCount !== undefined ? r.believersBaptizedCount : Math.round((r.believersCount || 0) * 0.6),
      'No Bautizados': r.believersNotBaptizedCount !== undefined ? r.believersNotBaptizedCount : Math.round((r.believersCount || 0) * 0.4),
      'No Creyentes': r.nonBelieversCount || 0,
    }));

  const getBarriadaDisplay = (cell: any) => {
    if (!cell) return '';
    const ciudadOrPais = cell.ciudad || 'Huelva';
    if (cell.barriada) {
      return `${cell.barriada} de ${ciudadOrPais}`;
    }
    if (cell.lugar === 'Otro Municipio de Huelva' && cell.municipio) {
      return `${cell.municipio} de Huelva`;
    }
    if (cell.lugar === 'Otro' && cell.lugarDetalle) {
      return `${cell.lugarDetalle} de ${ciudadOrPais}`;
    }
    return `${cell.lugar || 'Huelva'} de ${ciudadOrPais}`;
  };

  const getCellLocationInfo = (cell: any) => {
    if (!cell) return { label: 'Ubicación', value: '' };
    if (cell.lugar === 'Ciudad de Huelva') {
      return { label: 'Barriada', value: cell.barriada || 'Huelva' };
    }
    if (cell.lugar === 'Otro Municipio de Huelva') {
      return { label: 'Ciudad', value: cell.municipio || 'Huelva' };
    }
    if (cell.lugar === 'Sevilla') {
      return { label: 'Ciudad', value: 'Sevilla' };
    }
    if (cell.lugar === 'Portugal') {
      return { label: 'País', value: 'Portugal' };
    }
    return { label: cell.lugar === 'Otro' ? 'Ubicación' : 'Barriada', value: cell.lugarDetalle || cell.barriada || cell.lugar || 'Huelva' };
  };

  if (!isAuthReady || loading) return <div className="pt-32 text-center text-primary font-bold">Cargando...</div>;
  
  if (!isSupervisor) return (
    <div className="pt-32 pb-20 text-center px-4 max-w-lg mx-auto">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
      <p className="text-slate-600">No tienes rol de Supervisor.</p>
    </div>
  );

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner principal elegante re-diseñado */}
        <div className="bg-gradient-to-br from-primary to-slate-900 rounded-[2rem] p-8 md:p-12 text-white mb-10 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-transparent to-transparent"></div>
          <div className="relative z-10 max-w-3xl">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono text-xs uppercase tracking-widest px-4 py-1.5 rounded-full font-bold inline-flex items-center gap-2 mb-6 shadow-sm">
              <Shield className="w-3.5 h-3.5" /> Espacio de Supervisión
            </span>
            <h1 className="text-4xl md:text-5xl font-kenao text-white mb-4">
              ¡Hola, {user?.displayName || 'Supervisor'}!
            </h1>
            <p className="text-slate-300 md:text-lg leading-relaxed">
              Bienvenido a tu panel de supervisión de Huelva Church. Aquí puedes coordinar a los líderes bajo tu cargo, analizar las estadísticas globales de sus células y enviar notificaciones y anuncios oficiales.
            </p>
          </div>
        </div>

        {/* Barra de navegación de Tabs (Consistente con Lideres.tsx) */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full mb-10 gap-1">
          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('lideres'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
              activeTab === 'lideres' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Líderes y Células
          </button>
          
          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('estadisticas'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
              activeTab === 'estadisticas' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Estadísticas
          </button>
          
          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('notificaciones'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
              activeTab === 'notificaciones' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            Notificaciones
          </button>
        </div>

        {/* Sección de Layouts dependientes de la Tab activa */}
        <AnimatePresence mode="wait">
          
          {/* TAB: LÍDERES Y CÉLULAS */}
          {activeTab === 'lideres' && (
            <motion.div
              key="lideres-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Sección principal: Listado de líderes (2 columnas) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Cabecera del Listado */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-left w-full sm:max-w-md">
                    <h2 className="text-xl font-kenao text-primary font-bold">Líderes Bajo tu Cargo</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Monitorea las células asignadas a tu supervisión, realiza búsquedas y libera de ser necesario.
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/50 rounded-full text-xs font-bold font-mono shrink-0">
                    {lideres.length} Vinculados
                  </span>
                </div>

                {/* Caja de Filtro de Búsqueda */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex border-b border-slate-100 p-4 justify-between items-center bg-white">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar líder por nombre, email o lugar cellular..."
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none text-xs text-primary font-medium"
                      />
                    </div>
                  </div>

                  {/* Listado Principal de Líderes */}
                  <div className="divide-y divide-slate-100">
                    {lideres.filter(l => {
                      const queryText = attendeeSearch.toLowerCase();
                      const matchesName = (l.displayName || '').toLowerCase().includes(queryText);
                      const matchesEmail = (l.email || '').toLowerCase().includes(queryText);
                      const matchesCell = l.cell && (l.cell.lugar || '').toLowerCase().includes(queryText);
                      return matchesName || matchesEmail || matchesCell;
                    }).length === 0 ? (
                      <div className="p-12 text-center text-slate-400 text-xs italic">
                        No se encontraron líderes vinculados para esta búsqueda.
                      </div>
                    ) : (
                      lideres
                        .filter(l => {
                          const queryText = attendeeSearch.toLowerCase();
                          const matchesName = (l.displayName || '').toLowerCase().includes(queryText);
                          const matchesEmail = (l.email || '').toLowerCase().includes(queryText);
                          const matchesCell = l.cell && (l.cell.lugar || '').toLowerCase().includes(queryText);
                          return matchesName || matchesEmail || matchesCell;
                        })
                        .map(lider => (
                          <div key={lider.id} className="p-5 transition-all hover:bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 text-left">
                              <div>
                                <h4 className="text-sm font-bold text-slate-800">{lider.displayName || lider.email}</h4>
                                <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                    lider.isCoLeader 
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {lider.isPendingCoLeader ? 'Co-Lider (Pendiente)' : lider.isCoLeader ? 'Co-Lider' : 'Lider'}
                                  </span>
                                  {lider.cell?.name && (
                                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100/70 border border-slate-200/50 px-2 py-0.5 rounded-md">
                                      {lider.cell.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-row items-center gap-3 justify-between sm:justify-end w-full sm:w-auto min-w-0">
                              {lider.cell ? (
                                <div className="flex-1 text-left bg-slate-50 p-3 py-2.5 rounded-xl border border-slate-100 text-[11px] sm:text-xs text-slate-600 font-medium space-y-0.5 min-w-0">
                                  <div className="truncate">
                                    {(() => {
                                      const locInfo = getCellLocationInfo(lider.cell);
                                      return (
                                        <>
                                          <strong className="text-primary font-sans font-bold">📍 {locInfo.label}:</strong> {locInfo.value}
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <div className="truncate">
                                    <strong className="text-primary font-sans font-bold">📅 Encuentro:</strong> {lider.cell.schedule || (lider.cell.diaEncuentro ? `${lider.cell.diaEncuentro} - ${lider.cell.horaFormateada || ''}` : 'No definido')}
                                  </div>
                                </div>
                              ) : (
                                <div className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-100">
                                  ⚠️ Sin célula activa
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLeaderToUnlink(lider);
                                    setUnlinkInput('');
                                  }}
                                  className="p-2.5 bg-red-50 border border-red-100 hover:bg-red-100 hover:text-red-700 text-red-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-sm"
                                  title="Liberar de mi supervisión"
                                >
                                  <Link2Off className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar: Tarjetas de Cumpleaños (1 columna) */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Cumpleaños de este mes */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 text-left">
                  <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                    🎉 Listado de Cumpleaños
                  </span>
                  <h3 className="text-lg font-kenao text-primary font-bold mb-3">
                    Cumpleaños de {getCurrentMonthName(0)}
                  </h3>
                  
                  <div className="space-y-4 mt-4">
                    {getBirthdaysForMonth(0).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No hay ningún cumpleaños este mes bajo tu supervisión.</p>
                    ) : (
                      getBirthdaysForMonth(0).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm shrink-0">🎂</span>
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-700">{m.name}</h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold uppercase">
                                {m.category === 'colider' ? 'Co-Lider' : m.category === 'lider' ? 'Lider' : m.category === 'bautizado' ? 'Bautizado' : m.category === 'no_bautizado' ? 'No Bautizado' : 'No Creyente'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                              {formatBirthdateDayOnly(m.birthDate)}
                            </span>
                            {!m.birthYearOptional && (
                              <p className="text-[9px] text-slate-400 mt-0.5">¡Cumple {getAgeToTurn(m.birthDate)}!</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Cumpleaños del próximo mes */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 text-left">
                  <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                    📅 Siguiente Mes
                  </span>
                  <h3 className="text-lg font-kenao text-primary font-bold mb-3">
                    Cumpleaños de {getCurrentMonthName(1)}
                  </h3>
                  
                  <div className="space-y-4 mt-4">
                    {getBirthdaysForMonth(1).length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No hay ningún cumpleaños el próximo mes bajo tu supervisión.</p>
                    ) : (
                      getBirthdaysForMonth(1).map(m => (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm shrink-0">🎂</span>
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-slate-700">{m.name}</h4>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-bold uppercase">
                                {m.category === 'colider' ? 'Co-Lider' : m.category === 'lider' ? 'Lider' : m.category === 'bautizado' ? 'Bautizado' : m.category === 'no_bautizado' ? 'No Bautizado' : 'No Creyente'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                              {formatBirthdateDayOnly(m.birthDate)}
                            </span>
                            {!m.birthYearOptional && (
                              <p className="text-[9px] text-slate-400 mt-0.5">¡Cumple {getAgeToTurn(m.birthDate)}!</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: ESTADÍSTICAS */}
          {activeTab === 'estadisticas' && (
            <motion.div
              key="stats-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {reports.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-450 font-bold shadow-sm">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30 text-primary" />
                  Todavía no se ha registrado ningún reporte en las células de tu supervisión.
                </div>
              ) : (
                <>
                  {/* Selector de Filtro de Líderes Supervisados */}
                  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                    <div>
                      <h3 className="text-sm font-bold text-primary font-kenao">Filtro de Visualización</h3>
                      <p className="text-slate-400 text-[11px] mt-0.5">Filtra las estadísticas de forma agregada o selecciona un líder en particular.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedLeaderFilter}
                        onChange={(e) => setSelectedLeaderFilter(e.target.value)}
                        className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none text-xs font-bold text-primary cursor-pointer transition-all select-none min-w-[240px] focus:bg-white focus:border-secondary"
                      >
                        <option value="all">📊 Ver General (Todos los Líderes)</option>
                        {lideres.map(l => (
                          <option key={l.id} value={l.id}>
                            👤 {l.displayName || l.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredReports.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-450 font-bold shadow-sm flex flex-col items-center justify-center">
                      <BookOpen className="w-12 h-12 opacity-30 text-amber-500 mb-4 animate-bounce" />
                      <p className="text-primary font-kenao text-md font-bold mb-1">Sin Reportes Registrados</p>
                      <p className="text-xs text-slate-400 font-normal">Este líder de célula aún no ha registrado ningún informe de reunión.</p>
                    </div>
                  ) : (
                    <>
                      {/* Tarjetas Métricas de Resumen Agrupado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-primary font-kenao">{totalReportsNum}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Informes Recibidos</p>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                            <Users className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-primary font-kenao">{sumTotalPresent}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Asistencia Acumulada</p>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                            <TrendingUp className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-primary font-kenao">{averagePresent}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Asistentes Promedio</p>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                            <Shield className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-primary font-kenao">
                              {sumTotalPresent > 0 ? ((sumNonBelievers / sumTotalPresent) * 100).toFixed(0) : '0'}%
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Alcanzando No Creyentes</p>
                          </div>
                        </div>
                      </div>

                      {/* Área de Gráfico de Tendencias en Formato Premium */}
                      {chartDataset.length > 0 && (
                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                          <div className="mb-6 text-left">
                            <div>
                              <h3 className="text-xl font-kenao text-primary font-bold">Tendencia de Células Supervisadas</h3>
                              <p className="text-xs text-slate-400 mt-1">
                                Evolución de las últimas 10 reuniones registradas en todos tus grupos monitoreados.
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap gap-4 mt-4 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1.5 text-[#A18105]">
                                <span className="w-2.5 h-2.5 bg-secondary rounded-full shrink-0"></span> Bautizados
                              </span>
                              <span className="flex items-center gap-1.5 text-primary">
                                <span className="w-2.5 h-2.5 bg-primary rounded-full shrink-0"></span> No Bautizados
                              </span>
                              <span className="flex items-center gap-1.5 text-slate-500">
                                <span className="w-2.5 h-2.5 bg-slate-400 rounded-full shrink-0"></span> No Creyentes
                              </span>
                            </div>
                          </div>

                          <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={chartDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorBautizados" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#D9B70D" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#D9B70D" stopOpacity={0.0}/>
                                  </linearGradient>
                                  <linearGradient id="colorNoBautizados" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2D4B73" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#2D4B73" stopOpacity={0.0}/>
                                  </linearGradient>
                                  <linearGradient id="colorNoCreyentes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.35}/>
                                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area type="monotone" dataKey="Bautizados" stroke="#D9B70D" strokeWidth={2} fillOpacity={1} fill="url(#colorBautizados)" />
                                <Area type="monotone" dataKey="No Bautizados" stroke="#2D4B73" strokeWidth={2} fillOpacity={1} fill="url(#colorNoBautizados)" />
                                <Area type="monotone" dataKey="No Creyentes" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorNoCreyentes)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* TAB: NOTIFICACIONES */}
          {activeTab === 'notificaciones' && (
            <motion.div
              key="notificaciones-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12 max-w-4xl mx-auto"
            >
              {/* 1. NOTIFICACIONES RECIBIDAS (Currently supervisors don't receive notifications from above, but we hide it if empty as requested) */}
              {false && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4 text-left">
                    <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                      <Bell className="w-6 h-6 text-secondary" /> Notificaciones
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Anuncios y avisos recibidos.</p>
                  </div>
                </div>
              )}

              {/* SOLICITUDES DE CONTACTO DE CÉLULAS (!ÚNETE A UNA CÉLULA!) */}
              {contactNotifications.length > 0 && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4 text-left">
                    <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                      <Users className="w-6 h-6 text-secondary animate-pulse" /> Solicitudes de Contacto
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Asistentes que han completado el formulario de "¡Únete a una Célula!" en células bajo tu supervisión.</p>
                  </div>

                  <div className="space-y-4">
                    {contactNotifications.slice(0, 3).map((notif) => {
                      const isRead = notif.readBySupervisor;
                      const formattedDate = notif.createdAt 
                        ? new Date(notif.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                        : 'Recientemente';
                      
                      const cleanPhone = notif.whatsapp.replace(/\D/g, '');
                      const waLink = cleanPhone.length === 9 ? `https://wa.me/34${cleanPhone}` : `https://wa.me/${cleanPhone}`;

                      return (
                        <div 
                          key={notif.id}
                          className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative hover:shadow-md transition-all text-left ${isRead ? 'opacity-60 bg-slate-50/50 shadow-none' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold font-kenao text-primary">
                                {notif.nombre} {notif.apellidos}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[10px] bg-secondary/15 px-2 py-0.5 rounded text-slate-800 font-extrabold uppercase tracking-wider">
                                  Célula: {notif.cellName || 'Sin especificar'}
                                </span>
                                <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-650 font-bold">
                                  Líder: {notif.leaderName || 'Sin especificar'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                                  Enviado: {formattedDate}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={() => toggleReadContactNotification(notif.id, !!isRead)}
                                className={`p-1.5 rounded-full transition-colors ${isRead ? 'bg-secondary/25 text-primary' : 'bg-slate-100 text-slate-400 hover:bg-secondary/15 hover:text-secondary'}`}
                                title={isRead ? "Marcar como pendiente" : "Marcar como aprendido/leído"}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setNotificationToDelete(notif)}
                                className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-650 transition-colors"
                                title="Eliminar notificación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 text-xs">
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1">WhatsApp / Teléfono</span>
                              <a 
                                href={waLink}
                                target="_blank" 
                                referrerPolicy="no-referrer"
                                className="text-secondary font-bold hover:underline inline-flex items-center gap-1.5 text-sm"
                              >
                                {notif.whatsapp} 
                                <span className="text-[9px] bg-secondary/20 px-2 py-0.5 rounded font-mono uppercase tracking-widest text-slate-800">Mensaje</span>
                              </a>
                            </div>
                            <div>
                              <span className="block text-[9px] uppercase font-bold text-slate-400 mb-1">Correo Electrónico</span>
                              <a 
                                href={`mailto:${notif.email}`}
                                className="text-primary hover:underline font-bold block text-sm overflow-hidden text-ellipsis"
                              >
                                {notif.email}
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. DIFUNDIR */}
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 text-left">
                  <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                    <Send className="w-6 h-6 text-secondary" /> Difundir
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Crea alertas oficiales que verán todos los líderes bajo tu cargo.</p>
                </div>

                <div className="bg-secondary/5 p-6 rounded-[2rem] border border-secondary/20 shadow-sm relative text-left">
                  <form onSubmit={handlePostNotice} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase font-extrabold text-secondary mb-2">Título de la Alerta</label>
                      <input
                        type="text"
                        required
                        value={newNotice.title}
                        onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm font-semibold text-primary"
                        placeholder="Ej. Recordatorio: Entrega de Reportes"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs uppercase font-extrabold text-secondary mb-2">Mensaje o Comunicado</label>
                      <textarea
                        required
                        rows={4}
                        value={newNotice.message}
                        onChange={e => setNewNotice({...newNotice, message: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm font-semibold text-primary leading-relaxed"
                        placeholder="Escribe el cuerpo del mensaje detalladamente..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs uppercase font-extrabold text-secondary mb-2">Fecha Límite de Exposición (Obligatoria)</label>
                      <input
                        type="date"
                        required
                        value={newNotice.expiry}
                        onChange={e => setNewNotice({...newNotice, expiry: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm font-semibold text-primary"
                      />
                    </div>
                    
                    <button 
                      type="submit" 
                      className="w-full py-4 bg-secondary text-slate-900 font-extrabold rounded-xl shadow-md hover:bg-secondary/90 transition-all flex justify-center items-center gap-2 cursor-pointer uppercase tracking-wider"
                    >
                      <Send className="w-4 h-4"/> Difundir Alerta Oficial
                    </button>
                  </form>
                </div>
              </div>

              {/* 3. ENVIADOS */}
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 text-left">
                  <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                    <Send className="w-6 h-6 text-secondary" /> Enviados
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Monitorea y elimina recordatorios que enviaste a tus líderes.</p>
                </div>

                {notificaciones.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-400 font-bold shadow-sm">
                    No has difundido ninguna notificación recientemente.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notificaciones.map(n => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isExpired = n.expiry && n.expiry < todayStr;
                      return (
                        <div 
                          key={n.id} 
                          className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative hover:shadow-md transition-all text-left ${isExpired ? 'opacity-60 border-dashed bg-slate-50/50' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-secondary text-lg text-left">{n.title}</h4>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                <Calendar className="w-3.5 h-3.5"/> 
                                <span>Vence: {new Date(n.expiry).toLocaleDateString()}</span>
                                {isExpired && (
                                  <span className="ml-1.5 px-2 py-0.5 bg-red-105 text-red-650 rounded text-[9px] font-mono tracking-wider font-extrabold uppercase">Vencido</span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => setSuperNoticeToDelete(n)} 
                              className="p-1.5 rounded-full bg-red-50 text-red-400 hover:text-red-650 hover:bg-red-500 hover:text-white transition-colors animate-none shrink-0"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                          
                          <p className="text-sm text-slate-700 leading-relaxed font-medium text-left bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 whitespace-pre-wrap mt-3">
                            {n.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* Reusable Popup Modal for Unlinking Supervised Leader */}
        {leaderToUnlink && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
              <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Link2Off className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold font-kenao text-primary mb-2">Desvincular Líder</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Esto desvinculará al líder <span className="font-bold text-slate-800">{leaderToUnlink.displayName || leaderToUnlink.email}</span> de tu supervisión. El líder podrá vincularse a otro supervisor o seguir liderando en forma independiente.
              </p>
              
              <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
                Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">RELEASE</span> en mayúsculas para confirmar.
              </div>
              
              <input
                type="text"
                placeholder="Escribe RELEASE aquí..."
                value={unlinkInput}
                onChange={(e) => setUnlinkInput(e.target.value)}
                className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
              />
              
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setLeaderToUnlink(null);
                    setUnlinkInput('');
                  }}
                  className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={unlinkInput !== 'RELEASE'}
                  onClick={() => {
                    handleRemoveLider(leaderToUnlink.id);
                    setLeaderToUnlink(null);
                    setUnlinkInput('');
                  }}
                  className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none"
                >
                  Desvincular
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Reusable Popup Modal for Deleting Contact Notification */}
        {notificationToDelete && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
              <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold font-kenao text-primary mb-2">Eliminar Contacto</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente la solicitud de contacto de <span className="font-bold text-slate-800">{notificationToDelete.nombre} {notificationToDelete.apellidos}</span>? Esta acción no se puede deshacer.
              </p>
              
              <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
                Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">DELETE</span> en mayúsculas para confirmar.
              </div>
              
              <input
                type="text"
                placeholder="Escribe DELETE aquí..."
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
              />
              
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationToDelete(null);
                    setDeleteConfirmationInput('');
                  }}
                  className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmationInput !== 'DELETE'}
                  onClick={handleDeleteContactNotification}
                  className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reusable Popup Modal for Deleting Supervisor Notification */}
        {superNoticeToDelete && (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
              <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold font-kenao text-primary mb-2">Eliminar Notificación</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente la notificación <span className="font-bold text-slate-800">{superNoticeToDelete.title}</span>? Esta acción no se puede deshacer.
              </p>
              
              <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
                Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">DELETE</span> en mayúsculas para confirmar.
              </div>
              
              <input
                type="text"
                placeholder="Escribe DELETE aquí..."
                value={superNoticeDeleteInput}
                onChange={(e) => setSuperNoticeDeleteInput(e.target.value)}
                className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
              />
              
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setSuperNoticeToDelete(null);
                    setSuperNoticeDeleteInput('');
                  }}
                  className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={superNoticeDeleteInput !== 'DELETE'}
                  onClick={handleDeleteNotice}
                  className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
