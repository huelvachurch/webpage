import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Calendar, 
  Users, 
  User, 
  MessageSquare, 
  TrendingUp, 
  Plus, 
  Minus, 
  Send, 
  BookOpen, 
  Bell, 
  Trash2, 
  FileText, 
  CheckCircle,
  TrendingDown,
  Info,
  Link,
  Copy,
  ExternalLink,
  Share2
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface MeetingReport {
  id?: string;
  leaderId: string;
  leaderName: string;
  meetingDate: string;
  believersCount: number;
  nonBelieversCount: number;
  totalPresent: number;
  believersNames: string;
  nonBelieversNames: string;
  comments: string;
  submittedAt: any;
}

interface LeaderAnnouncement {
  id?: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

interface CellStudy {
  id?: string;
  title: string;
  link: string;
  category: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export default function Lideres() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();

  // Access check
  const isAdmin = roles.includes('admin');
  const isLider = roles.includes('lider') || isAdmin;

  // Tabs state
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'announcements' | 'studies' | 'cell'>('form');

  // My Cell states
  const [cellProfile, setCellProfile] = useState<any>(null);
  const [isCellLoading, setIsCellLoading] = useState(false);
  const [cellProfileForm, setCellProfileForm] = useState({
    name: '',
    leader: '',
    schedule: '',
    address: '',
    barriada: '',
    ciudad: 'Huelva',
    googleMapsLink: ''
  });
  const [isSavingCell, setIsSavingCell] = useState(false);
  const [copiedCellLink, setCopiedCellLink] = useState(false);

  // Form states
  const [leaderName, setLeaderName] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [believersCount, setBelieversCount] = useState(0);
  const [nonBelieversCount, setNonBelieversCount] = useState(0);
  const [believersNames, setBelieversNames] = useState('');
  const [nonBelieversNames, setNonBelieversNames] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Firestore lists
  const [reports, setReports] = useState<MeetingReport[]>([]);
  const [announcements, setAnnouncements] = useState<LeaderAnnouncement[]>([]);
  const [studies, setStudies] = useState<CellStudy[]>([]);
  
  // Announcements administrator creation section
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);

