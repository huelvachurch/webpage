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
  Link2Off,
  Copy,
  ExternalLink,
  Share2,
  X,
  Pencil,
  ChevronDown,
  UserCheck,
  Check
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
  getDocs,
  updateDoc,
  deleteField
} from 'firebase/firestore';
import { db, studiesDb, handleFirestoreError, OperationType } from '../firebase';
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
  believersBaptizedCount?: number;
  believersNotBaptizedCount?: number;
  believersBaptizedNames?: string;
  believersNotBaptizedNames?: string;
  comments: string;
  submittedAt: any;
}

interface LeaderAnnouncement {
  id?: string;
  supervisorId: string;
  supervisorName: string;
  title: string;
  message: string;
  createdAt: any;
  expiry?: string;
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
  const isLider = roles.includes('lider');

  // Tabs state
  const [activeTab, setActiveTab] = useState<'form' | 'stats' | 'announcements' | 'supervision' | 'cell' | 'attendees'>('form');

  const [readAnnouncements, setReadAnnouncements] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('read_notifs_leaders') || '[]');
    } catch {
      return [];
    }
  });

  const toggleReadAnnouncement = (id: string) => {
    const updated = readAnnouncements.includes(id)
      ? readAnnouncements.filter(x => x !== id)
      : [...readAnnouncements, id];
    setReadAnnouncements(updated);
    localStorage.setItem('read_notifs_leaders', JSON.stringify(updated));
  };

  const toggleReadContactNotification = async (notifId: string, currentRead: boolean) => {
    try {
      const docRef = doc(db, 'contact_notifications', notifId);
      await updateDoc(docRef, { readByLeader: !currentRead });
    } catch (err) {
      console.error("Error marking contact notification as read/unread:", err);
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

  // My Cell states
  const [cellProfile, setCellProfile] = useState<any>(null);
  const [isCellLoading, setIsCellLoading] = useState(false);
  const [cellProfileForm, setCellProfileForm] = useState({
    name: '',
    leader: '',
    schedule: 'Viernes 20:00hrs',
    address: '',
    barriada: '',
    ciudad: 'Huelva',
    googleMapsLink: '',
    lugar: 'Ciudad de Huelva',
    municipio: '',
    lugarDetalle: ''
  });
  const [isSavingCell, setIsSavingCell] = useState(false);
  const [copiedCellLink, setCopiedCellLink] = useState(false);

  // Co-leadership states
  const [coLedCell, setCoLedCell] = useState<any | null>(null);
  const [pendingInvitation, setPendingInvitation] = useState<any | null>(null);
  const [isCoLedLoading, setIsCoLedLoading] = useState(true);

  // Supervisor states
  const [supervisoresList, setSupervisoresList] = useState<any[]>([]);
  const [mySupervisorId, setMySupervisorId] = useState<string | null>(null);
  const [savedSupervisorId, setSavedSupervisorId] = useState<string | null>(null);
  const [isSavingSupervisor, setIsSavingSupervisor] = useState(false);

  // States for inviting others
  const [searchLeaderTerm, setSearchLeaderTerm] = useState('');
  const [foundLeaders, setFoundLeaders] = useState<any[]>([]);
  const [searchingLeaders, setSearchingLeaders] = useState(false);
  const [selectedLeaderToInvite, setSelectedLeaderToInvite] = useState<any | null>(null);
  const [isInvitingLeader, setIsInvitingLeader] = useState(false);

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

  // Attendees memory tags state
  const [newBaptizedName, setNewBaptizedName] = useState('');
  const [newNotBaptizedName, setNewNotBaptizedName] = useState('');
  const [newNonBelieverName, setNewNonBelieverName] = useState('');
  const [cellMembers, setCellMembers] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});

  // Synchronize counts and lists from active cell members
  useEffect(() => {
    const bBaptized = cellMembers.filter(m => m.activeCategory === 'bautizado');
    const bNotBaptized = cellMembers.filter(m => m.activeCategory === 'no_bautizado');
    const nBelievers = cellMembers.filter(m => m.activeCategory === 'no_creyente');

    const bCount = bBaptized.length + bNotBaptized.length;
    const nCount = nBelievers.length;

    const bNames = [
      bBaptized.map(m => m.name).join(', '),
      bNotBaptized.map(m => m.name).join(', ')
    ].filter(Boolean).join(', ');
    
    const nNames = nBelievers.map(m => m.name).join(', ') || 'Ninguno';

    setBelieversCount(bCount);
    setNonBelieversCount(nCount);
    setBelieversNames(bNames);
    setNonBelieversNames(nNames);
  }, [cellMembers]);

  // Firestore lists
  const [reports, setReports] = useState<MeetingReport[]>([]);
  const [announcements, setAnnouncements] = useState<LeaderAnnouncement[]>([]);
  const [studies, setStudies] = useState<CellStudy[]>([]);
  const [contactNotifications, setContactNotifications] = useState<any[]>([]);
  const [notificationToDelete, setNotificationToDelete] = useState<any>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  
  const [cellNoticeToDelete, setCellNoticeToDelete] = useState<any>(null);
  const [cellNoticeDeleteInput, setCellNoticeDeleteInput] = useState('');
  
  // Leader To Cell Notifications
  const [cellNotifications, setCellNotifications] = useState<any[]>([]);
  const [newCellNotification, setNewCellNotification] = useState({ title: '', message: '', expiry: '' });
  
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

  // Attendees filter search-category states
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeFilterCategory, setAttendeeFilterCategory] = useState<string>('all');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showMemberSearchResults, setShowMemberSearchResults] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'bautizado' as 'bautizado' | 'no_bautizado' | 'no_creyente',
    categories: [] as string[],
    birthDate: '',
    birthYearOptional: false,
    linkedUserId: ''
  });
  const [newMemberCategories, setNewMemberCategories] = useState<string[]>(['bautizado']);
  const [pendingUserCategories, setPendingUserCategories] = useState<Record<string, string[]>>({});

  // Library filters
  const [libraryMonth, setLibraryMonth] = useState(new Date().getMonth());
  const [libraryYear, setLibraryYear] = useState(new Date().getFullYear());

  // Dynamic Month & Year Filters for Biblioteca de Formularios derived from reports
  const availableYears = Array.from(new Set(
    reports
      .map(r => {
        if (!r.meetingDate) return null;
        const parts = r.meetingDate.split('-');
        return parts.length >= 3 ? parseInt(parts[0], 10) : null;
      })
      .filter((y): y is number => y !== null)
  )).sort((a, b) => b - a);

  const yearsToRender = availableYears.length > 0 ? availableYears : [new Date().getFullYear()];
  const currentLibraryYear = yearsToRender.includes(libraryYear) ? libraryYear : yearsToRender[0];

  const availableMonthsForSelectedYear = Array.from(new Set(
    reports
      .map(r => {
        if (!r.meetingDate) return null;
        const parts = r.meetingDate.split('-');
        if (parts.length < 3) return null;
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        return yr === currentLibraryYear ? mo : null;
      })
      .filter((m): m is number => m !== null)
  )).sort((a, b) => a - b);

  const monthNamesForLibrary = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const monthsToRender = availableMonthsForSelectedYear.length > 0 ? availableMonthsForSelectedYear : [new Date().getMonth()];
  const currentLibraryMonth = monthsToRender.includes(libraryMonth) ? libraryMonth : monthsToRender[0];

  // Discontinuous members colapsable state
  const [showDiscontinuosBaptized, setShowDiscontinuosBaptized] = useState(false);
  const [showDiscontinuosNotBaptized, setShowDiscontinuosNotBaptized] = useState(false);
  const [showDiscontinuosNonBelievers, setShowDiscontinuosNonBelievers] = useState(false);

  // Report editing states
  const [editingReportId, setEditingReportId] = useState<string | null>(null);

  const loadReportToEdit = (report: MeetingReport) => {
    setEditingReportId(report.id || null);
    setMeetingDate(report.meetingDate);
    setComments(report.comments || '');
    if (report.leaderName) {
      setLeaderName(report.leaderName);
    }
    
    // Parse present names to active state
    const bBaptizedNames = (report.believersBaptizedNames || '').split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
    const bNotBaptizedNames = (report.believersNotBaptizedNames || '').split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
    const nBelieverNames = (report.nonBelieversNames || '').split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
    
    setCellMembers(prev => prev.map(m => {
      const nameLower = m.name.toLowerCase().trim();
      let activeCategory: 'bautizado' | 'no_bautizado' | 'no_creyente' | null = null;
      if (bBaptizedNames.includes(nameLower)) {
        activeCategory = 'bautizado';
      } else if (bNotBaptizedNames.includes(nameLower)) {
        activeCategory = 'no_bautizado';
      } else if (nBelieverNames.includes(nameLower)) {
        activeCategory = 'no_creyente';
      } else if (report.believersNames) {
        // Fallback for older reports that didn't separate baptized vs non-baptized
        const listAllBelievers = report.believersNames.split(',').map(n => n.trim().toLowerCase()).filter(Boolean);
        if (listAllBelievers.includes(nameLower)) {
          activeCategory = (m.categories && m.categories[0] as any) || m.category || 'bautizado';
        }
      }
      return { ...m, isActive: !!activeCategory, activeCategory };
    }));
  };

  const handleCancelEditReport = () => {
    setEditingReportId(null);
    setMeetingDate(new Date().toISOString().split('T')[0]);
    setComments('');
    setCellMembers(prev => prev.map(m => ({ ...m, isActive: false, activeCategory: null })));
  };

  const calculateAttendanceCount = (memberName: string) => {
    if (!memberName) return 0;
    const lowerName = memberName.toLowerCase().trim();
    return reports.filter(r => {
      const bNames = (r.believersNames || '').toLowerCase();
      const nNames = (r.nonBelieversNames || '').toLowerCase();
      
      const bList = bNames.split(',').map(n => n.trim());
      const nList = nNames.split(',').map(n => n.trim());
      
      return bList.includes(lowerName) || nList.includes(lowerName);
    }).length;
  };

  const formatBirthDateDisplay = (birthDateStr: string, hideYear?: boolean) => {
    if (!birthDateStr) return '';
    const parts = birthDateStr.split('-');
    if (parts.length < 2) return '';
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    
    const year = parts.length === 3 ? parts[0] : '';
    const month = parseInt(parts.length === 3 ? parts[1] : parts[0], 10) - 1;
    const day = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
    
    const monthName = months[month] || '';
    if (hideYear || !year) {
      return `${day} de ${monthName}`;
    }
    return `${day} de ${monthName}, ${year}`;
  };

  const formatBirthdateDayOnly = (birthDateStr: string) => {
    if (!birthDateStr) return '';
    const parts = birthDateStr.split('-');
    if (parts.length < 2) return '';
    const day = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    const monthIndex = parseInt(parts.length === 3 ? parts[1] : parts[0], 10) - 1;
    return `${day} ${months[monthIndex] || ''}`;
  };

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
        const monthNum = parseInt(parts.length === 3 ? parts[1] : parts[0], 10) - 1;
        return monthNum === targetMonth;
      })
      .sort((a, b) => {
        const partsA = a.birthDate.split('-');
        const partsB = b.birthDate.split('-');
        const dayA = parseInt(partsA.length === 3 ? partsA[2] : partsA[1], 10);
        const dayB = parseInt(partsB.length === 3 ? partsB[2] : partsB[1], 10);
        return dayA - dayB;
      });
  };

  const getAgeToTurn = (birthDateStr: string) => {
    if (!birthDateStr) return 0;
    const parts = birthDateStr.split('-');
    if (parts.length < 1) return 0;
    const birthYear = parseInt(parts[0], 10);
    return new Date().getFullYear() - birthYear;
  };

  const getAge = (birthDateStr: string) => {
    if (!birthDateStr) return 0;
    const parts = birthDateStr.split('-');
    if (parts.length < 3) return 0;
    const birthYear = parseInt(parts[0], 10);
    const today = new Date();
    let age = today.getFullYear() - birthYear;
    
    const birthMonth = parseInt(parts[1], 10) - 1;
    const birthDay = parseInt(parts[2], 10);
    const monthDiff = today.getMonth() - birthMonth;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
      age--;
    }
    return age;
  };

  const handleUpdateMember = async (memberId: string, updatedData: { name: string, category: 'bautizado' | 'no_bautizado' | 'no_creyente', categories?: string[], birthDate?: string, birthYearOptional?: boolean, userId?: string | null }) => {
    try {
      const docRef = doc(db, 'cell_members', memberId);
      
      let finalBirthDate = updatedData.birthDate || '';
      if (updatedData.userId) {
        const linkedUser = systemUsers.find(u => u.id === updatedData.userId);
        if (linkedUser && linkedUser.birthDate) {
          finalBirthDate = linkedUser.birthDate;
        }
      }

      await setDoc(docRef, {
        name: updatedData.name.trim(),
        category: updatedData.category,
        categories: updatedData.categories || [updatedData.category],
        birthDate: finalBirthDate,
        birthYearOptional: !!updatedData.birthYearOptional,
        userId: updatedData.userId !== undefined ? updatedData.userId : undefined,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Update the linked user's celulaId and status as well
      if (updatedData.userId) {
        const userDocRef = doc(db, 'users', updatedData.userId);
        await setDoc(userDocRef, {
          celulaId: cellProfile?.id || effectiveLeaderId,
          celulaStatus: 'approved'
        }, { merge: true });
      }

      setEditingMemberId(null);
    } catch (err) {
      console.error("Error updating member:", err);
      alert("Error al guardar los cambios del asistente.");
    }
  };

  // Computed values for Co-Leadership support
  const isCoLeaderActive = coLedCell !== null;
  const effectiveLeaderId = isCoLeaderActive ? coLedCell.leaderId : (user?.uid || '');
  const effectiveLeaderName = isCoLeaderActive ? (coLedCell.leader || 'Co-Líder') : (user?.displayName || '');

  // Pre-fill leader name
  useEffect(() => {
    if (user && user.displayName) {
      setLeaderName(user.displayName);
    }
  }, [user]);

  // Real-time listener for cells where we are the active co-leader
  useEffect(() => {
    if (!user?.uid) return;
    
    const qCo = query(
      collection(db, 'celulas'), 
      where('coLeaderId', '==', user.uid),
      where('coLeaderInvitationStatus', '==', 'accepted')
    );
    
    const unsubscribe = onSnapshot(qCo, (snapshot) => {
      if (!snapshot.empty) {
        setCoLedCell({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setCoLedCell(null);
      }
      setIsCoLedLoading(false);
    }, (err) => {
      console.error("Error loading active co-led cells:", err);
      setIsCoLedLoading(false);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for cells where we have a pending co-leader invitation
  useEffect(() => {
    if (!user?.uid) return;
    
    const qPend = query(
      collection(db, 'celulas'), 
      where('coLeaderInviteeId', '==', user.uid),
      where('coLeaderInvitationStatus', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(qPend, (snapshot) => {
      if (!snapshot.empty) {
        setPendingInvitation({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setPendingInvitation(null);
      }
    }, (err) => {
      console.error("Error loading pending invitations:", err);
    });
    
    return () => unsubscribe();
  }, [user]);

  // Co-leadership methods
  const handleSearchLeaders = async () => {
    if (!searchLeaderTerm.trim()) return;
    setSearchingLeaders(true);
    try {
      const q = query(collection(db, 'users'), where('roles', 'array-contains', 'lider'));
      const snapshot = await getDocs(q);
      const results: any[] = [];
      snapshot.forEach(docSnap => {
        const u = docSnap.data();
        if (u.uid !== user?.uid) {
          const term = searchLeaderTerm.toLowerCase();
          const nameMatch = (u.displayName || '').toLowerCase().includes(term);
          const emailMatch = (u.email || '').toLowerCase().includes(term);
          if (nameMatch || emailMatch) {
            results.push({ id: docSnap.id, ...u });
          }
        }
      });
      setFoundLeaders(results);
    } catch (err) {
      console.error("Error searching leaders:", err);
    } finally {
      setSearchingLeaders(false);
    }
  };

  const handleInviteCoLeader = async () => {
    if (!cellProfile?.id || !selectedLeaderToInvite) return;
    setIsInvitingLeader(true);
    try {
      const cellRef = doc(db, 'celulas', cellProfile.id);
      await setDoc(cellRef, {
        coLeaderInviteeId: selectedLeaderToInvite.uid || selectedLeaderToInvite.id,
        coLeaderInviteeName: selectedLeaderToInvite.displayName || selectedLeaderToInvite.email || '',
        coLeaderInviteeEmail: selectedLeaderToInvite.email || '',
        coLeaderInvitationStatus: 'pending',
      }, { merge: true });
      setSelectedLeaderToInvite(null);
      setSearchLeaderTerm('');
      setFoundLeaders([]);
      alert("¡Invitación a Co-Liderar enviada con éxito!");
    } catch (err) {
      console.error("Error inviting co-leader:", err);
      alert("Error al enviar la invitación.");
    } finally {
      setIsInvitingLeader(false);
    }
  };

  const handleRemoveCoLeader = async () => {
    if (!cellProfile?.id) return;
    if (!window.confirm("¿Está seguro de que desea remover al Co-Líder o cancelar la invitación pendiente?")) return;
    
    try {
      const cellRef = doc(db, 'celulas', cellProfile.id);
      await setDoc(cellRef, {
        coLeaderId: null,
        coLeaderName: null,
        coLeaderEmail: null,
        coLeaderInviteeId: null,
        coLeaderInviteeName: null,
        coLeaderInviteeEmail: null,
        coLeaderInvitationStatus: null
      }, { merge: true });
      alert("Se ha removido el Co-Líder o cancelado la invitación.");
    } catch (err) {
      console.error("Error removing co-leader:", err);
      alert("Error al remover el Co-Líder.");
    }
  };

  const handleAcceptCoLeadership = async (cellId: string) => {
    try {
      const cellRef = doc(db, 'celulas', cellId);
      await setDoc(cellRef, {
        coLeaderId: user.uid,
        coLeaderName: user.displayName || user.email,
        coLeaderEmail: user.email,
        coLeaderInvitationStatus: 'accepted',
        coLeaderInviteeId: null,
        coLeaderInviteeName: null,
        coLeaderInviteeEmail: null
      }, { merge: true });
      alert("¡Has aceptado la Co-Lideración con éxito!");
    } catch (err) {
      console.error("Error accepting co-leadership:", err);
      alert("Error al aceptar la Co-Lideración.");
    }
  };

  const handleDeclineCoLeadership = async (cellId: string) => {
    try {
      const cellRef = doc(db, 'celulas', cellId);
      await setDoc(cellRef, {
        coLeaderInviteeId: null,
        coLeaderInviteeName: null,
        coLeaderInviteeEmail: null,
        coLeaderInvitationStatus: null
      }, { merge: true });
      alert("Has rechazado la invitación de Co-Liderazgo.");
    } catch (err) {
      console.error("Error declining co-leadership:", err);
      alert("Error al rechazar.");
    }
  };

  const handleLeaveCoLeadership = async (cellId: string) => {
    if (!window.confirm("¿Está seguro de que desea dejar de co-liderar esta célula?")) return;
    try {
      const cellRef = doc(db, 'celulas', cellId);
      await setDoc(cellRef, {
        coLeaderId: null,
        coLeaderName: null,
        coLeaderEmail: null,
        coLeaderInvitationStatus: null
      }, { merge: true });
      alert("Has dejado el Co-Liderazgo de esta célula.");
    } catch (err) {
      console.error("Error leaving co-leadership:", err);
      alert("Error al dejar el Co-Liderazgo.");
    }
  };

  // Load cell profile in real-time
  useEffect(() => {
    if (!user?.uid) return;
    
    setIsCellLoading(true);

    if (isCoLeaderActive && coLedCell) {
      setCellProfile(coLedCell);
      setCellProfileForm({
        name: coLedCell.name || '',
        leader: coLedCell.leader || '',
        schedule: coLedCell.schedule || 'Viernes 20:00hrs',
        address: coLedCell.address || '',
        barriada: coLedCell.barriada || '',
        ciudad: coLedCell.ciudad || 'Huelva',
        googleMapsLink: coLedCell.googleMapsLink || '',
        lugar: coLedCell.lugar || (coLedCell.ciudad === 'Sevilla' ? 'Sevilla' : coLedCell.ciudad === 'Portugal' ? 'Portugal' : 'Ciudad de Huelva'),
        municipio: coLedCell.municipio || '',
        lugarDetalle: coLedCell.lugarDetalle || ''
      });
      setIsCellLoading(false);
      return;
    }

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
          schedule: data.schedule || 'Viernes 20:00hrs',
          address: data.address || '',
          barriada: data.barriada || '',
          ciudad: data.ciudad || 'Huelva',
          googleMapsLink: data.googleMapsLink || '',
          lugar: data.lugar || (data.ciudad === 'Sevilla' ? 'Sevilla' : data.ciudad === 'Portugal' ? 'Portugal' : 'Ciudad de Huelva'),
          municipio: data.municipio || '',
          lugarDetalle: data.lugarDetalle || ''
        });
      } else {
        setCellProfile(null);
        setCellProfileForm({
          name: '',
          leader: user.displayName || '',
          schedule: 'Viernes 20:00hrs',
          address: '',
          barriada: '',
          ciudad: 'Huelva',
          googleMapsLink: '',
          lugar: 'Ciudad de Huelva',
          municipio: '',
          lugarDetalle: ''
        });
      }
      setIsCellLoading(false);
    }, (err) => {
      console.error("Error loading cell profile:", err);
      setIsCellLoading(false);
    });

    return () => unsubscribe();
  }, [user, isCoLeaderActive, coLedCell]);

  const handleSaveSupervisor = async (newSupervisorId: string) => {
    if (!user) return;
    setIsSavingSupervisor(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        supervisorId: newSupervisorId || null
      });
      alert('Supervisor actualizado correctamente.');
    } catch (error) {
      console.error(error);
      alert('Hubo un error al actualizar el supervisor.');
    } finally {
      setIsSavingSupervisor(false);
    }
  };

  const handleSaveCellProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSavingCell(true);
    try {
      const dataToSave = {
        leaderId: user.uid,
        leader: cellProfileForm.leader || user.displayName || '',
        name: 'Célula de ' + (cellProfileForm.leader || user.displayName || 'Líder'),
        schedule: cellProfileForm.schedule || 'Viernes 20:00hrs',
        address: cellProfileForm.address || '',
        barriada: cellProfileForm.lugar === 'Ciudad de Huelva' ? (cellProfileForm.barriada || '') : '',
        ciudad: cellProfileForm.lugar === 'Sevilla' ? 'Sevilla' : cellProfileForm.lugar === 'Portugal' ? 'Portugal' : 'Huelva',
        googleMapsLink: cellProfileForm.googleMapsLink || '',
        lugar: cellProfileForm.lugar || 'Ciudad de Huelva',
        municipio: cellProfileForm.lugar === 'Otro Municipio de Huelva' ? (cellProfileForm.municipio || '') : '',
        lugarDetalle: cellProfileForm.lugar === 'Otro' ? (cellProfileForm.lugarDetalle || '') : ''
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

  const handleResetCellProfile = async () => {
    if (!user?.uid || isCoLeaderActive) return;
    if (!window.confirm("¿Está seguro de que desea restablecer los datos de su célula? Esto eliminará la ubicación del mapa.")) return;
    
    setIsSavingCell(true);
    try {
      if (cellProfile?.id) {
        await deleteDoc(doc(db, 'celulas', cellProfile.id));
      } else {
        await deleteDoc(doc(db, 'celulas', user.uid));
      }
      setCellProfile(null);
      setCellProfileForm({
        name: '',
        leader: user.displayName || '',
        schedule: 'Viernes 20:00hrs',
        address: '',
        barriada: '',
        ciudad: 'Huelva',
        googleMapsLink: '',
        lugar: 'Ciudad de Huelva',
        municipio: '',
        lugarDetalle: ''
      });
      alert("¡Los datos de su célula han sido restablecidos con éxito!");
    } catch (err) {
      console.error("Error resetting cell profile:", err);
      alert("Error al restablecer los datos.");
    } finally {
      setIsSavingCell(false);
    }
  };

  const handleCopyCellLink = () => {
    const linkToCopy = `${window.location.origin}/asistencia-compartida?leaderId=${effectiveLeaderId}`;
    navigator.clipboard.writeText(linkToCopy);
    setCopiedCellLink(true);
    setTimeout(() => setCopiedCellLink(false), 3000);
  };

  const handleShareFormToWhatsApp = () => {
    const link = `${window.location.origin}/asistencia-compartida?leaderId=${effectiveLeaderId}`;
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

  // Load notices from supervisor
  useEffect(() => {
    if (!isLider || !user || !mySupervisorId) {
      setAnnouncements([]);
      return;
    }

    const q = query(
      collection(db, 'supervisor_notifications'),
      where('supervisorId', '==', mySupervisorId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort in JS to avoid index requirements
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAnnouncements(list);
    }, (err) => {
      console.error("Error loading supervisor_notifications:", err);
    });

    return () => unsubscribe();
  }, [isLider, user, mySupervisorId]);

  // Load cell_notifications
  useEffect(() => {
    if (!isLider || !user) return;
    
    // El leaderId debe ser user.uid (luego se puede adaptar a effectiveLeaderId si hay polifacetismo)
    const q = query(
      collection(db, 'cell_notifications'),
      where('leaderId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCellNotifications(list);
    }, (err) => {
      console.error("Error loading cell_notifications", err);
    });

    return () => unsubscribe();
  }, [isLider, user]);

  // Load contact_notifications (Join a cell form entries)
  useEffect(() => {
    if (!isLider || !user) return;
    
    const q = query(
      collection(db, 'contact_notifications'),
      where('leaderId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setContactNotifications(list);
    }, (err) => {
      console.error("Error loading contact_notifications", err);
    });

    return () => unsubscribe();
  }, [isLider, user]);

  // Load reports based on user (each leader loads only their own, even if they are Admin)
  useEffect(() => {
    if (!isLider || !user || !effectiveLeaderId) return;

    const q = query(
      collection(db, 'meeting_reports'),
      where('leaderId', '==', effectiveLeaderId),
      orderBy('meetingDate', 'desc')
    );

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
  }, [isLider, user, effectiveLeaderId]);

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

  // Load Cell Members / Attendees Memory list in real-time
  useEffect(() => {
    if (!isLider || !user || !effectiveLeaderId) return;

    const q = query(
      collection(db, 'cell_members'),
      where('leaderId', '==', effectiveLeaderId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });

      // Merge with local state to preserve activeCategory toggles
      setCellMembers((prev) => {
        return list.map(dbMember => {
          const existing = prev.find(p => p.id === dbMember.id || (p.name.toLowerCase() === dbMember.name.toLowerCase()));
          return {
            ...dbMember,
            activeCategory: existing ? existing.activeCategory : null
          };
        });
      });
    }, (error) => {
      console.error("Error loading cell members:", error);
    });

    return () => unsubscribe();
  }, [isLider, user, effectiveLeaderId]);

  // Load pending cell users
  useEffect(() => {
    if (!isLider || !user || !cellProfile?.id) return;

    // Load available users for linking
    const loadSystemUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setSystemUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error loading system users:", err);
      }
    };
    loadSystemUsers();

    const q = query(
      collection(db, 'users'),
      where('celulaId', '==', cellProfile.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const u = { id: doc.id, ...doc.data() } as any;
        if (u.celulaStatus === 'pending') {
          list.push(u);
        }
      });
      setPendingMembers(list);
    }, (error) => {
      console.error("Error loading pending cell users:", error);
    });

    return () => unsubscribe();
  }, [isLider, user, cellProfile]);

  // Load supervisors and mySupervisorId
  useEffect(() => {
    if (!isLider || !user) return;
    
    // Load current user's supervisor
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const udata = docSnap.data();
        setMySupervisorId(udata.supervisorId || null);
        setSavedSupervisorId(udata.supervisorId || null);
      }
    }, (err) => {
      console.error("Error loading user supervisor data:", err);
    });

    // Load available supervisors
    const qSup = query(collection(db, 'users'), where('roles', 'array-contains', 'supervisor'));
    getDocs(qSup).then(snap => {
      const sList: any[] = [];
      snap.forEach(d => {
        sList.push({ id: d.id, ...d.data() });
      });
      setSupervisoresList(sList);
    }).catch(err => {
      console.error("Error loading supervisors:", err);
    });

    return () => unsubUser();
  }, [isLider, user]);

  // Helper to toggle active status of a loaded tag under a specific category
  const toggleMemberActive = (memberId: string, category: 'bautizado' | 'no_bautizado' | 'no_creyente') => {
    setCellMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          activeCategory: m.activeCategory === category ? null : category
        };
      }
      return m;
    }));
  };

  const [memberToUnlink, setMemberToUnlink] = useState<any | null>(null);
  const [releaseInput, setReleaseInput] = useState('');

  const handleDeleteMember = async (memberId: string) => {
    if (memberId.startsWith('temp-')) {
      setCellMembers(prev => prev.filter(m => m.id !== memberId));
      return;
    }
    
    try {
      const member = cellMembers.find(m => m.id === memberId);
      
      if (member && member.userId) {
        // Desvincular al usuario
        const userRef = doc(db, 'users', member.userId);
        await setDoc(userRef, {
          celulaId: null,
          celulaStatus: null
        }, { merge: true });

        // Update the member doc to remove the userId, meaning they are now just an offline assistant
        const memberRef = doc(db, 'cell_members', memberId);
        await setDoc(memberRef, { userId: null }, { merge: true });

        setCellMembers(prev => prev.map(m => m.id === memberId ? { ...m, userId: null } : m));
        alert("El usuario de la app ha sido desvinculado de la célula. Se mantiene como asistente sin vinculación en lista para conservar las estadísticas, y el usuario ahora puede unirse a otra célula.");
      } else {
        alert("Este asistente no tiene un usuario de la app vinculado. Para no alterar las estadísticas históricas de asistencia, se mantiene en la lista.");
      }
    } catch (err) {
      console.error("Error unlinking member:", err);
      alert("Error al procesar la desvinculación.");
    }
  };

  const handleAcceptPending = async (pendingUser: any, categories: string[], linkToMemberId: string) => {
    try {
      if (categories.length === 0) {
        alert("Por favor, seleccione al menos un estado.");
        return;
      }

      // 1. Update user document
      const userRef = doc(db, 'users', pendingUser.id);
      await setDoc(userRef, {
        celulaStatus: 'approved'
      }, { merge: true });

      // 2. Add them to cell_members or link them
      if (linkToMemberId !== 'new') {
        const docRef = doc(db, 'cell_members', linkToMemberId);
        const updateObj: any = { userId: pendingUser.id };
        if (pendingUser.birthDate) {
          updateObj.birthDate = pendingUser.birthDate;
        }
        await setDoc(docRef, updateObj, { merge: true });
      } else {
        const trimmedName = (pendingUser.displayName || pendingUser.email).split('@')[0].trim();
        const newMemberDoc: any = {
          leaderId: effectiveLeaderId,
          userId: pendingUser.id,
          name: trimmedName,
          category: categories[0] as 'bautizado' | 'no_bautizado' | 'no_creyente', // Fallback
          categories: categories,
          consecutiveAbsences: 0,
          updatedAt: new Date().toISOString()
        };
        if (pendingUser.birthDate) {
          newMemberDoc.birthDate = pendingUser.birthDate;
        }
        await addDoc(collection(db, 'cell_members'), newMemberDoc);
      }

      alert("Usuario aceptado" + (linkToMemberId !== 'new' ? " y vinculado correctamente." : " e ingresado como nuevo asistente."));
    } catch (err) {
      console.error("Error accepting pending user:", err);
      alert("Error al aceptar al usuario.");
    }
  };

  const handleRejectPending = async (pendingUserId: string) => {
    if (!window.confirm("¿Estás seguro de rechazar esta petición? El usuario tendrá que elegir otra célula.")) return;
    try {
      const userRef = doc(db, 'users', pendingUserId);
      await updateDoc(userRef, {
        celulaId: deleteField(),
        celulaStatus: deleteField()
      });
      alert("La petición ha sido desestimada con éxito.");
    } catch (err) {
      console.error("Error rejecting pending user:", err);
      alert("Error al desestimar la petición.");
      handleFirestoreError(err, OperationType.UPDATE, `users/${pendingUserId}`);
    }
  };

  // Helper to add new attendee name to a sub-category in Firestore memory and auto-activate it
  const handleAddNewMember = async (name: string, category: 'bautizado' | 'no_bautizado' | 'no_creyente', clearInput: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check if duplicate already exists locally (by name regardless of category)
    const exists = cellMembers.find(
      m => m.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (exists) {
      // If found, ensure this category is in their categories list, and activate it for this category!
      const currentCats = exists.categories || [exists.category || 'bautizado'];
      const nextCats = currentCats.includes(category) ? currentCats : [...currentCats, category];
      
      try {
        if (!currentCats.includes(category)) {
          // Sync with Firestore DB
          const docRef = doc(db, 'cell_members', exists.id);
          await setDoc(docRef, {
            categories: nextCats,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.error("Error updating categories:", err);
      }

      setCellMembers(prev => prev.map(m => m.id === exists.id ? { 
        ...m, 
        categories: nextCats,
        activeCategory: category
      } : m));
      clearInput();
      return;
    }

    // Create a local temporary item for zero-latency UI feedback
    const tempId = 'temp-' + Date.now();
    const tempMember = {
      id: tempId,
      name: trimmed,
      category, // fallback
      categories: [category],
      consecutiveAbsences: 0,
      activeCategory: category
    };

    setCellMembers(prev => [...prev, tempMember]);
    clearInput();

    try {
      // Create document in database
      await addDoc(collection(db, 'cell_members'), {
        leaderId: effectiveLeaderId,
        name: trimmed,
        category, // fallback for backward-compatibility
        categories: [category],
        consecutiveAbsences: 0,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error creating cell member document:", err);
    }
  };

  // Create report submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const resolvedLeaderName = leaderName.trim() || cellProfile?.leader || user.displayName || user.email || 'Líder de Célula';

    setIsSubmitting(true);
    try {
      const activeBaptizedNames = cellMembers.filter(m => m.activeCategory === 'bautizado').map(m => m.name).join(', ');
      const activeNotBaptizedNames = cellMembers.filter(m => m.activeCategory === 'no_bautizado').map(m => m.name).join(', ');
      const activeNonBelieversNames = cellMembers.filter(m => m.activeCategory === 'no_creyente').map(m => m.name).join(', ');

      const countBaptized = cellMembers.filter(m => m.activeCategory === 'bautizado').length;
      const countNotBaptized = cellMembers.filter(m => m.activeCategory === 'no_bautizado').length;
      const countNonBelievers = cellMembers.filter(m => m.activeCategory === 'no_creyente').length;

      const calculatedBelieversCount = countBaptized + countNotBaptized;
      const calculatedNonBelieversCount = countNonBelievers;

      const newReport: any = {
        leaderId: effectiveLeaderId,
        leaderName: resolvedLeaderName,
        meetingDate,
        believersCount: calculatedBelieversCount,
        nonBelieversCount: calculatedNonBelieversCount,
        totalPresent: calculatedBelieversCount + calculatedNonBelieversCount,
        believersNames: [activeBaptizedNames, activeNotBaptizedNames].filter(Boolean).join(', '),
        nonBelieversNames: activeNonBelieversNames || 'Ninguno',
        believersBaptizedCount: countBaptized,
        believersNotBaptizedCount: countNotBaptized,
        believersBaptizedNames: activeBaptizedNames,
        believersNotBaptizedNames: activeNotBaptizedNames,
        comments: comments.trim(),
        submittedAt: serverTimestamp()
      };

      if (editingReportId) {
        try {
          await setDoc(doc(db, 'meeting_reports', editingReportId), newReport, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `meeting_reports/${editingReportId}`);
        }
        setEditingReportId(null);
      } else {
        try {
          await addDoc(collection(db, 'meeting_reports'), newReport);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'meeting_reports');
        }

        // Save absences memory tracking
        await Promise.all(
          cellMembers
            .filter(member => !member.id.startsWith('temp-'))
            .map(async (member) => {
              const memberDocRef = doc(db, 'cell_members', member.id);
              const isPresent = !!member.activeCategory;
              try {
                if (isPresent) {
                  // Reset consecutive absences
                  await setDoc(memberDocRef, {
                    consecutiveAbsences: 0,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                } else {
                  // Increment consecutive absences
                  const newAbsences = (member.consecutiveAbsences || 0) + 1;
                  // Save updated absences count (do not auto-delete to protect historical statistics)
                  await setDoc(memberDocRef, {
                    consecutiveAbsences: newAbsences,
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                }
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `cell_members/${member.id}`);
              }
            })
        );
      }

      // Reset the active status of cell members locally
      setCellMembers(prev => prev.map(m => ({ ...m, activeCategory: null })));

      // Clean up inputs and comments
      setComments('');
      setNewBaptizedName('');
      setNewNotBaptizedName('');
      setNewNonBelieverName('');
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error creating report:", err);
      alert('Error al enviar el reporte de reunión. Por favor, inténtelo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit announcement removed

  // Delete Meeting Report State
  const [confirmingDeleteReportId, setConfirmingDeleteReportId] = useState<string | null>(null);

  // Delete view removed

  // Leader to Cell Notifications
  const handlePublishCellNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCellNotification.message.trim()) return;
    try {
      await addDoc(collection(db, 'cell_notifications'), {
        leaderId: user.uid,
        leaderName: user.displayName || 'Tu Líder',
        title: newCellNotification.title.trim(),
        message: newCellNotification.message.trim(),
        expiry: newCellNotification.expiry,
        createdAt: new Date().toISOString()
      });
      setNewCellNotification({ title: '', message: '', expiry: '' });
      alert('Notificación enviada a los asistentes de tu célula.');
    } catch (err) {
      console.error(err);
      alert('Error enviando notificación.');
    }
  };

  const handleDeleteCellNotification = async () => {
    if (!cellNoticeToDelete) return;
    try {
      await deleteDoc(doc(db, 'cell_notifications', cellNoticeToDelete.id));
      setCellNoticeToDelete(null);
      setCellNoticeDeleteInput('');
    } catch (err) {
      console.error("Error deleting cell notification", err);
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

  // Delete Cell Study State
  const [confirmingDeleteStudyId, setConfirmingDeleteStudyId] = useState<string | null>(null);

  // Delete Cell Study Handler
  const handleDeleteStudy = async (id: string | undefined, authorId: string) => {
    if (!id) return;
    if (user?.uid !== authorId) {
      alert('Solo el creador del enlace puede eliminar este estudio.');
      return;
    }

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
      'Bautizados': r.believersBaptizedCount !== undefined ? r.believersBaptizedCount : Math.round((r.believersCount || 0) * 0.6),
      'No Bautizados': r.believersNotBaptizedCount !== undefined ? r.believersNotBaptizedCount : Math.round((r.believersCount || 0) * 0.4),
      'No Creyentes': r.nonBelieversCount || 0,
      Total: r.totalPresent,
      leader: r.leaderName
    }));

  // Expiration-aware announcements formatting
  const todayStr = (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const displayedAnnouncements = announcements.filter(ann => !ann.expiry || ann.expiry >= todayStr);

  const activeAnnouncementsForBadge = announcements.filter(ann => (!ann.expiry || ann.expiry >= todayStr) && !readAnnouncements.includes(ann.id));

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
              Bienvenido a tu panel de control de células de Huelva Church. Aquí puedes enviar los informes semanales de reunión, inspeccionar el progreso de las estadísticas y leer notificaciones oficiales del liderazgo general.
            </p>
          </div>
        </div>

        {/* Tab Selection Navigation Bar */}
        <div className="flex flex-col lg:grid lg:grid-cols-5 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full mb-10 gap-1">
          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('form'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
              activeTab === 'form' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            Formularios
          </button>

          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('attendees'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer ${
              activeTab === 'attendees' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            Asistentes
          </button>

          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('stats'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
              activeTab === 'stats' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0" />
            Estadísticas
          </button>

          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('announcements'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase relative ${
              activeTab === 'announcements' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4 shrink-0" />
            Notificaciones
            {activeAnnouncementsForBadge.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => { window.scrollTo(0, 0); setActiveTab('cell'); }}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
              activeTab === 'cell' 
                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                : 'text-slate-500 hover:text-primary hover:bg-slate-50'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            Configuración
          </button>
        </div>

        {/* Active Tab Elements Display */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* TAB: ASISTENTES */}
            {activeTab === 'attendees' && (
              <motion.div
                key="attendees-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Main section (takes up 2 columns) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Title and summary header */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-left">
                      <h2 className="text-xl font-kenao text-primary font-bold">Listado de Asistentes</h2>
                      <p className="text-xs text-slate-500 mt-1">Administra los nombres, categorías, cumpleaños y consulta el número de asistencias registradas.</p>
                    </div>
                    {/* Filter and control panel */}
                    <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200/50 rounded-full text-xs font-bold font-mono shrink-0">
                      {cellMembers.length} Registrados
                    </span>
                  </div>

                  {/* Peticiones Pendientes */}
                  {pendingMembers.length > 0 && (
                    <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4 text-left">
                      <h3 className="text-sm uppercase tracking-wider font-extrabold text-amber-800 flex items-center gap-2">
                         <Bell className="w-4 h-4" />
                         Peticiones de acceso ({pendingMembers.length})
                      </h3>
                      <div className="space-y-3 mt-4">
                        {pendingMembers.map(pendingUser => {
                          // Find auto-match for initial state if not in linkSelections
                          const trimmedName = (pendingUser.displayName || pendingUser.email || '').split('@')[0].trim().toLowerCase();
                          const autoMatch = cellMembers.find(m => (!m.userId || m.userId === pendingUser.id) && m.name.toLowerCase() === trimmedName);
                          const currentSelection = linkSelections[pendingUser.id] !== undefined ? linkSelections[pendingUser.id] : (autoMatch ? autoMatch.id : 'new');

                          return (
                            <div key={pendingUser.id} className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-amber-100 shadow-sm transition-all hover:border-amber-300">
                               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                 <div>
                                   <p className="font-bold text-slate-800 flex items-center gap-2">
                                     <User className="w-4 h-4 text-slate-400" />
                                     {pendingUser.displayName || pendingUser.email}
                                   </p>
                                   <p className="text-xs text-slate-500 mt-1">Desea formar parte de la célula.</p>
                                 </div>
                                 <div className="flex flex-col w-full sm:w-auto gap-2">
                                   <label className="text-[10px] uppercase font-bold text-slate-500">Vincular a:</label>
                                   <select
                                     className="w-full sm:w-auto text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
                                     value={currentSelection}
                                     onChange={(e) => setLinkSelections(prev => ({ ...prev, [pendingUser.id]: e.target.value }))}
                                   >
                                     <option value="new">-- Crear como nuevo --</option>
                                     {cellMembers.filter(m => !m.userId || m.userId === pendingUser.id).map(m => (
                                       <option key={m.id} value={m.id}>
                                         {m.name}
                                       </option>
                                     ))}
                                   </select>
                                 </div>
                               </div>

                               <div className="flex items-center flex-wrap sm:flex-nowrap justify-end border-t border-slate-50 pt-3 mt-3">
                                 {currentSelection === 'new' ? (
                                   <div className="w-full flex-col flex gap-3">
                                     <div>
                                       <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">Estado:</p>
                                       <div className="flex flex-wrap gap-2">
                                         {['bautizado', 'no_bautizado', 'no_creyente'].map((catCode) => {
                                           const currentCats = pendingUserCategories[pendingUser.id] || ['bautizado'];
                                           const isSelected = currentCats.includes(catCode);
                                           return (
                                             <button
                                               key={catCode}
                                               type="button"
                                               onClick={() => {
                                                 const newCats = isSelected
                                                   ? currentCats.filter(c => c !== catCode)
                                                   : [...currentCats, catCode];
                                                 setPendingUserCategories({ ...pendingUserCategories, [pendingUser.id]: newCats });
                                               }}
                                               className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border cursor-pointer select-none ${
                                                 isSelected
                                                   ? catCode === 'bautizado'
                                                     ? 'bg-amber-100 text-[#A18105] border-amber-300'
                                                     : catCode === 'no_bautizado'
                                                       ? 'bg-blue-100 text-primary border-blue-300'
                                                       : 'bg-slate-200 text-slate-600 border-slate-300'
                                                   : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                               }`}
                                             >
                                               {catCode === 'bautizado' && 'Creyente Bautizado'}
                                               {catCode === 'no_bautizado' && 'Creyente No Bautizado'}
                                               {catCode === 'no_creyente' && 'No Creyente'}
                                             </button>
                                           );
                                         })}
                                       </div>
                                     </div>
                                     <div className="flex justify-end gap-2">
                                       <button 
                                         type="button"
                                         onClick={() => handleRejectPending(pendingUser.id)}
                                         className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                       >
                                         Desestimar
                                       </button>
                                       <button 
                                         type="button"
                                         onClick={() => {
                                           const currentCats = pendingUserCategories[pendingUser.id] || ['bautizado'];
                                           handleAcceptPending(pendingUser, currentCats, 'new');
                                         }}
                                         className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                       >
                                         Aceptar
                                       </button>
                                     </div>
                                   </div>
                                 ) : (
                                   <div className="w-full flex justify-end gap-2 items-center">
                                     <button 
                                       type="button"
                                       onClick={() => handleRejectPending(pendingUser.id)}
                                       className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                     >
                                       Desestimar
                                     </button>
                                     <button 
                                       type="button"
                                       onClick={() => {
                                          const member = cellMembers.find(m => m.id === currentSelection);
                                          const memberCats = member?.categories || (member?.category ? [member.category] : ['bautizado']);
                                          handleAcceptPending(pendingUser, memberCats, currentSelection);
                                       }}
                                       className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                     >
                                       Aceptar
                                     </button>
                                   </div>
                                 )}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}



                  {/* List / Selection grid of assistants */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden text-left">
                    {/* Quick Filters */}
                    <div className="flex flex-col sm:flex-row border-b border-slate-100 p-4 justify-between items-center gap-4">
                      {/* Search bar */}
                      <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.currentTarget.value)}
                        className="px-3.5 py-2 w-full sm:max-w-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white outline-none text-xs text-primary"
                      />
                      {/* Category select filter */}
                      <div className="flex flex-wrap gap-1.5 self-stretch sm:self-auto justify-start sm:justify-end">
                        {['all', 'bautizado', 'no_bautizado', 'no_creyente'].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setAttendeeFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              attendeeFilterCategory === cat
                                ? cat === 'bautizado'
                                  ? 'bg-secondary text-primary font-bold shadow-sm'
                                  : cat === 'no_bautizado'
                                    ? 'bg-primary text-white font-bold shadow-sm'
                                    : cat === 'no_creyente'
                                      ? 'bg-slate-500 text-white font-bold shadow-sm'
                                      : 'bg-primary text-white font-bold shadow-sm' // 'all'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {cat === 'all' && 'Todos'}
                            {cat === 'bautizado' && 'Bautizados'}
                            {cat === 'no_bautizado' && 'No Bautizados'}
                            {cat === 'no_creyente' && 'No Creyentes'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Table or list items of cellMembers */}
                    <div className="divide-y divide-slate-100">
                      {cellMembers
                        .filter(member => {
                          const matchesName = member.name.toLowerCase().includes(attendeeSearch.toLowerCase());
                          const matchesCategory = attendeeFilterCategory === 'all' || (member.categories || [member.category || 'bautizado']).includes(attendeeFilterCategory);
                          return matchesName && matchesCategory;
                        })
                        .length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          No se encontraron asistentes para esta búsqueda.
                        </div>
                      ) : (
                        cellMembers
                          .filter(member => {
                            const matchesName = member.name.toLowerCase().includes(attendeeSearch.toLowerCase());
                            const matchesCategory = attendeeFilterCategory === 'all' || (member.categories || [member.category || 'bautizado']).includes(attendeeFilterCategory);
                            return matchesName && matchesCategory;
                          })
                          .map(member => {
                            const isCurrentlyEditing = editingMemberId === member.id;
                            const totalAttendances = calculateAttendanceCount(member.name);
                            
                            return (
                              <div key={member.id} className="p-4 md:p-5 transition-colors hover:bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                {isCurrentlyEditing ? (
                                  /* EDIT MODE FOR MEMBER */
                                  <form onSubmit={(ev) => {
                                    ev.preventDefault();
                                    if (editForm.categories.length === 0) {
                                      alert("Por favor, seleccione al menos un estado.");
                                      return;
                                    }
                                    handleUpdateMember(member.id, {
                                      name: editForm.name,
                                      category: editForm.categories[0] as any, // fallback
                                      categories: editForm.categories,
                                      birthDate: editForm.birthDate,
                                      birthYearOptional: editForm.birthYearOptional,
                                      userId: editForm.linkedUserId || null
                                    });
                                  }} className="flex-1 flex flex-col gap-5 text-left bg-white p-4 rounded-xl border border-slate-100 shadow-sm w-full">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nombre</label>
                                        <input
                                          type="text"
                                          required
                                          value={editForm.name}
                                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                          className="px-3 py-2 w-full bg-slate-50 rounded-lg border border-slate-200 outline-none text-xs text-primary font-semibold focus:bg-white focus:border-secondary"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Vinculación</label>
                                        {editForm.linkedUserId ? (
                                          (() => {
                                            const u = systemUsers.find(userItem => userItem.id === editForm.linkedUserId);
                                            return (
                                              <div className="flex items-center gap-2 px-3 py-2 w-full h-[34px] bg-teal-50 border border-teal-200 rounded-lg text-xs font-semibold text-teal-800 shrink-0 select-none">
                                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 animating-pulse" />
                                                <span className="truncate">
                                                  {u ? `${u.displayName || u.email} (${u.email || ''})` : 'Usuario Vinculado'}
                                                </span>
                                              </div>
                                            );
                                          })()
                                        ) : (
                                          <div className="relative">
                                            <div className="flex gap-1 relative">
                                              <input
                                                type="text"
                                                placeholder="Buscar por nombre o correo..."
                                                value={memberSearchTerm}
                                                onChange={(e) => {
                                                  setMemberSearchTerm(e.target.value);
                                                  setShowMemberSearchResults(true);
                                                }}
                                                className="px-3 py-2 flex-grow bg-slate-50 rounded-lg border border-slate-200 outline-none text-xs text-primary font-semibold focus:bg-white focus:border-secondary"
                                              />
                                              {memberSearchTerm && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setMemberSearchTerm('');
                                                    setShowMemberSearchResults(false);
                                                  }}
                                                  className="px-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-500 cursor-pointer text-xs"
                                                >
                                                  Clear
                                                </button>
                                              )}
                                            </div>

                                            {showMemberSearchResults && memberSearchTerm.trim().length > 0 && (
                                              <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 divide-y divide-slate-100">
                                                {(() => {
                                                  const term = memberSearchTerm.toLowerCase().trim();
                                                  const results = systemUsers.filter(u => {
                                                    const nameMatch = (u.displayName || '').toLowerCase().includes(term);
                                                    const emailMatch = (u.email || '').toLowerCase().includes(term);
                                                    if (!nameMatch && !emailMatch) return false;
                                                    
                                                    const isLinkedToOtherCell = u.celulaId && u.celulaId !== cellProfile?.id;
                                                    return !isLinkedToOtherCell;
                                                  });

                                                  if (results.length === 0) {
                                                    return (
                                                      <div className="p-3 text-center text-xs text-slate-400 italic">
                                                        No se encontraron usuarios sin vincular a otra célula.
                                                      </div>
                                                    );
                                                  }

                                                  return results.slice(0, 8).map(u => (
                                                    <button
                                                      key={u.id}
                                                      type="button"
                                                      onClick={() => {
                                                        setEditForm(prev => ({ ...prev, linkedUserId: u.id }));
                                                        setMemberSearchTerm('');
                                                        setShowMemberSearchResults(false);
                                                      }}
                                                      className="w-full text-left p-2.5 hover:bg-slate-50 transition-all flex items-center justify-between text-xs text-slate-700 font-medium cursor-pointer"
                                                    >
                                                      <div className="truncate pr-2">
                                                        <div className="font-bold text-slate-800 truncate">{u.displayName || 'Sin Nombre'}</div>
                                                        <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                                                      </div>
                                                      <div className="text-[10px] bg-secondary/20 hover:bg-secondary/30 text-indigo-950 font-bold px-2 py-1 rounded shrink-0">
                                                        Vincular
                                                      </div>
                                                    </button>
                                                  ));
                                                })()}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Estados</label>
                                        <div className="flex flex-wrap gap-2 py-1">
                                          {['bautizado', 'no_bautizado', 'no_creyente'].map((catCode) => {
                                            const isSelected = editForm.categories.includes(catCode);
                                            return (
                                              <button
                                                key={catCode}
                                                type="button"
                                                onClick={() => {
                                                  const newCats = isSelected
                                                    ? editForm.categories.filter(c => c !== catCode)
                                                    : [...editForm.categories, catCode];
                                                  setEditForm({ ...editForm, categories: newCats });
                                                }}
                                                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all border cursor-pointer select-none ${
                                                  isSelected
                                                    ? catCode === 'bautizado'
                                                      ? 'bg-amber-100 text-[#A18105] border-amber-300'
                                                      : catCode === 'no_bautizado'
                                                        ? 'bg-blue-100 text-primary border-blue-300'
                                                        : 'bg-slate-200 text-slate-600 border-slate-300'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                                }`}
                                              >
                                                {catCode === 'bautizado' && 'Creyente Bautizado'}
                                                {catCode === 'no_bautizado' && 'Creyente No Bautizado'}
                                                {catCode === 'no_creyente' && 'No Creyente'}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="w-full">
                                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nacimiento</label>
                                          <input
                                            type="date"
                                            value={editForm.birthDate}
                                            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                                            className="px-3 py-2 w-full bg-slate-50 rounded-lg border border-slate-200 outline-none text-xs text-primary font-semibold focus:bg-white focus:border-secondary"
                                          />
                                        </div>
                                        <div className="flex items-center pt-5 h-10 select-none">
                                          <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer whitespace-nowrap">
                                            <input
                                              type="checkbox"
                                              checked={editForm.birthYearOptional}
                                              onChange={(e) => setEditForm({ ...editForm, birthYearOptional: e.target.checked })}
                                              className="rounded text-primary focus:ring-secondary focus:ring-offset-0 border-slate-300 w-3.5 h-3.5"
                                            />
                                            <span>Sin Año</span>
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => setEditingMemberId(null)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200 cursor-pointer"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        type="submit"
                                        className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-primary text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                      >
                                        Guardar
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  /* READ-ONLY MODE FOR MEMBER */
                                  <>
                                    <div className="flex items-center gap-3 text-left">
                                      <div className="flex gap-0.5 shrink-0">
                                        {(member.categories || [member.category || 'bautizado']).includes('bautizado') && (
                                          <span className="w-2.5 h-2.5 rounded-full bg-secondary" title="Creyente Bautizado" />
                                        )}
                                        {(member.categories || [member.category || 'bautizado']).includes('no_bautizado') && (
                                          <span className="w-2.5 h-2.5 rounded-full bg-primary" title="Creyente No Bautizado" />
                                        )}
                                        {(member.categories || [member.category || 'bautizado']).includes('no_creyente') && (
                                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" title="No Creyente" />
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                          {member.name}
                                          {member.userId && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-md uppercase tracking-wider scale-95 select-none shrink-0">
                                              vinculado
                                            </span>
                                          )}
                                        </h4>
                                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                                          <div className="flex flex-wrap gap-1">
                                            {(member.categories || [member.category || 'bautizado']).map((catCode: string) => (
                                              <span 
                                                key={catCode} 
                                                className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                                  catCode === 'bautizado' 
                                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                                    : catCode === 'no_bautizado' 
                                                      ? 'bg-blue-50 text-primary border border-blue-100' 
                                                      : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                                                }`}
                                              >
                                                {catCode === 'bautizado' && 'Creyente Bautizado'}
                                                {catCode === 'no_bautizado' && 'Creyente No Bautizado'}
                                                {catCode === 'no_creyente' && 'No Creyente'}
                                              </span>
                                            ))}
                                          </div>
                                          {member.birthDate && (
                                            <>
                                              <span className="text-slate-200">•</span>
                                              <span>🎂 {formatBirthDateDisplay(member.birthDate, member.birthYearOptional)}</span>
                                              {!member.birthYearOptional && (
                                                <span className="text-slate-300">({getAge(member.birthDate)} años)</span>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Action items and registrations */}
                                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                                      {/* Attendance Calculation */}
                                      <div className="text-right">
                                        <span className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 font-mono">
                                          {totalAttendances} asistencias
                                        </span>
                                      </div>

                                      {/* Controls */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingMemberId(member.id);
                                            setMemberSearchTerm('');
                                            setShowMemberSearchResults(false);
                                            setEditForm({
                                              name: member.name || '',
                                              category: member.category || 'bautizado',
                                              categories: member.categories || [member.category || 'bautizado'],
                                              birthDate: member.birthDate || '',
                                              birthYearOptional: !!member.birthYearOptional,
                                              linkedUserId: member.userId || ''
                                            });
                                          }}
                                          className="p-1.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
                                          title="Modificar asistente"
                                        >
                                          <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setMemberToUnlink(member);
                                            setReleaseInput('');
                                          }}
                                          className="p-1.5 text-xs bg-red-50 text-red-650 hover:bg-red-100 border border-red-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center animate-none"
                                          title="Desvincular asistente"
                                        >
                                          <Link2Off className="w-3.5 h-3.5 text-red-600" />
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar Column: Birthday cards */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Card: Cumpleaños de este mes */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 text-left">
                    <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                      🎉 Listado de Cumpleaños
                    </span>
                    <h3 className="text-lg font-kenao text-primary font-bold mb-3">
                      Cumpleaños de {getCurrentMonthName(0)}
                    </h3>
                    
                    <div className="space-y-4 mt-4">
                      {getBirthdaysForMonth(0).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No hay ningún cumpleaños registrado para este mes.</p>
                      ) : (
                        getBirthdaysForMonth(0).map(m => (
                          <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm shrink-0">🎂</span>
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-slate-700">{m.name}</h4>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {m.category === 'bautizado' ? 'Bautizado' : m.category === 'no_bautizado' ? 'No Bautizado' : 'No Creyente'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-source-sans px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
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

                  {/* Card: Cumpleaños del siguiente mes */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 text-left">
                    <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                      📅 Siguiente Mes
                    </span>
                    <h3 className="text-lg font-kenao text-primary font-bold mb-3">
                      Cumpleaños de {getCurrentMonthName(1)}
                    </h3>
                    
                    <div className="space-y-4 mt-4">
                      {getBirthdaysForMonth(1).length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No hay ningún cumpleaños registrado para el siguiente mes.</p>
                      ) : (
                        getBirthdaysForMonth(1).map(m => (
                          <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                            <div className="flex items-center gap-2.5">
                              <span className="text-sm shrink-0">🎂</span>
                              <div className="text-left">
                                <h4 className="text-xs font-bold text-slate-700">{m.name}</h4>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  {m.category === 'bautizado' ? 'Bautizado' : m.category === 'no_bautizado' ? 'No Bautizado' : 'No Creyente'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-source-sans px-2 py-0.5 rounded-full bg-slate-100 text-slate-605 font-bold">
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
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2">Fecha de la Reunión</label>
                      <div className="relative w-full">
                        <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                        <input
                          id="meetingDateInput"
                          type="date"
                          required
                          value={meetingDate}
                          onChange={(e) => setMeetingDate(e.target.value)}
                          className="pl-12 pr-4 py-3 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm text-primary font-medium"
                        />
                      </div>
                    </div>

                    {/* Category 1: Creyentes Bautizados */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2 select-none">
                          <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                          Creyentes Bautizados
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-bold font-mono">
                          {cellMembers.filter(m => (m.categories || [m.category || 'bautizado']).includes('bautizado') && m.activeCategory === 'bautizado').length} Activos
                        </span>
                      </div>

                      {/* List of Tags */}
                      <div className="flex flex-col gap-3 py-1">
                        {cellMembers.filter(m => (m.categories || [m.category || 'bautizado']).includes('bautizado')).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No hay etiquetas en esta categoría aún. Añada una escribiendo abajo.</p>
                        ) : (
                          <>
                            {/* Regular Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                              {cellMembers
                                .filter(m => (m.categories || [m.category || 'bautizado']).includes('bautizado') && (m.consecutiveAbsences || 0) < 6)
                                .map(member => {
                                  const isBtnActive = member.activeCategory === 'bautizado';
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => toggleMemberActive(member.id, 'bautizado')}
                                      className={`px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isBtnActive
                                          ? 'bg-secondary text-primary border border-secondary/20 shadow-sm font-bold animate-none'
                                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{member.name}</span>
                                      {member.consecutiveAbsences > 0 && (
                                        <span className={`text-[9px] px-1 rounded-md ${isBtnActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                          -{member.consecutiveAbsences}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>

                            {/* Discontinuos collapsible section */}
                            {cellMembers.filter(m => (m.categories || [m.category || 'bautizado']).includes('bautizado') && (m.consecutiveAbsences || 0) >= 6).length > 0 && (
                              <div className="mt-1 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setShowDiscontinuosBaptized(!showDiscontinuosBaptized)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider select-none cursor-pointer"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDiscontinuosBaptized ? 'rotate-180' : ''}`} />
                                  <span>Discontinuos ({cellMembers.filter(m => (m.categories || [m.category || 'bautizado']).includes('bautizado') && (m.consecutiveAbsences || 0) >= 6).length})</span>
                                </button>
                                {showDiscontinuosBaptized && (
                                  <div className="flex flex-wrap gap-2 mt-2 pt-1">
                                    {cellMembers
                                      .filter(m => (m.categories || [m.category || 'bautizado']).includes('bautizado') && (m.consecutiveAbsences || 0) >= 6)
                                      .map(member => {
                                        const isBtnActive = member.activeCategory === 'bautizado';
                                        return (
                                          <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => toggleMemberActive(member.id, 'bautizado')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                              isBtnActive
                                                ? 'bg-secondary text-primary border border-secondary/20 shadow-sm font-bold animate-none'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 opacity-80'
                                            }`}
                                          >
                                            <span>{member.name}</span>
                                            <span className={`text-[9px] px-1 rounded-md ${isBtnActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                              -{member.consecutiveAbsences}
                                            </span>
                                          </button>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Input Box to add member */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Nombre del creyente bautizado..."
                          value={newBaptizedName}
                          onChange={(e) => setNewBaptizedName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewMember(newBaptizedName, 'bautizado', () => setNewBaptizedName(''));
                            }
                          }}
                          className="px-3.5 py-2 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-1 focus:ring-secondary focus:border-transparent outline-none transition-all text-xs text-primary font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewMember(newBaptizedName, 'bautizado', () => setNewBaptizedName(''))}
                          className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-primary text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir
                        </button>
                      </div>
                    </div>

                    {/* Category 2: Creyentes No Bautizados */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2 select-none">
                          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                          Creyentes No Bautizados
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-bold font-mono">
                          {cellMembers.filter(m => (m.categories || [m.category || 'no_bautizado']).includes('no_bautizado') && m.activeCategory === 'no_bautizado').length} Activos
                        </span>
                      </div>

                      {/* List of Tags */}
                      <div className="flex flex-col gap-3 py-1">
                        {cellMembers.filter(m => (m.categories || [m.category || 'no_bautizado']).includes('no_bautizado')).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No hay etiquetas en esta categoría aún. Añada una escribiendo abajo.</p>
                        ) : (
                          <>
                            {/* Regular Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                              {cellMembers
                                .filter(m => (m.categories || [m.category || 'no_bautizado']).includes('no_bautizado') && (m.consecutiveAbsences || 0) < 6)
                                .map(member => {
                                  const isBtnActive = member.activeCategory === 'no_bautizado';
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => toggleMemberActive(member.id, 'no_bautizado')}
                                      className={`px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isBtnActive
                                          ? 'bg-primary text-white border border-primary/20 shadow-sm animate-none'
                                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{member.name}</span>
                                      {member.consecutiveAbsences > 0 && (
                                        <span className={`text-[9px] px-1 rounded-md ${isBtnActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                          -{member.consecutiveAbsences}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>

                            {/* Discontinuos collapsible section */}
                            {cellMembers.filter(m => (m.categories || [m.category || 'no_bautizado']).includes('no_bautizado') && (m.consecutiveAbsences || 0) >= 6).length > 0 && (
                              <div className="mt-1 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setShowDiscontinuosNotBaptized(!showDiscontinuosNotBaptized)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider select-none cursor-pointer"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDiscontinuosNotBaptized ? 'rotate-180' : ''}`} />
                                  <span>Discontinuos ({cellMembers.filter(m => (m.categories || [m.category || 'no_bautizado']).includes('no_bautizado') && (m.consecutiveAbsences || 0) >= 6).length})</span>
                                </button>
                                {showDiscontinuosNotBaptized && (
                                  <div className="flex flex-wrap gap-2 mt-2 pt-1">
                                    {cellMembers
                                      .filter(m => (m.categories || [m.category || 'no_bautizado']).includes('no_bautizado') && (m.consecutiveAbsences || 0) >= 6)
                                      .map(member => {
                                        const isBtnActive = member.activeCategory === 'no_bautizado';
                                        return (
                                          <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => toggleMemberActive(member.id, 'no_bautizado')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                              isBtnActive
                                                ? 'bg-primary text-white border border-primary/20 shadow-sm animate-none'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 opacity-80'
                                            }`}
                                          >
                                            <span>{member.name}</span>
                                            <span className={`text-[9px] px-1 rounded-md ${isBtnActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                              -{member.consecutiveAbsences}
                                            </span>
                                          </button>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Input Box */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Nombre del creyente no bautizado..."
                          value={newNotBaptizedName}
                          onChange={(e) => setNewNotBaptizedName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewMember(newNotBaptizedName, 'no_bautizado', () => setNewNotBaptizedName(''));
                            }
                          }}
                          className="px-3.5 py-2 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-xs text-primary font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewMember(newNotBaptizedName, 'no_bautizado', () => setNewNotBaptizedName(''))}
                          className="px-4 py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir
                        </button>
                      </div>
                    </div>

                    {/* Category 3: No Creyentes */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2 select-none">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                          No Creyentes
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-bold font-mono">
                          {cellMembers.filter(m => (m.categories || [m.category || 'no_creyente']).includes('no_creyente') && m.activeCategory === 'no_creyente').length} Activos
                        </span>
                      </div>

                      {/* List of Tags */}
                      <div className="flex flex-col gap-3 py-1">
                        {cellMembers.filter(m => (m.categories || [m.category || 'no_creyente']).includes('no_creyente')).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No hay etiquetas en esta categoría aún. Añada una escribiendo abajo.</p>
                        ) : (
                          <>
                            {/* Regular Tags */}
                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                              {cellMembers
                                .filter(m => (m.categories || [m.category || 'no_creyente']).includes('no_creyente') && (m.consecutiveAbsences || 0) < 6)
                                .map(member => {
                                  const isBtnActive = member.activeCategory === 'no_creyente';
                                  return (
                                    <button
                                      key={member.id}
                                      type="button"
                                      onClick={() => toggleMemberActive(member.id, 'no_creyente')}
                                      className={`px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isBtnActive
                                          ? 'bg-slate-500 text-white border border-slate-500/20 shadow-sm font-bold animate-none'
                                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>{member.name}</span>
                                      {member.consecutiveAbsences > 0 && (
                                        <span className={`text-[9px] px-1 rounded-md ${isBtnActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                          -{member.consecutiveAbsences}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>

                            {/* Discontinuos collapsible section */}
                            {cellMembers.filter(m => (m.categories || [m.category || 'no_creyente']).includes('no_creyente') && (m.consecutiveAbsences || 0) >= 6).length > 0 && (
                              <div className="mt-1 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={() => setShowDiscontinuosNonBelievers(!showDiscontinuosNonBelievers)}
                                  className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider select-none cursor-pointer"
                                >
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDiscontinuosNonBelievers ? 'rotate-180' : ''}`} />
                                  <span>Discontinuos ({cellMembers.filter(m => (m.categories || [m.category || 'no_creyente']).includes('no_creyente') && (m.consecutiveAbsences || 0) >= 6).length})</span>
                                </button>
                                {showDiscontinuosNonBelievers && (
                                  <div className="flex flex-wrap gap-2 mt-2 pt-1">
                                    {cellMembers
                                      .filter(m => (m.categories || [m.category || 'no_creyente']).includes('no_creyente') && (m.consecutiveAbsences || 0) >= 6)
                                      .map(member => {
                                        const isBtnActive = member.activeCategory === 'no_creyente';
                                        return (
                                          <button
                                            key={member.id}
                                            type="button"
                                            onClick={() => toggleMemberActive(member.id, 'no_creyente')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                              isBtnActive
                                                ? 'bg-slate-500 text-white border border-slate-500/20 shadow-sm font-bold animate-none'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 opacity-80'
                                            }`}
                                          >
                                            <span>{member.name}</span>
                                            <span className={`text-[9px] px-1 rounded-md ${isBtnActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                              -{member.consecutiveAbsences}
                                            </span>
                                          </button>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Input Box */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Nombre del no creyente..."
                          value={newNonBelieverName}
                          onChange={(e) => setNewNonBelieverName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewMember(newNonBelieverName, 'no_creyente', () => setNewNonBelieverName(''));
                            }
                          }}
                          className="px-3.5 py-2 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-400 focus:border-transparent outline-none transition-all text-xs text-primary font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNewMember(newNonBelieverName, 'no_creyente', () => setNewNonBelieverName(''))}
                          className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Añadir
                        </button>
                      </div>
                    </div>

                    {/* Comments block */}
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 select-none">
                        Comentarios / Peticiones de Oración / Logros (Opcional)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Anota cualquier testimonio especial de la reunión, peticiones urgentes de oración levantadas, o de incidencias..."
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="p-4 w-full bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none transition-all text-sm font-medium animate-none"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        id="btnSubmitReport"
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex-1 py-4 rounded-xl font-bold tracking-wide transition-all uppercase shadow-md flex items-center justify-center select-none cursor-pointer ${
                          editingReportId 
                            ? 'bg-secondary text-primary hover:bg-secondary/90' 
                            : 'bg-primary text-white hover:bg-secondary hover:text-primary'
                        }`}
                      >
                        {isSubmitting ? (
                          <span>Enviando...</span>
                        ) : editingReportId ? (
                          <span>Modificar Reporte</span>
                        ) : (
                          <span>Enviar Reporte</span>
                        )}
                      </button>
                      
                      {editingReportId && (
                        <button
                          type="button"
                          onClick={handleCancelEditReport}
                          className="px-6 py-4 rounded-xl bg-slate-100 text-slate-655 font-bold hover:bg-slate-200 uppercase tracking-wide transition-all cursor-pointer border border-slate-200"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Dynamic live calculation column */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-amber-300 via-secondary to-amber-500 rounded-[2rem] p-6 text-primary shadow-md text-center flex flex-col items-center justify-center min-h-[250px] border border-amber-400/20">
                    <span className="text-xs uppercase tracking-widest font-mono font-bold text-primary/80 mb-4">Total de Participantes</span>
                    <div className="w-28 h-28 bg-[#2D4B73]/15 rounded-full flex items-center justify-center border-4 border-[#2D4B73]/30 backdrop-blur-sm text-5xl font-bold font-kenao mb-4 text-[#2D4B73]">
                      {believersCount + nonBelieversCount}
                    </div>
                    <p className="text-xs font-semibold max-w-[220px] text-primary/90">
                      Un reporte de estadísticas preciso nos ayuda a pastorear mejor la ciudad de Huelva. ¡Gracias por servir!
                    </p>
                  </div>

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

                  {/* Card: Biblioteca de Formularios creados */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 text-left space-y-4">
                    <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      🗄️ Historial
                    </span>
                    <h3 className="text-base font-kenao text-primary font-bold">
                      Biblioteca de Formularios
                    </h3>
                    <p className="text-xs text-slate-400">
                      Selecciona un informe de este mes/año para modificar sus datos.
                    </p>

                    {/* Month and Year Filter Selector Bar */}
                    <div className="grid grid-cols-2 gap-2 pb-2">
                      <select
                        value={currentLibraryMonth}
                        onChange={(e) => setLibraryMonth(parseInt(e.target.value, 10))}
                        className="px-2 py-1.5 w-full bg-slate-50 rounded-xl border border-slate-200 outline-none text-xs text-primary font-semibold"
                      >
                        {monthsToRender.map((mIdx) => (
                          <option key={mIdx} value={mIdx}>{monthNamesForLibrary[mIdx]}</option>
                        ))}
                      </select>

                      <select
                        value={currentLibraryYear}
                        onChange={(e) => setLibraryYear(parseInt(e.target.value, 10))}
                        className="px-2 py-1.5 w-full bg-slate-50 rounded-xl border border-slate-200 outline-none text-xs text-primary font-semibold"
                      >
                        {yearsToRender.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* List of reports for that month/year */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {reports.filter(r => {
                        if (!r.meetingDate) return false;
                        const parts = r.meetingDate.split('-');
                        if (parts.length < 3) return false;
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        return year === currentLibraryYear && month === currentLibraryMonth;
                      }).length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-4">No hay reportes este mes.</p>
                      ) : (
                        reports
                          .filter(r => {
                            if (!r.meetingDate) return false;
                            const parts = r.meetingDate.split('-');
                            if (parts.length < 3) return false;
                            const year = parseInt(parts[0], 10);
                            const month = parseInt(parts[1], 10) - 1;
                            return year === currentLibraryYear && month === currentLibraryMonth;
                          })
                          .sort((a, b) => b.meetingDate.localeCompare(a.meetingDate))
                          .map(r => (
                            <div key={r.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-100 transition-colors">
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-700">
                                  {formatBirthDateDisplay(r.meetingDate)}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {r.totalPresent || 0} Presentes
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  loadReportToEdit(r);
                                  document.getElementById('meetingDateInput')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 rounded-lg text-primary font-bold hover:bg-slate-50 transition-colors cursor-pointer shrink-0 animate-none"
                              >
                                Editar
                              </button>
                            </div>
                          ))
                      )}
                    </div>
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
                {/* Admin configuration panel removed */}

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
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Alcanzando No Creyentes</p>
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
                              <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                                labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                              />
                              <Area type="monotone" dataKey="Bautizados" stroke="#D9B70D" strokeWidth={3} fillOpacity={1} fill="url(#colorBautizados)" />
                              <Area type="monotone" dataKey="No Bautizados" stroke="#2D4B73" strokeWidth={3} fillOpacity={1} fill="url(#colorNoBautizados)" />
                              <Area type="monotone" dataKey="No Creyentes" stroke="#64748b" strokeWidth={3} fillOpacity={1} fill="url(#colorNoCreyentes)" />
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
                              <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-slate-400 text-center">No Creyentes</th>
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
                                        
                                      </div>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={6} className="bg-slate-50/80 px-8 py-6 text-sm text-slate-600 border-t border-b border-slate-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          <div>
                                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">Creyentes:</p>
                                            {report.believersBaptizedCount !== undefined ? (
                                              <div className="space-y-2 mt-1">
                                                <div>
                                                  <span className="font-bold text-xs text-slate-500">Bautizados ({report.believersBaptizedCount || 0}):</span>
                                                  <p className="font-semibold text-primary">{report.believersBaptizedNames || 'Ninguno especificado'}</p>
                                                </div>
                                                <div>
                                                  <span className="font-bold text-xs text-slate-500">No Bautizados ({report.believersNotBaptizedCount || 0}):</span>
                                                  <p className="font-semibold text-primary">{report.believersNotBaptizedNames || 'Ninguno especificado'}</p>
                                                </div>
                                              </div>
                                            ) : (
                                              <p className="font-semibold text-primary mt-1">{report.believersNames || 'Ninguno especificado'}</p>
                                            )}
                                          </div>
                                          <div>
                                            <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">No Creyentes ({report.nonBelieversCount || 0}):</p>
                                            <p className="font-semibold text-primary mt-1">{report.nonBelieversNames || 'Ninguno'}</p>
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

            {/* TAB 3: TABLON DE NOTIFICACIONES */}
            {activeTab === 'announcements' && (
              <motion.div
                key="announcements-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-12 max-w-4xl mx-auto"
              >
                {/* 1. NOTIFICACIONES RECIBIDAS */}
                {displayedAnnouncements.length > 0 && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4 text-left">
                      <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                        <Bell className="w-6 h-6 text-secondary" /> Notificaciones
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Recordatorios y anuncios oficiales de tu Supervisor o Pastores.</p>
                    </div>

                    <div className="space-y-4">
                      {displayedAnnouncements.map((ann) => {
                        const isExpired = ann.expiry && ann.expiry < todayStr;
                        const isRead = readAnnouncements.includes(ann.id);
                        return (
                          <div 
                            key={ann.id}
                            className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative hover:shadow-md transition-all text-left ${isRead ? 'opacity-60 bg-slate-50/50' : ''}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary/75 text-xs font-bold font-kenao">
                                  {ann.supervisorName ? ann.supervisorName.slice(0, 2).toUpperCase() : 'SP'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-slate-700 flex flex-wrap items-center gap-2">
                                    <span>{ann.supervisorName}</span>
                                    {isExpired && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold">Vencido</span>
                                    )}
                                    {ann.expiry && !isExpired && (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold">Expira: {ann.expiry.split('-').reverse().join('/')}</span>
                                    )}
                                  </h4>
                                  <span className="text-[10px] text-slate-400">
                                    {ann.createdAt ? new Date(ann.createdAt.toDate ? ann.createdAt.toDate() : ann.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recientemente'}
                                  </span>
                                </div>
                              </div>
                              <button 
                                onClick={() => toggleReadAnnouncement(ann.id)}
                                className={`p-1.5 rounded-full transition-colors ${isRead ? 'bg-secondary/20 text-secondary' : 'bg-slate-100 text-slate-400 hover:bg-secondary/10 hover:text-secondary'}`}
                                title={isRead ? "Marcar como no leído" : "Marcar como leído"}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <h4 className="font-bold text-secondary text-lg mt-4 mb-2">{ann.title}</h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                              {ann.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SOLICITUDES DE CONTACTO (¡ÚNETE A UNA CÉLULA!) */}
                {contactNotifications.length > 0 && (
                  <div className="space-y-6 pt-4">
                    <div className="border-b border-slate-100 pb-4 text-left">
                      <h2 className="text-2xl font-kenao text-primary flex items-center gap-2">
                        <Users className="w-6 h-6 text-secondary animate-pulse" /> Solicitudes de Contacto
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">Personas que han completado el formulario de "¡Únete a una Célula!" interesadas en tu zona.</p>
                    </div>

                    <div className="space-y-4">
                      {contactNotifications.slice(0, 3).map((notif) => {
                        const isRead = notif.readByLeader;
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
                                <span className="text-[10px] text-slate-450 font-bold block mt-1 tracking-wider uppercase">
                                  Enviado: {formattedDate}
                                </span>
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
                    <p className="text-xs text-slate-400 mt-1">Crea alertas oficiales que verán los asistentes de tu célula.</p>
                  </div>

                  <div className="bg-secondary/5 p-6 rounded-[2rem] border border-secondary/20 shadow-sm relative text-left">
                    <form onSubmit={handlePublishCellNotification} className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase font-extrabold text-secondary mb-2">Título de la Alerta</label>
                        <input
                          type="text"
                          required
                          value={newCellNotification.title}
                          onChange={e => setNewCellNotification({...newCellNotification, title: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm font-semibold text-primary"
                          placeholder="Ej. Recordatorio: Entrega de Reportes"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase font-extrabold text-secondary mb-2">Mensaje</label>
                        <textarea
                          required
                          rows={3}
                          value={newCellNotification.message}
                          onChange={e => setNewCellNotification({...newCellNotification, message: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm font-semibold text-primary"
                          placeholder="Escribe el mensaje..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase font-extrabold text-secondary mb-2">Fecha de Vencimiento (Filtro)</label>
                        <input
                          type="date"
                          value={newCellNotification.expiry}
                          onChange={e => setNewCellNotification({...newCellNotification, expiry: e.target.value})}
                          className="w-full px-4 py-3 bg-white border border-secondary/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:border-secondary text-sm font-semibold text-primary"
                        />
                      </div>
                      <button type="submit" className="w-full py-4 bg-secondary text-slate-900 rounded-xl font-extrabold shadow-sm hover:bg-secondary/90 transition-all flex justify-center items-center gap-2">
                        <Send className="w-5 h-5"/> Publicar a mis asistentes
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
                    <p className="text-xs text-slate-400 mt-1">Monitorea y elimina recordatorios que enviaste a tus asistentes.</p>
                  </div>

                  {cellNotifications.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-[2rem] border border-slate-100 text-slate-400 font-bold shadow-sm">
                      No has difundido ninguna notificación recientemente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cellNotifications.map((ann) => (
                        <div key={ann.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative hover:shadow-md transition-all text-left">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-bold text-secondary text-lg">{ann.title}</h4>
                              <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                <Calendar className="w-3.5 h-3.5"/> 
                                {ann.expiry && (
                                  <span>Vence: {ann.expiry.split('-').reverse().join('/')}</span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => setCellNoticeToDelete(ann)}
                              className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-colors animate-none"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 mt-3">
                            {ann.message}
                          </p>
                        </div>
                      ))}
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
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Main solid card for form */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 p-6 md:p-8 shadow-sm text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-slate-100 gap-4">
                    <div>
                      <h2 className="text-3xl font-kenao font-bold text-primary mb-2">Datos de Célula</h2>
                      <p className="text-sm text-slate-500">
                        Configure el punto de encuentro de su célula. Estos datos aparecerán de forma automática en la página de Ubicaciones pública de Huelva Church.
                      </p>
                    </div>
                  </div>

                  {isCoLeaderActive && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-primary rounded-2xl flex items-start gap-3">
                      <Info className="w-5 h-5 shrink-0 mt-0.5 text-secondary" />
                      <p className="text-xs font-semibold leading-relaxed">
                        Estás visualizando los datos de la Célula de <strong>{coLedCell?.leader || 'otro líder'}</strong> como Co-Líder. Puedes gestionar la asistencia, estadísticas, anuncios y estudios de esta célula, pero no tienes autorización para modificar la ubicación, día o dirección de encuentro.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSaveCellProfile} className="space-y-6">
                    <fieldset disabled={isCoLeaderActive} className="space-y-6 border-0 p-0 m-0 w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Nombre del Líder / Líderes
                        </label>
                        <input
                          type="text"
                          required
                          value={cellProfileForm.leader}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, leader: e.target.value })}
                          placeholder="Ej. José y María"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Día de Encuentro
                        </label>
                        <select
                          required
                          value={cellProfileForm.schedule.split(' ')[0] || ''}
                          onChange={(e) => {
                             const time = cellProfileForm.schedule.split(' ').slice(1).join(' ') || '20:00';
                             setCellProfileForm({ ...cellProfileForm, schedule: `${e.target.value} ${time}` });
                          }}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm animate-none"
                        >
                          <option value="">Selecciona el día</option>
                          <option value="Lunes">Lunes</option>
                          <option value="Martes">Martes</option>
                          <option value="Miércoles">Miércoles</option>
                          <option value="Jueves">Jueves</option>
                          <option value="Viernes">Viernes</option>
                          <option value="Sábado">Sábado</option>
                          <option value="Domingo">Domingo</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Hora de Encuentro
                        </label>
                        <input
                          type="time"
                          required
                          value={cellProfileForm.schedule.split(' ').slice(1).join(' ').replace('hrs', '').trim() || '20:00'}
                          onChange={(e) => {
                             const day = cellProfileForm.schedule.split(' ')[0] || 'Viernes';
                             setCellProfileForm({ ...cellProfileForm, schedule: `${day} ${e.target.value}hrs` });
                          }}
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
                          placeholder="Ej. Av. Andalucía (Sin número, por seguridad)"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                          Lugar en dónde esté
                        </label>
                        <select
                          required
                          value={cellProfileForm.lugar}
                          onChange={(e) => setCellProfileForm({ ...cellProfileForm, lugar: e.target.value, barriada: '', municipio: '', lugarDetalle: '' })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm animate-none"
                        >
                          <option value="Ciudad de Huelva">Ciudad de Huelva</option>
                          <option value="Otro Municipio de Huelva">Otro Municipio de Huelva</option>
                          <option value="Sevilla">Sevilla</option>
                          <option value="Portugal">Portugal</option>
                          <option value="Otro">Otro</option>
                        </select>
                      </div>

                      {cellProfileForm.lugar === 'Ciudad de Huelva' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Barriada / Zona
                          </label>
                          <select
                            required
                            value={cellProfileForm.barriada}
                            onChange={(e) => setCellProfileForm({ ...cellProfileForm, barriada: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm animate-none"
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
                              <option value="El Torrejón">El Torrejón (Alcalde Diego Sayago)</option>
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
                        </div>
                      )}

                      {cellProfileForm.lugar === 'Otro Municipio de Huelva' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Municipio de Huelva
                          </label>
                          <select
                            required
                            value={cellProfileForm.municipio}
                            onChange={(e) => setCellProfileForm({ ...cellProfileForm, municipio: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm animate-none"
                          >
                            <option value="">Selecciona el municipio</option>
                            <option value="Aljaraque">Aljaraque</option>
                            <option value="Almonaster la Real">Almonaster la Real</option>
                            <option value="Almonte">Almonte</option>
                            <option value="Alosno">Alosno</option>
                            <option value="Aracena">Aracena</option>
                            <option value="Aroche">Aroche</option>
                            <option value="Ayamonte">Ayamonte</option>
                            <option value="Beas">Beas</option>
                            <option value="Bollullos Par del Condado">Bollullos Par del Condado</option>
                            <option value="Bonares">Bonares</option>
                            <option value="Cabezas Rubias">Cabezas Rubias</option>
                            <option value="Cala">Cala</option>
                            <option value="Calañas">Calañas</option>
                            <option value="Cartaya">Cartaya</option>
                            <option value="Chucena">Chucena</option>
                            <option value="Corteconcepción">Corteconcepción</option>
                            <option value="Cortegana">Cortegana</option>
                            <option value="Cortelazor">Cortelazor</option>
                            <option value="Cumbres de Enmedio">Cumbres de Enmedio</option>
                            <option value="Cumbres de San Bartolomé">Cumbres de San Bartolomé</option>
                            <option value="Cumbres Mayores">Cumbres Mayores</option>
                            <option value="El Campillo">El Campillo</option>
                            <option value="El Cerro de Andévalo">El Cerro de Andévalo</option>
                            <option value="El Granado">El Granado</option>
                            <option value="Encinasola">Encinasola</option>
                            <option value="Escacena del Campo">Escacena del Campo</option>
                            <option value="Fuenteheridos">Fuenteheridos</option>
                            <option value="Galaroza">Galaroza</option>
                            <option value="Gibraleón">Gibraleón</option>
                            <option value="Higuera de la Sierra">Higuera de la Sierra</option>
                            <option value="Hinojos">Hinojos</option>
                            <option value="Huelva">Huelva</option>
                            <option value="Isla Cristina">Isla Cristina</option>
                            <option value="Jabugo">Jabugo</option>
                            <option value="La Granada de Río-Tinto">La Granada de Río-Tinto</option>
                            <option value="La Nava">La Nava</option>
                            <option value="La Palma del Condado">La Palma del Condado</option>
                            <option value="Lepe">Lepe</option>
                            <option value="Linares de la Sierra">Linares de la Sierra</option>
                            <option value="Los Marines">Los Marines</option>
                            <option value="Lucena del Puerto">Lucena del Puerto</option>
                            <option value="Manzanilla">Manzanilla</option>
                            <option value="Minas de Riotinto">Minas de Riotinto</option>
                            <option value="Moguer">Moguer</option>
                            <option value="Nerva">Nerva</option>
                            <option value="Niebla">Niebla</option>
                            <option value="Palos de la Frontera">Palos de la Frontera</option>
                            <option value="Paterna del Campo">Paterna del Campo</option>
                            <option value="Paymogo">Paymogo</option>
                            <option value="Puebla de Guzmán">Puebla de Guzmán</option>
                            <option value="Puerto Moral">Puerto Moral</option>
                            <option value="Punta Umbría">Punta Umbría</option>
                            <option value="Rociana del Condado">Rociana del Condado</option>
                            <option value="Rosal de la Frontera">Rosal de la Frontera</option>
                            <option value="San Bartolomé de la Torre">San Bartolomé de la Torre</option>
                            <option value="San Juan del Puerto">San Juan del Puerto</option>
                            <option value="San Silvestre de Guzmán">San Silvestre de Guzmán</option>
                            <option value="Sanlúcar de Guadiana">Sanlúcar de Guadiana</option>
                            <option value="Santa Ana la Real">Santa Ana la Real</option>
                            <option value="Santa Bárbara de Casa">Santa Bárbara de Casa</option>
                            <option value="Santa Olalla del Cala">Santa Olalla del Cala</option>
                            <option value="Trigueros">Trigueros</option>
                            <option value="Valverde del Camino">Valverde del Camino</option>
                            <option value="Villablanca">Villablanca</option>
                            <option value="Villalba del Alcor">Villalba del Alcor</option>
                            <option value="Villanueva de las Cruces">Villanueva de las Cruces</option>
                            <option value="Villanueva de los Castillejos">Villanueva de los Castillejos</option>
                            <option value="Villarrasa">Villarrasa</option>
                            <option value="Zalamea la Real">Zalamea la Real</option>
                            <option value="Zufre">Zufre</option>
                          </select>
                        </div>
                      )}

                      {cellProfileForm.lugar === 'Otro' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Especifique el Lugar / Ubicación
                          </label>
                          <input
                            type="text"
                            required
                            value={cellProfileForm.lugarDetalle}
                            onChange={(e) => setCellProfileForm({ ...cellProfileForm, lugarDetalle: e.target.value })}
                            placeholder="Ej. Madrid, Extremadura, etc."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Referencia *
                      </label>
                      <input
                        type="url"
                        required
                        value={cellProfileForm.googleMapsLink}
                        onChange={(e) => setCellProfileForm({ ...cellProfileForm, googleMapsLink: e.target.value })}
                        placeholder="https://maps.app.goo.gl/... (Usa una referencia cercana por seguridad)"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={isSavingCell}
                        className="px-6 py-3 bg-primary hover:bg-secondary hover:text-primary text-white font-bold rounded-xl transition-all uppercase tracking-wide text-xs disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {isSavingCell ? 'Guardando...' : 'Guardar Información'}
                      </button>
                    </div>
                    </fieldset>
                  </form>
                </div>

                {/* Sidebar containing download map and Co-Leadership tools */}
                <div className="lg:col-span-1 space-y-6 text-left animate-fade-in">
                  
                  {/* Supervisor Profile Configurator Card */}
                  <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm">
                    <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
                      👁️ Supervisión
                    </span>
                    <h3 className="text-lg font-kenao font-bold text-primary mb-2 flex items-center gap-2">
                      {savedSupervisorId ? 'Mi Supervisor' : 'Asignar Supervisor'}
                    </h3>
                    
                    {savedSupervisorId ? (() => {
                      const supData = supervisoresList.find(s => s.id === savedSupervisorId);
                      return (
                        <div className="mt-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100 text-center">
                          {supData ? (
                            <>
                              <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 text-xl font-kenao mx-auto mb-2">
                                {supData.photoURL ? (
                                  <img src={supData.photoURL} alt={supData.displayName} className="w-full h-full object-cover rounded-full" />
                                ) : (
                                  supData.displayName?.substring(0, 2).toUpperCase() || 'S'
                                )}
                              </div>
                              <h3 className="text-sm font-bold text-primary mb-1">{supData.displayName || 'Supervisor'}</h3>
                              <p className="text-[10px] text-slate-500 mb-3">{supData.email}</p>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Supervisor Activo
                              </div>
                            </>
                          ) : (
                            <p className="text-[10px] text-slate-500">Cargando...</p>
                          )}
                        </div>
                      );
                    })() : (
                      <div className="mt-4 space-y-3">
                        <select
                          value={mySupervisorId || ''}
                          onChange={(e) => setMySupervisorId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-xs"
                        >
                          <option value="">-- No tengo / Seleccionar --</option>
                          {supervisoresList.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.displayName || s.email}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveSupervisor(mySupervisorId || '')}
                          disabled={isSavingSupervisor || !mySupervisorId}
                          className="w-full py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-secondary hover:text-primary transition-all disabled:opacity-50"
                        >
                          {isSavingSupervisor ? 'Guardando...' : 'Guardar Supervisor'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Co-Leader Invite Alerts for Pending and Active Co-Leadership */}
                  {pendingInvitation !== null && (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-250 rounded-3xl p-6 shadow-sm">
                      <span className="inline-block bg-amber-100 text-amber-800 border border-amber-250 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                        ✉️ Invitación Recibida
                      </span>
                      <h3 className="text-base font-bold text-slate-800 mb-2 font-kenao">
                        Te han invitado a Co-Liderar
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">
                        El líder <strong className="text-primary">{pendingInvitation.leader}</strong> te ha invitado a co-liderar su grupo: <strong>{pendingInvitation.name || "Célula"}</strong>.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAcceptCoLeadership(pendingInvitation.id)}
                          className="flex-1 py-2.5 bg-primary text-white hover:bg-secondary hover:text-primary rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border border-transparent"
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeclineCoLeadership(pendingInvitation.id)}
                          className="flex-1 py-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}

                  {isCoLeaderActive && coLedCell && (
                    <div className="bg-blue-50 border border-blue-250 rounded-3xl p-6 shadow-sm">
                      <span className="inline-block bg-secondary text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                        🤝 Co-Liderazgo Activo
                      </span>
                      <h3 className="text-base font-bold text-slate-800 mb-2 font-kenao">
                        Modo Co-Líder Activo
                      </h3>
                      <p className="text-xs text-slate-650 leading-relaxed mb-4">
                        Actualmente estás participando activamente en el Co-Liderazgo de la Célula de <strong>{coLedCell.leader}</strong>. Tu panel completo refleja su información.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleLeaveCoLeadership(coLedCell.id)}
                        className="w-full py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        Dejar Co-Liderazgo
                      </button>
                    </div>
                  )}

                  {/* Search and Invite panel if owner leader is not currently co-leading someone else's cell */}
                  {!isCoLeaderActive && cellProfile !== null && (
                    <div className="space-y-6">
                      {/* Case A: We have a registered Co-Leader */}
                      {cellProfile.coLeaderId ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-sm">
                          <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-250 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                            👥 Tu Co-Líder Activo
                          </span>
                          <h3 className="text-base font-bold text-slate-800 mb-1 font-kenao">
                            {cellProfile.coLeaderName}
                          </h3>
                          <p className="text-[11px] text-slate-500 mb-4">
                            ({cellProfile.coLeaderEmail})
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            Este usuario está co-liderando tu célula. Ambos comparten acceso a asistencia, estadísticas, anuncios y materiales de encuentro de forma sincronizada.
                          </p>
                          <button
                            type="button"
                            onClick={handleRemoveCoLeader}
                            className="w-full py-2.5 bg-rose-50 border border-rose-105 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            Remover Co-Líder
                          </button>
                        </div>
                      ) : cellProfile.coLeaderInviteeId ? (
                        /* Case B: Invitation Pending */
                        <div className="bg-amber-50/70 border border-amber-205 rounded-3xl p-6 shadow-sm">
                          <span className="inline-block bg-amber-100 text-amber-800 border border-amber-250 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                            ⏳ Invitación Pendiente
                          </span>
                          <h3 className="text-base font-bold text-slate-800 mb-1 font-kenao">
                            {cellProfile.coLeaderInviteeName}
                          </h3>
                          <p className="text-[11px] text-slate-500 mb-4">
                            ({cellProfile.coLeaderInviteeEmail})
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            Invitación enviada. El destinatario debe ingresar a su subpágina de "Configuración" para aceptar formalmente el co-liderazgo.
                          </p>
                          <button
                            type="button"
                            onClick={handleRemoveCoLeader}
                            className="w-full py-2.5 bg-amber-50 border border-amber-250 text-amber-805 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            Cancelar Invitación
                          </button>
                        </div>
                      ) : (
                        /* Case C: Free to Invite */
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                          <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                            🤝 Co-Liderazgo
                          </span>
                          <h3 className="text-lg font-kenao font-bold text-primary mb-2 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-secondary shrink-0" /> Invitar Co-Líder
                          </h3>
                          <p className="text-xs text-slate-500 leading-relaxed mb-6">
                            Invita a otro usuario "Líder" de la iglesia (por ejemplo, tu cónyuge o co-ayudante) para co-liderar tu célula. Comparte visualización y reporte excepto cambiar el perfil de la célula.
                          </p>

                          {selectedLeaderToInvite ? (
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 text-left relative animate-fade-in">
                              <button
                                type="button"
                                onClick={() => setSelectedLeaderToInvite(null)}
                                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                                title="Cancelar selección de líder"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Seleccionado para Co-Liderar
                              </h4>
                              <p className="text-xs font-bold text-primary">
                                {selectedLeaderToInvite.displayName}
                              </p>
                              <p className="text-[10px] text-slate-500 mb-4">
                                {selectedLeaderToInvite.email}
                              </p>
                              <button
                                type="button"
                                onClick={handleInviteCoLeader}
                                disabled={isInvitingLeader}
                                className="w-full py-2.5 bg-primary hover:bg-secondary hover:text-primary text-white font-bold rounded-xl transition-all text-xs shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                {isInvitingLeader ? "Enviando..." : "Invitar a Co-Liderar"}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={searchLeaderTerm}
                                  onChange={(e) => setSearchLeaderTerm(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSearchLeaders();
                                    }
                                  }}
                                  placeholder="Introduce nombre o correo..."
                                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-xs text-slate-700"
                                />
                                <button
                                  type="button"
                                  onClick={handleSearchLeaders}
                                  disabled={searchingLeaders}
                                  className="px-3.5 py-2.5 bg-primary hover:bg-secondary text-white hover:text-primary font-bold rounded-xl transition-all text-xs cursor-pointer"
                                >
                                  {searchingLeaders ? "..." : "Buscar"}
                                </button>
                              </div>

                              {foundLeaders.length > 0 && (
                                <div className="max-h-52 overflow-y-auto border border-slate-105 rounded-xl divide-y divide-slate-100 bg-white shadow-inner p-1">
                                  {foundLeaders.map((ldr) => (
                                    <button
                                      key={ldr.uid}
                                      type="button"
                                      onClick={() => {
                                        setSelectedLeaderToInvite(ldr);
                                        setFoundLeaders([]);
                                      }}
                                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors flex flex-col cursor-pointer"
                                    >
                                      <span className="text-xs font-bold text-slate-800">
                                        {ldr.displayName || "Líder"}
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        {ldr.email}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isCoLeaderActive && cellProfile === null && (
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm text-center">
                      <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                        🤝 Co-Liderazgo
                      </span>
                      <p className="text-xs text-slate-505 leading-relaxed">
                        Guarde la información de su célula para poder habilitar las invitaciones de Co-Liderazgo.
                      </p>
                    </div>
                  )}

                  <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="inline-block bg-primary/5 text-primary border border-primary/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-4">
                        🗺️ Cartografía
                      </span>
                      <h3 className="text-lg font-kenao font-bold text-primary mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-secondary shrink-0" /> Mapa de Barriadas
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        Descarga el plano oficial del Ayuntamiento de Huelva con las delimitaciones de barriadas de la ciudad en PDF.
                      </p>
                    </div>
                    
                    <a
                      href="/Barriadas%20de%20Huelva.pdf"
                      download="Barriadas de Huelva.pdf"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-secondary border border-slate-200 hover:border-transparent transition-all text-primary font-bold rounded-xl text-xs w-full text-center shadow-sm cursor-pointer"
                      title="Descargar plano PDF oficial de Barriadas"
                    >
                      Descargar Mapa de Barriadas de Huelva
                    </a>
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

      {/* Reusable Popup Modal for Unlinking Asistente */}
      {memberToUnlink && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
            <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Link2Off className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold font-kenao text-primary mb-2">Desvincular Asistente</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Esto desvinculará al usuario <span className="font-bold text-slate-800">{memberToUnlink.name}</span> de esta célula, de modo que podrá unirse a otra en 'Mi Célula'. Las estadísticas de asistencia históricas no se verán alteradas.
            </p>
            
            <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
              Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">RELEASE</span> en mayúsculas para confirmar.
            </div>
            
            <input
              type="text"
              placeholder="Escribe RELEASE aquí..."
              value={releaseInput}
              onChange={(e) => setReleaseInput(e.target.value)}
              className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
            />
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setMemberToUnlink(null);
                  setReleaseInput('');
                }}
                className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={releaseInput !== 'RELEASE'}
                onClick={() => {
                  handleDeleteMember(memberToUnlink.id);
                  setMemberToUnlink(null);
                  setReleaseInput('');
                }}
                className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none"
              >
                Desvincular
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reusable Popup Modal for Deleting Cell Notification */}
      {cellNoticeToDelete && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
            <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-bold font-kenao text-primary mb-2">Eliminar Notificación</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la notificación <span className="font-bold text-slate-800">{cellNoticeToDelete.title}</span>? Esta acción no se puede deshacer.
            </p>
            
            <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
              Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">DELETE</span> en mayúsculas para confirmar.
            </div>
            
            <input
              type="text"
              placeholder="Escribe DELETE aquí..."
              value={cellNoticeDeleteInput}
              onChange={(e) => setCellNoticeDeleteInput(e.target.value)}
              className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
            />
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setCellNoticeToDelete(null);
                  setCellNoticeDeleteInput('');
                }}
                className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={cellNoticeDeleteInput !== 'DELETE'}
                onClick={handleDeleteCellNotification}
                className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none"
              >
                Eliminar
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

    </div>
  );
}