  // Studies creation states
  const [studyTitle, setStudyTitle] = useState('');
  const [studyLink, setStudyLink] = useState('');
  const [studyCategory, setStudyCategory] = useState('Estudio General');
  const [studyDescription, setStudyDescription] = useState('');
  const [isSubmittingStudy, setIsSubmittingStudy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Stats selection filter for admin
  const [selectedLeaderFilter, setSelectedLeaderFilter] = useState<string>('all');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Pre-fill leader name
  useEffect(() => {
    if (user && user.displayName) {
      setLeaderName(user.displayName);
    }
  }, [user]);

  // Load my cell profile in real-time
  useEffect(() => {
    if (!user?.uid) return;
    
    setIsCellLoading(true);
    const q = query(collection(db, 'celulas'), where('leaderId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        const profile = { id: docSnap.id, ...data };
        setCellProfile(profile);
        setCellProfileForm({
          name: data.name || '',
          leader: data.leader || user.displayName || '',
          schedule: data.schedule || '',
          address: data.address || '',
          barriada: data.barriada || '',
          ciudad: data.ciudad || 'Huelva',
          googleMapsLink: data.googleMapsLink || ''
        });
      } else {
        setCellProfile(null);
        setCellProfileForm(prev => ({
          ...prev,
          leader: user.displayName || '',
          name: 'Célula de ' + (user.displayName || 'Líder'),
          ciudad: 'Huelva'
        }));
      }
      setIsCellLoading(false);
    }, (err) => {
      console.error("Error loading cell profile:", err);
      setIsCellLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveCellProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSavingCell(true);
    try {
      const dataToSave = {
        leaderId: user.uid,
        leader: cellProfileForm.leader || user.displayName || '',
        name: cellProfileForm.name || 'Célula de ' + (cellProfileForm.leader || user.displayName || 'Líder'),
        schedule: cellProfileForm.schedule || '',
        address: cellProfileForm.address || '',
        barriada: cellProfileForm.barriada || '',
        ciudad: cellProfileForm.ciudad || 'Huelva',
        googleMapsLink: cellProfileForm.googleMapsLink || ''
      };

      if (cellProfile?.id) {
        await setDoc(doc(db, 'celulas', cellProfile.id), dataToSave);
      } else {
        await setDoc(doc(db, 'celulas', user.uid), dataToSave);
      }
      alert("¡Datos de su célula guardados con éxito!");
    } catch (err) {
      console.error("Error saving cell profile:", err);
      alert("Error al guardar los datos de su célula.");
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleCopyCellLink = () => {
    const linkToCopy = `${window.location.origin}/asistencia-compartida?leaderId=${user.uid}`;
    navigator.clipboard.writeText(linkToCopy);
    setCopiedCellLink(true);
    setTimeout(() => setCopiedCellLink(false), 3000);
  };

  const handleShareFormToWhatsApp = () => {
    const link = `${window.location.origin}/asistencia-compartida?leaderId=${user.uid}`;
    const text = encodeURIComponent(`Hola, por favor ayúdanos a rellenar el formulario de asistencia de la célula ingresando a este enlace: ${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Handle redirect if not lider
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isLider) {
        navigate('/');
      }
    }
  }, [user, isLider, loading, isAuthReady, navigate]);

  // Load Leader Announcements in real-time
  useEffect(() => {
    if (!isLider || !user) return;

    const q = query(
      collection(db, 'leader_announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LeaderAnnouncement[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as LeaderAnnouncement);
      });
      setAnnouncements(list);
    });

    return () => unsubscribe();
  }, [isLider, user]);

  // Load reports based on user role (Admin loads all, Leader loads only their own)
  useEffect(() => {
    if (!isLider || !user) return;

    let q = query(
      collection(db, 'meeting_reports'),
      orderBy('meetingDate', 'desc')
    );

    // If not admin, restrict to owner leaderId
    if (!isAdmin) {
      q = query(
        collection(db, 'meeting_reports'),
        where('leaderId', '==', user.uid),
        orderBy('meetingDate', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: MeetingReport[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as MeetingReport);
      });
      setReports(list);
    }, (error) => {
      console.warn("Error fetching meeting_reports (possibly waiting for composite index):", error);
    });

    return () => unsubscribe();
  }, [isLider, user, isAdmin]);

  // Load Cell Studies in real-time
  useEffect(() => {
    if (!isLider || !user) return;

    const q = query(
      collection(db, 'cell_studies'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CellStudy[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CellStudy);
      });
      setStudies(list);
    }, (error) => {
      console.error("Error loading cell studies:", error);
    });

    return () => unsubscribe();
  }, [isLider, user]);

  // Create report submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!leaderName.trim()) {
      alert('Por favor introduce el nombre del líder');
      return;
    }

    setIsSubmitting(true);
    try {
      const newReport: Omit<MeetingReport, 'id'> = {
        leaderId: user.uid,
        leaderName: leaderName.trim(),
        meetingDate,
        believersCount,
        nonBelieversCount,
        totalPresent: believersCount + nonBelieversCount,
        believersNames: believersNames.trim(),
        nonBelieversNames: nonBelieversNames.trim(),
        comments: comments.trim(),
        submittedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'meeting_reports'), newReport);
      
      // Clean up form
      setBelieversCount(0);
      setNonBelieversCount(0);
      setBelieversNames('');
      setNonBelieversNames('');
      setComments('');
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error creating report:", err);
      alert('Error al enviar el reporte de reunión. Por favor, inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit announcement (Admins only)
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAdmin) return;
    if (!newAnnouncement.trim()) return;

    setIsPublishingAnnouncement(true);
    try {
      const announcementData: Omit<LeaderAnnouncement, 'id'> = {
        content: newAnnouncement.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Pastor / Administrador',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'leader_announcements'), announcementData);
      setNewAnnouncement('');
    } catch (err) {
      console.error("Error publishing announcement:", err);
    } finally {
      setIsPublishingAnnouncement(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (id: string | undefined) => {
    if (!id || !isAdmin) return;
    if (!window.confirm('¿Está seguro de que desea eliminar este aviso?')) return;

    try {
      await deleteDoc(doc(db, 'leader_announcements', id));
    } catch (err) {
      console.error("Error deleting announcement:", err);
    }
  };

  // Delete Meeting Report (Admins only)
  const handleDeleteReport = async (id: string | undefined) => {
    if (!id || !isAdmin) return;
    if (!window.confirm('¿Está seguro de que desea eliminar permanentemente este reporte de estadística?')) return;

    try {
      await deleteDoc(doc(db, 'meeting_reports', id));
    } catch (err) {
      console.error("Error deleting report:", err);
    }
  };

  // Add Cell Study submit handler
  const handleAddStudySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!studyTitle.trim() || !studyLink.trim()) {
      alert('Por favor introduce un título y un enlace válido.');
      return;
    }

    let dynamicLink = studyLink.trim();
    if (!dynamicLink.startsWith('http://') && !dynamicLink.startsWith('https://')) {
      dynamicLink = 'https://' + dynamicLink;
    }

    setIsSubmittingStudy(true);
    try {
      const newStudy: Omit<CellStudy, 'id'> = {
        title: studyTitle.trim(),
        link: dynamicLink,
        category: studyCategory,
        description: studyDescription.trim(),
        authorId: user.uid,
        authorName: user.displayName || 'Pastor / Administrador',
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'cell_studies'), newStudy);
      
      // Clear form
      setStudyTitle('');
      setStudyLink('');
      setStudyCategory('Estudio General');
      setStudyDescription('');
    } catch (err) {
      console.error("Error adding cell study link:", err);
      alert('Error al agregar el estudio. Por favor inténtalo de nuevo.');
    } finally {
      setIsSubmittingStudy(false);
    }
  };

  // Delete Cell Study Handler
  const handleDeleteStudy = async (id: string | undefined, authorId: string) => {
    if (!id) return;
    if (user?.uid !== authorId && !isAdmin) {
      alert('Solo el creador del enlace o un administrador pueden eliminar este estudio.');
      return;
    }

    if (!window.confirm('¿Está seguro de que desea eliminar permanentemente este estudio de la biblioteca?')) return;

    try {
      await deleteDoc(doc(db, 'cell_studies', id));
    } catch (err) {
      console.error("Error deleting cell study:", err);
      alert('Error de conexión al eliminar el estudio.');
    }
  };

  // Clipboard copy helper
  const handleCopyLink = (studyId: string, url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopiedId(studyId);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        // Fallback
        const el = document.createElement('textarea');
        el.value = url;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopiedId(studyId);
        setTimeout(() => setCopiedId(null), 2000);
      });
  };

  // WhatsApp share utility
  const handleShareToWhatsApp = (study: CellStudy) => {
    const formattedText = `📖 *Estudio de Célula: ${study.title}*\n_${study.category}_\n${study.description ? '\n' + study.description + '\n' : ''}\n👉 Enlace al estudio para leer y descargar:\n${study.link}`;
    const escapedText = encodeURIComponent(formattedText);
    window.open(`https://api.whatsapp.com/send?text=${escapedText}`, '_blank');
  };

  if (loading || !isAuthReady) {
    return (
      <div className="pt-32 pb-24 text-center text-primary/60 min-h-screen flex items-center justify-center font-bold">
        Cargando espacio de líderes...
      </div>
    );
  }

  // Filter reports according to selected leader if Admin seeks filters
  const visibleReports = reports.filter(r => {
    if (selectedLeaderFilter === 'all') return true;
    return r.leaderName.toLowerCase() === selectedLeaderFilter.toLowerCase();
  });

  // Get list of unique leader names for filtering statistics (admins only)
  const activeLeadersList = Array.from(new Set(reports.map(r => r.leaderName)));

  // Calculate Aggregated Metrics
  const totalReportsNum = visibleReports.length;
  const sumBelievers = visibleReports.reduce((acc, cr) => acc + (cr.believersCount || 0), 0);
  const sumNonBelievers = visibleReports.reduce((acc, cr) => acc + (cr.nonBelieversCount || 0), 0);
  const sumTotalPresent = visibleReports.reduce((acc, cr) => acc + (cr.totalPresent || 0), 0);
  const averagePresent = totalReportsNum > 0 ? (sumTotalPresent / totalReportsNum).toFixed(1) : '0';

  // Format statistics dataset for AreaChart trend
  // Sort chronological
  const chartDataset = [...visibleReports]
    .sort((a,b) => a.meetingDate.localeCompare(b.meetingDate))
    .slice(-10) // last 10 meetings
    .map(r => ({
      fecha: r.meetingDate.split('-').slice(1).reverse().join('/'), // DD/MM format
      Creyentes: r.believersCount,
      'No Creyentes': r.nonBelieversCount,
      Total: r.totalPresent,
      leader: r.leaderName
    }));

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner principal */}
        <div className="bg-gradient-to-br from-primary to-slate-900 rounded-[2rem] p-8 md:p-12 text-white mb-10 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/20 via-transparent to-transparent"></div>
          <div className="relative z-10 max-w-3xl">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono text-xs uppercase tracking-widest px-4 py-1.5 rounded-full font-bold inline-flex items-center gap-2 mb-6">
              <Shield className="w-3.5 h-3.5" /> Espacio de Liderazgo
            </span>
            <h1 className="text-4xl md:text-5xl font-kenao text-white mb-4">
              ¡Hola, {user?.displayName || 'Líder'}!
            </h1>
            <p className="text-slate-300 md:text-lg leading-relaxed">
              Bienvenido a tu panel de control de células de Huelva Church. Aquí puedes enviar los informes semanales de reunión, inspeccionar el progreso de las estadísticas y leer avisos oficiales del liderazgo general.
            </p>
          </div>
        </div>

        {/* Tab Selection Navigation Bar */}
        <div className="flex flex-col md:flex-row bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full md:max-w-fit mb-10 gap-1">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
              activeTab === 'form' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            Formulario
          </button>
          
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
              activeTab === 'stats' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            Estadísticas
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase relative ${
              activeTab === 'announcements' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            Avisos
            {announcements.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('studies')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
              activeTab === 'studies' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Estudios
          </button>

          <button
            onClick={() => setActiveTab('cell')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
              activeTab === 'cell' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            Mi Célula
          </button>
        </div>

        {/* Active Tab Elements Display */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: FORMULARIO DE REUNION */}
            {activeTab === 'form' && (
              <motion.div
                key="form-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Form column */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-kenao text-primary">Formulario</h2>
                    <p className="text-sm text-slate-400 mt-1">Completa estos datos al final del encuentro para actualizar el contador de estadísticas.</p>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Nombre del Líder</label>
                        <div className="relative">
                          <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="Escribe tu nombre..."
                            value={leaderName}
                            onChange={(e) => setLeaderName(e.target.value)}
                            className="pl-12 pr-4 py-3 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm text-primary font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Fecha de la Reunión</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                          <input
                            type="date"
                            required
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                            className="pl-12 pr-4 py-3 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm text-primary font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Twin Counters for Believers vs Non-Believers */}
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100/80">
                      <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-6 flex items-center gap-2">
                        <Users className="w-4 h-4 text-secondary" /> Participantes de la Reunión
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Believers */}
                        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider text-center mb-1">Creyentes</span>
                          <div className="flex items-center gap-4 mt-2">
                            <button
                              type="button"
                              onClick={() => setBelieversCount(prev => Math.max(0, prev - 1))}
                              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <span className="text-3xl font-bold font-kenao text-primary w-12 text-center">
                              {believersCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setBelieversCount(prev => prev + 1)}
                              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Non-Believers */}
                        <div className="flex flex-col items-center p-4 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider text-center mb-1">No Creyentes</span>
                          <div className="flex items-center gap-4 mt-2">
                            <button
                              type="button"
                              onClick={() => setNonBelieversCount(prev => Math.max(0, prev - 1))}
                              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <span className="text-3xl font-bold font-kenao text-primary w-12 text-center">
                              {nonBelieversCount}
                            </span>
                            <button
                              type="button"
                              onClick={() => setNonBelieversCount(prev => prev + 1)}
                              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600 transition-colors"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rich Names textareas */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                          Nombre de Creyentes *
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Introduce los nombres separados por comas (ej. Ana López, Juan Pérez, Carlos Sanz)..."
                          value={believersNames}
                          onChange={(e) => setBelieversNames(e.target.value)}
                          className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                          Nombre de No Creyentes *
                        </label>
                        <textarea
                          required
                          rows={3}
                          placeholder="Introduce sus nombres (escribe 'Ninguno' si no asistió ningún invitado no creyente esta semana)..."
                          value={nonBelieversNames}
                          onChange={(e) => setNonBelieversNames(e.target.value)}
                          className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">
                          Comentarios / Peticiones de Oración / Logros (Opcional)
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Anota cualquier testimonio especial de la reunión, peticiones urgentes de oración levantadas, o incidencias..."
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl bg-primary text-white font-bold hover:bg-secondary hover:text-primary tracking-wide transition-all uppercase shadow-md flex items-center justify-center select-none"
                    >
                      {isSubmitting ? (
                        <span>Enviando reporte...</span>
                      ) : (
                        <span>Enviar Reporte</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* Dynamic live calculation column */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2rem] p-6 text-white shadow-md text-center flex flex-col items-center justify-center min-h-[250px]">
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-white/80 mb-2">Total de Participantes</span>
                    <span className="text-[11px] text-white/75 max-w-[200px] mb-4">Calculado automáticamente (Creyentes + Nuevos)</span>
                    <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center border-4 border-white/30 backdrop-blur-md text-5xl font-bold font-kenao mb-4">
                      {believersCount + nonBelieversCount}
                    </div>
                    <p className="text-xs font-semibold max-w-[220px] text-amber-50">
                      Un reporte de estadísticas preciso nos ayuda a pastorear mejor la ciudad de Huelva. ¡Gracias por servir!
                    </p>
                  </div>

                  {/* Important guidance cards */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-primary mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-secondary shrink-0" /> Consejos para el Reporte
                    </h3>
                    <ul className="text-xs text-slate-500 space-y-3 font-medium">
                      <li className="flex gap-2">
                        <span className="text-secondary font-bold">•</span>
                        <span>Envía el informe a más tardar el día siguiente de la reunión celular.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-secondary font-bold">•</span>
                        <span>No satures los nombres; sepáralos de manera legible para que tus coordinadores puedan analizarlos.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-secondary font-bold">•</span>
                        <span>Los comentarios de testimonios y oraciones son leídos personalmente por el equipo pastoral para interceder por ellos.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: DETALLE DE ESTADISTICAS */}
            {activeTab === 'stats' && (
              <motion.div
                key="stats-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {/* Admin configuration panel for filtering leader statistics */}
                {isAdmin && reports.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div>
                      <h3 className="text-lg font-kenao text-primary">Consolidado General de Células</h3>
                      <p className="text-xs text-slate-400">Como Administrador, puedes filtrar las estadísticas por cada líder de grupo:</p>
                    </div>

                    <select
                      value={selectedLeaderFilter}
                      onChange={(e) => setSelectedLeaderFilter(e.target.value)}
                      className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none text-sm text-primary font-bold focus:ring-2 focus:ring-secondary min-w-[200px]"
                    >
                      <option value="all">Todos los líderes</option>
                      {activeLeadersList.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {reports.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-400 font-bold shadow-sm">
                    Todavía no has registrado ningún reporte semanal en tu historial de líderes.
                  </div>
                ) : (
                  <>
                    {/* Summary Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary font-kenao">{totalReportsNum}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Informes Enviados</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary font-kenao">{sumTotalPresent}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Asistencias Totales</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary font-kenao">{averagePresent}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Promedio por Reunión</p>
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-primary font-kenao">
                            {sumTotalPresent > 0 ? ((sumNonBelievers / sumTotalPresent) * 100).toFixed(0) : '0'}%
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Alcanzando Invitados</p>
                        </div>
                      </div>
                    </div>

                    {/* Chart Container */}
                    {chartDataset.length > 0 && (
                      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="mb-6 text-left">
                          <div>
                            <h3 className="text-xl font-kenao text-primary font-bold">Tendencia de Asistencia</h3>
                            <p className="text-xs text-slate-400 mt-1">Evolución de los últimos 10 encuentros registrados</p>
                          </div>
                          
                          <div className="flex gap-4 mt-4 text-xs font-bold uppercase tracking-wider">
                            <span className="flex items-center gap-1.5 text-primary">
                              <span className="w-3 h-3 bg-[#eab308] rounded-full"></span> Creyentes
                            </span>
                            <span className="flex items-center gap-1.5 text-primary">
                              <span className="w-3 h-3 bg-[#f43f5e] rounded-full"></span> No Creyentes
                            </span>
                          </div>
                        </div>

                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartDataset} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorCreyentes" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                                </linearGradient>
                                <linearGradient id="colorNuevos" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                                labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                              />
                              <Area type="monotone" dataKey="Creyentes" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorCreyentes)" />
                              <Area type="monotone" dataKey="No Creyentes" name="Invitados" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorNuevos)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Report Submission History Log Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-kenao text-primary">Histórico de Reportes</h3>
                          <p className="text-xs text-slate-400 mt-1">Registros de reuniones celulares almacenados en la base de datos</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400">Fecha</th>
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400">Líder</th>
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400 text-center">Creyentes</th>
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400 text-center">Invitados</th>
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400 text-center">Total</th>
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400 text-right">Detalles</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {visibleReports.map((report) => {
                              const isExpanded = expandedReportId === report.id;
                              return (
                                <React.Fragment key={report.id}>
                                  <tr className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-semibold text-primary">
                                      {report.meetingDate.split('-').reverse().join('/')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                      {report.leaderName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-slate-500 font-semibold">
                                      {report.believersCount}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-[#f43f5e] font-semibold">
                                      {report.nonBelieversCount}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                      <span className="px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-800 font-bold rounded-lg text-xs">
                                        {report.totalPresent}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => setExpandedReportId(isExpanded ? null : (report.id || null))}
                                          className="text-xs font-bold text-secondary hover:underline cursor-pointer"
                                        >
                                          {isExpanded ? 'Ocultar' : 'Ver más'}
                                        </button>
                                        
                                        {isAdmin && (
                                          <button
                                            onClick={() => handleDeleteReport(report.id)}
                                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                            title="Eliminar reporte de base de datos"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={6} className="bg-slate-50/80 px-8 py-6 text-sm text-slate-600 border-t border-b border-slate-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div>
                                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Nombres de Creyentes:</p>
                                            <p className="font-semibold text-primary">{report.believersNames || 'Ninguno especificado'}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Nombres de No Creyentes:</p>
                                            <p className="font-semibold text-primary">{report.nonBelieversNames || 'Ninguno especificado'}</p>
                                          </div>
                                        </div>
                                        {report.comments && (
                                          <div className="mt-4 pt-4 border-t border-slate-200/50">
                                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Comentarios y Peticiones:</p>
                                            <p className="italic text-slate-700 font-medium bg-white p-4 rounded-xl border border-slate-100 mt-1 whitespace-pre-line">{report.comments}</p>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* TAB 3: TABLON DE AVISOS */}
            {activeTab === 'announcements' && (
              <motion.div
                key="announcements-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Send and publish area - Visible for Admins */}
                <div className="lg:col-span-1 space-y-6">
                  {isAdmin ? (
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm">
                      <div className="mb-6">
                        <h2 className="text-xl font-kenao text-primary flex items-center gap-2">
                          <Send className="w-5 h-5 text-secondary" /> Difundir Mensaje
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Escribe anuncios, convocatorias u orientaciones importantes para la red de líderes.</p>
                      </div>

                      <form onSubmit={handlePublishAnnouncement} className="space-y-4">
                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Mensaje del Aviso</label>
                          <textarea
                            required
                            rows={5}
                            placeholder="Ej: Recuerden que esta semana es la Semana del Amigo de células, esforcémonos por invitar..."
                            value={newAnnouncement}
                            onChange={(e) => setNewAnnouncement(e.target.value)}
                            className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isPublishingAnnouncement || !newAnnouncement.trim()}
                          className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-secondary hover:text-primary transition-all uppercase tracking-wide text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                        >
                          Emitir Aviso Oficial
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-[2rem] border border-amber-100 p-8 shadow-sm text-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
                        <Bell className="w-6 h-6 animate-bounce" />
                      </div>
                      <h3 className="text-sm font-bold text-amber-950 uppercase tracking-wider mb-2">Canal de Avisos</h3>
                      <p className="text-xs text-amber-900/70 font-medium leading-relaxed">
                        Aquí verás los recordatorios de adiestramientos, eventos clave, plazos y mensajes de ánimo emitidos por tus coordinadores o pastores directamente de manera centralizada.
                      </p>
                    </div>
                  )}
                </div>

                {/* Announcements bulletin log list */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                      <Bell className="w-6 h-6 text-secondary" /> Tablón Informativo Semanal
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Sigue el hilo de los recordatorios actuales del liderazgo general.</p>
                  </div>

                  {announcements.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-400 font-bold shadow-sm">
                      No hay ningún aviso registrado actualmente para la red de líderes. ¡Que tengas una gran semana de bendición!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((ann) => (
                        <div 
                          key={ann.id}
                          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary/75 text-xs font-bold font-kenao">
                                {ann.authorName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-primary">{ann.authorName}</h4>
                                <span className="text-[10px] text-slate-400">
                                  {ann.createdAt ? new Date(ann.createdAt.toDate ? ann.createdAt.toDate() : ann.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recientemente'}
                                </span>
                              </div>
                            </div>

                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 absolute top-4 right-4"
                                title="Eliminar este aviso permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 mt-2">
                            {ann.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TAB 4: BIBLIOTECA DE ESTUDIOS */}
            {activeTab === 'studies' && (
              <motion.div
                key="studies-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Save study link form (Admin + Leader only) */}
                {isAdmin && (
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm">
                      <div className="mb-6">
                        <h2 className="text-xl font-kenao text-primary flex items-center gap-2">
                          <Plus className="w-5 h-5 text-secondary" /> Compartir Estudio
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Sube el enlace de la guía o estudio bíblico para que otros líderes puedan utilizarlo.</p>
                      </div>

                      <form onSubmit={handleAddStudySubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Título del Estudio</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Estudio sobre el Amor al Prójimo - Sem. 4"
                            value={studyTitle}
                            onChange={(e) => setStudyTitle(e.target.value)}
                            className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Enlace / URL</label>
                          <div className="relative">
                            <Link className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              required
                              placeholder="Ej: drive.google.com/... o huelvachurch.com/estudio"
                              value={studyLink}
                              onChange={(e) => setStudyLink(e.target.value)}
                              className="pl-11 pr-4 py-3.5 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Categoría</label>
                          <select
                            value={studyCategory}
                            onChange={(e) => setStudyCategory(e.target.value)}
                            className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium"
                          >
                            <option value="Estudio General">Estudio General</option>
                            <option value="Evangelismo">Evangelismo</option>
                            <option value="Oración & Discipulado">Oración & Discipulado</option>
                            <option value="Familia & Relaciones">Familia & Relaciones</option>
                            <option value="Fe & Teología">Fe & Teología</option>
                            <option value="Otros">Otros</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Descripción Corta (Opcional)</label>
                          <textarea
                            rows={3}
                            placeholder="Introduce un breve resumen o instrucciones del estudio..."
                            value={studyDescription}
                            onChange={(e) => setStudyDescription(e.target.value)}
                            className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium animate-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingStudy || !studyTitle.trim() || !studyLink.trim()}
                          className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-secondary hover:text-primary transition-all uppercase tracking-wide text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {isSubmittingStudy ? 'Añadiendo estudio...' : 'Agregar Estudio'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Library logs content list */}
                <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
                  <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-secondary" /> Biblioteca de Estudios
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Recursos y guías de estudios bíblicos disponibles para la red de líderes.</p>
                    </div>
                    <span className="shrink-0 bg-primary/10 text-primary font-mono text-xs font-bold px-3 py-1 rounded-full border border-primary/25">
                      {studies.length === 1 ? '1 recurso' : `${studies.length} recursos`}
                    </span>
                  </div>

                  {studies.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-400 font-bold shadow-sm">
                      📖 No hay estudios añadidos en la biblioteca todavía. {isAdmin ? '¡Añade el primer enlace a la izquierda!' : 'Espera a que un administrador añada estudios para verlos aquí.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {studies.map((study) => {
                        // Category helper inline
                        let catColor = "bg-amber-100 text-amber-900 border-amber-200";
                        if (study.category === "Evangelismo") {
                          catColor = "bg-rose-100 text-rose-800 border-rose-200";
                        } else if (study.category === "Oración & Discipulado") {
                          catColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                        } else if (study.category === "Familia & Relaciones") {
                          catColor = "bg-indigo-100 text-indigo-800 border-indigo-200";
                        } else if (study.category === "Fe & Teología") {
                          catColor = "bg-purple-100 text-purple-800 border-purple-200";
                        } else if (study.category === "Otros") {
                          catColor = "bg-slate-100 text-slate-700 border-slate-200";
                        }

                        return (
                          <div
                            key={study.id}
                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${catColor}`}>
                                  {study.category || 'Estudio General'}
                                </span>
                                
                                {(isAdmin || user?.uid === study.authorId) && (
                                  <button
                                    onClick={() => handleDeleteStudy(study.id, study.authorId)}
                                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all font-bold"
                                    title="Eliminar este estudio"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              <h3 className="text-base font-bold text-primary mb-2 line-clamp-2 md:h-12 flex items-start">
                                {study.title}
                              </h3>

                              <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed md:h-12 text-left">
                                {study.description || 'Sin descripción detallada.'}
                              </p>
                            </div>

                            <div className="border-t border-slate-50 pt-4 mt-2">
                              {/* Metadata of sender */}
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 uppercase font-kenao">
                                  {study.authorName ? study.authorName.slice(0, 2) : 'LC'}
                                </div>
                                <div className="min-w-0 text-left">
                                  <p className="text-[10px] font-semibold text-slate-700 truncate">Por {study.authorName}</p>
                                  <span className="text-[8px] text-slate-400">
                                    {study.createdAt ? new Date(study.createdAt.toDate ? study.createdAt.toDate() : study.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' }) : 'Reciente'}
                                  </span>
                                </div>
                              </div>

                              {/* Sharing Action Toolbar */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(study.id!, study.link)}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    copiedId === study.id
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {copiedId === study.id ? (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 animate-pulse" />
                                      ¡Copiado!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      Copiar Link
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleShareToWhatsApp(study)}
                                  className="py-2 px-3 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  WhatsApp
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'cell' && (
              <motion.div
                key="cell-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 max-w-4xl mx-auto"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-100 gap-4 text-left">
                  <div>
                    <h2 className="text-3xl font-kenao font-bold text-primary mb-2">Gestionar Datos de Mi Célula</h2>
                    <p className="text-sm text-slate-500">
                      Configure el punto de encuentro de su célula. Estos datos aparecerán de forma automática en la página de Ubicaciones pública de Huelva Church.
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Shield className="w-3.5 h-3.5" />
                      Líder Autorizado
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Form configuration column */}
                  <form onSubmit={handleSaveCellProfile} className="md:col-span-2 space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Nombre / Identificador de Célula
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.name}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, name: e.target.value })}
                          placeholder="Ej. Célula de Juan / Célula de Huerto Mena"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Nombre del Líder / Líderes
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.leader}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, leader: e.target.value })}
                          placeholder="Ej. Juan de Dios"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Día y Hora (Horario)
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.schedule}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, schedule: e.target.value })}
                          placeholder="Ej. Jueves, 20:00h"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Calle Principal / Dirección
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.address}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, address: e.target.value })}
                          placeholder="Ej. Calle San José 15"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Barriada / Zona
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.barriada}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, barriada: e.target.value })}
                          placeholder="Ej. Isla Chica / Centro"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Ciudad
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.ciudad}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, ciudad: e.target.value })}
                          placeholder="Ej. Huelva"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Enlace de Google Maps (Opcional)
                      </label>
                      <input
                        type="url"
                        value={cellProfileForm.googleMapsLink}
                        onChange={(e) => setCellProfileForm({ ...cellProfileForm, googleMapsLink: e.target.value })}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingCell}
                      className="px-6 py-3 bg-primary hover:bg-secondary hover:text-primary text-white font-bold rounded-xl transition-all uppercase tracking-wide text-xs disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isSavingCell ? 'Guardando...' : 'Guardar Información'}
                    </button>
                  </form>

                  {/* Shareable Box Column */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between text-left">
                    <div>
                      <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                        💡 Recurso de Relevo
                      </span>
                      <h3 className="text-lg font-kenao text-primary font-bold mb-3">Compartir Formulario</h3>
                      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                        ¿Un colaborador o hermano le ayudará a rellenar la asistencia hoy? Comparta su enlace único. No necesitan iniciar sesión para enviarlo, y se asociará inmediatamente a su perfil y estadísticas de célula.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleCopyCellLink}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm border ${
                          copiedCellLink 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-white text-primary border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {copiedCellLink ? (
                          <>
                            <CheckCircle className="w-4 h-4 animate-pulse" />
                            ¡Enlace Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar Enlace
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleShareFormToWhatsApp}
                        className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Share2 className="w-4 h-4" />
                        Enviar por WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop bg */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              style={{ contentVisibility: 'auto' }}
            />
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center z-10"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-kenao text-primary mb-3">¡Reporte Enviado!</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Tu reporte de reunión de célula semanal ha sido exitosamente registrado y consolidado en la base de datos de Huelva Church. ¡Gracias por tu dedicación!
              </p>
              
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab('stats'); // move to logs after submission
                }}
                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-secondary hover:text-primary transition-all uppercase tracking-wider text-xs"
              >
                Ver Historial
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
