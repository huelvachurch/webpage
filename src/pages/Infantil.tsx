import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smile, 
  Calendar, 
  Link as LinkIcon, 
  Trash2, 
  Plus, 
  Edit2, 
  MessageSquare, 
  Send, 
  Bell, 
  Camera, 
  Check, 
  X, 
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  UserCheck
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
  updateDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

interface KidsProgram {
  id: string;
  teachingTitle: string;
  teachingLink: string;
  teacherId: string;
  teacherName: string;
  date: string;
  createdAt?: any;
}

interface KidsComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: any;
}

interface KidsPhoto {
  id: string;
  url: string;
  dateTaken: string;
  uploadedById: string;
  uploadedByName: string;
  createdAt?: any;
}

interface KidsNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  actionUrl?: string;
}

interface MaestroUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export default function Infantil() {
  const { user, roles, loading: authLoading, isAuthReady } = useAuth();
  const navigate = useNavigate();

  // State Management
  const [programs, setPrograms] = useState<KidsProgram[]>([]);
  const [comments, setComments] = useState<KidsComment[]>([]);
  const [photos, setPhotos] = useState<KidsPhoto[]>([]);
  const [notifications, setNotifications] = useState<KidsNotification[]>([]);
  const [maestros, setMaestros] = useState<MaestroUser[]>([]);

  // Form States
  const [isAddingProgram, setIsAddingProgram] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [programForm, setProgramForm] = useState({
    teachingTitle: '',
    teachingLink: '',
    teacherId: '',
    teacherName: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [photoForm, setPhotoForm] = useState({
    url: '',
    dateTaken: new Date().toISOString().split('T')[0]
  });

  // Action Pending/Status States
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete Confirm ID states (Inline security confirmation)
  const [deleteProgramConfirmId, setDeleteProgramConfirmId] = useState<string | null>(null);
  const [deleteCommentConfirmId, setDeleteCommentConfirmId] = useState<string | null>(null);
  const [deletePhotoConfirmId, setDeletePhotoConfirmId] = useState<string | null>(null);

  const isMaestro = roles.includes('maestro') || roles.includes('superadmin');

  // Authorization Route Guard
  useEffect(() => {
    if (isAuthReady && !authLoading) {
      if (!user || !isMaestro) {
        navigate('/');
      }
    }
  }, [user, isMaestro, authLoading, isAuthReady, navigate]);

  // Load Sunday Programs
  useEffect(() => {
    if (!isMaestro) return;
    const q = query(collection(db, 'kids_programs'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: KidsProgram[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          teachingTitle: data.teachingTitle || '',
          teachingLink: data.teachingLink || '',
          teacherId: data.teacherId || '',
          teacherName: data.teacherName || '',
          date: data.date || '',
          createdAt: data.createdAt
        });
      });
      setPrograms(list);
    }, (err) => {
      console.error("Error fetching programs:", err);
    });
    return () => unsubscribe();
  }, [isMaestro]);

  // Load Teacher Comments
  useEffect(() => {
    if (!isMaestro) return;
    const q = query(collection(db, 'kids_comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: KidsComment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          content: data.content || '',
          authorId: data.authorId || '',
          authorName: data.authorName || '',
          authorPhoto: data.authorPhoto || '',
          createdAt: data.createdAt
        });
      });
      setComments(list);
    }, (err) => {
      console.error("Error fetching comments:", err);
    });
    return () => unsubscribe();
  }, [isMaestro]);

  // Load Photos Gallery
  useEffect(() => {
    if (!isMaestro) return;
    const q = query(collection(db, 'kids_photos'), orderBy('dateTaken', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: KidsPhoto[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          url: data.url || '',
          dateTaken: data.dateTaken || '',
          uploadedById: data.uploadedById || '',
          uploadedByName: data.uploadedByName || '',
          createdAt: data.createdAt
        });
      });
      setPhotos(list);
    }, (err) => {
      console.error("Error fetching photos:", err);
    });
    return () => unsubscribe();
  }, [isMaestro]);

  // Load Teacher Notifications
  useEffect(() => {
    if (!user || !isMaestro) return;
    const q = query(
      collection(db, 'kids_notifications'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: KidsNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          userId: data.userId || '',
          title: data.title || '',
          body: data.body || '',
          read: data.read ?? false,
          createdAt: data.createdAt,
          actionUrl: data.actionUrl || ''
        });
      });
      setNotifications(list);
    }, (err) => {
      console.error("Error fetching kids notifications:", err);
    });
    return () => unsubscribe();
  }, [user, isMaestro]);

  // Fetch only users with role 'maestro' or 'superadmin' to select as teacher
  useEffect(() => {
    if (!isMaestro) return;
    const fetchMaestros = async () => {
      try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const list: MaestroUser[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const rolesArray = data.roles || [];
          if (rolesArray.includes('maestro') || rolesArray.includes('superadmin')) {
            list.push({
              id: doc.id,
              displayName: data.displayName || data.email || 'Maestro sin nombre',
              email: data.email || '',
              photoURL: data.photoURL || ''
            });
          }
        });
        setMaestros(list);
      } catch (err) {
        console.error("Error fetching maestro list:", err);
      }
    };
    fetchMaestros();
  }, [isMaestro]);

  // Helper to send FCM + Email notifications via server API
  const sendKidsPushNotification = async (title: string, message: string) => {
    if (!user) return;
    try {
      await fetch('/api/notifications/send-kids-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Un Maestro'
        })
      });
    } catch (pushErr) {
      console.error("Error triggering push notifications via backend:", pushErr);
    }
  };

  // Create or Update Sunday Program
  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.teachingTitle || !programForm.teachingLink || !programForm.teacherId || !programForm.date) {
      setErrorMessage('Por favor rellene todos los campos del programa.');
      return;
    }

    // Find selected teacher name
    const selectedMaestro = maestros.find(m => m.id === programForm.teacherId);
    const teacherName = selectedMaestro ? selectedMaestro.displayName : 'Maestro';

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        teachingTitle: programForm.teachingTitle,
        teachingLink: programForm.teachingLink,
        teacherId: programForm.teacherId,
        teacherName: teacherName,
        date: programForm.date,
        updatedAt: new Date().toISOString()
      };

      if (editingProgramId) {
        // Edit Mode
        const programRef = doc(db, 'kids_programs', editingProgramId);
        await updateDoc(programRef, payload);
        
        setSuccessMessage('Programa modificado correctamente.');
        
        // Notify other teachers
        await sendKidsPushNotification(
          "Programa Dominical Modificado", 
          `Se ha modificado el programa del domingo ${programForm.date} ("${programForm.teachingTitle}").`
        );
        
        setEditingProgramId(null);
      } else {
        // Create Mode
        const finalPayload = {
          ...payload,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'kids_programs'), finalPayload);
        setSuccessMessage('Programa dominical programado con éxito.');
        
        // Notify other teachers
        await sendKidsPushNotification(
          "Nuevo Programa Dominical", 
          `Se ha programado la enseñanza "${programForm.teachingTitle}" para el domingo ${programForm.date}, a impartir por ${teacherName}.`
        );
        
        setIsAddingProgram(false);
      }

      // Reset Form
      setProgramForm({
        teachingTitle: '',
        teachingLink: '',
        teacherId: '',
        teacherName: '',
        date: new Date().toISOString().split('T')[0]
      });

    } catch (err: any) {
      console.error("Error saving program:", err);
      setErrorMessage('Error al guardar el programa: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditProgram = (prog: KidsProgram) => {
    setEditingProgramId(prog.id);
    setIsAddingProgram(true);
    setProgramForm({
      teachingTitle: prog.teachingTitle,
      teachingLink: prog.teachingLink,
      teacherId: prog.teacherId,
      teacherName: prog.teacherName,
      date: prog.date
    });
  };

  const handleDeleteProgram = async (id: string, dateStr: string) => {
    try {
      setActionLoading(true);
      await deleteDoc(doc(db, 'kids_programs', id));
      setDeleteProgramConfirmId(null);
      setSuccessMessage('Programa eliminado correctamente.');

      // Notify
      await sendKidsPushNotification(
        "Programa Dominical Eliminado", 
        `Se ha eliminado el programa dominical planificado para el domingo ${dateStr}.`
      );
    } catch (err: any) {
      console.error("Error deleting program:", err);
      setErrorMessage('Error al eliminar: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmittingComment(true);
    setErrorMessage('');
    
    try {
      const commentPayload = {
        content: newComment.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email || 'Maestro',
        authorPhoto: user.photoURL || '',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'kids_comments'), commentPayload);
      
      const briefContent = newComment.length > 40 ? newComment.substring(0, 40) + '...' : newComment;
      await sendKidsPushNotification(
        "Nuevo comentario de HC Kids", 
        `${user.displayName || 'Un maestro'} escribió: "${briefContent}"`
      );

      setNewComment('');
    } catch (err: any) {
      console.error("Error saving comment:", err);
      setErrorMessage('Error al publicar comentario: ' + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'kids_comments', id));
      setDeleteCommentConfirmId(null);
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      setErrorMessage('Error al eliminar comentario: ' + err.message);
    }
  };

  // Add Photo to Gallery (Google Drive / external URL)
  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoForm.url || !photoForm.dateTaken || !user) {
      setErrorMessage('Por favor rellene el enlace de la foto y la fecha.');
      return;
    }

    setActionLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        url: photoForm.url.trim(),
        dateTaken: photoForm.dateTaken,
        uploadedById: user.uid,
        uploadedByName: user.displayName || user.email || 'Maestro',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'kids_photos'), payload);
      setSuccessMessage('Foto subida a la galería con éxito.');
      setIsAddingPhoto(false);

      // Reset
      setPhotoForm({
        url: '',
        dateTaken: new Date().toISOString().split('T')[0]
      });

      // Notify
      await sendKidsPushNotification(
        "Nueva foto en la Galería de Kids",
        `Se ha subido una nueva foto de HC Kids del día ${photoForm.dateTaken}.`
      );

    } catch (err: any) {
      console.error("Error saving photo:", err);
      setErrorMessage('Error al guardar foto: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'kids_photos', id));
      setDeletePhotoConfirmId(null);
      setSuccessMessage('Foto eliminada correctamente.');
    } catch (err: any) {
      console.error("Error deleting photo:", err);
      setErrorMessage('Error al eliminar foto: ' + err.message);
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notifId: string) => {
    try {
      const notifRef = doc(db, 'kids_notifications', notifId);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error("Error updating notification status:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.read);
    if (unreadNotifs.length === 0) return;

    try {
      await Promise.all(unreadNotifs.map(notif => {
        const notifRef = doc(db, 'kids_notifications', notif.id);
        return updateDoc(notifRef, { read: true });
      }));
      setSuccessMessage('Todas las notificaciones marcadas como leídas.');
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  if (authLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-primary/70 font-semibold">Cargando Portal Infantil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Ministerio Infantil</h1>
            <p className="text-primary/60 text-sm">Coordina el programa dominical, comparte recursos y comparte tus comentarios con el equipo.</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                setIsAddingProgram(true);
                setEditingProgramId(null);
                setProgramForm({
                  teachingTitle: '',
                  teachingLink: '',
                  teacherId: '',
                  teacherName: '',
                  date: new Date().toISOString().split('T')[0]
                });
              }}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg text-sm"
            >
              <Plus className="w-5 h-5" />
              Nuevo Programa
            </button>

            <button
              onClick={() => setIsAddingPhoto(true)}
              className="flex items-center gap-2 bg-secondary text-primary px-6 py-3 rounded-2xl font-bold hover:bg-primary hover:text-white transition-all shadow-lg text-sm"
            >
              <Camera className="w-5 h-5" />
              Compartir Foto
            </button>
          </div>
        </div>

        {/* Global Feedback Messages */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="mb-6 p-4 bg-red-50 border border-red-150 rounded-2xl text-red-700 text-sm flex items-center gap-2 font-medium"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="mb-6 p-4 bg-green-50 border border-green-150 rounded-2xl text-green-700 text-sm flex items-center justify-between gap-2 font-medium"
            >
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage('')} className="text-green-700 hover:text-green-900 font-bold text-xs">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Forms (Add/Edit Program) */}
        <AnimatePresence>
          {isAddingProgram && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative"
              >
                <button 
                  onClick={() => setIsAddingProgram(false)}
                  className="absolute top-6 right-6 text-primary/50 hover:text-primary p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-kenao text-2xl text-primary mb-6 font-bold">
                  {editingProgramId ? 'Editar Programa Dominical' : 'Planificar Programa Dominical'}
                </h3>

                <form onSubmit={handleSaveProgram} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Título de la Enseñanza</label>
                    <input 
                      type="text" 
                      required
                      value={programForm.teachingTitle} 
                      onChange={(e) => setProgramForm({...programForm, teachingTitle: e.target.value})} 
                      className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" 
                      placeholder="Ej. La obediencia de Noé" 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Enlace del Contenido de la Enseñanza</label>
                    <input 
                      type="url" 
                      required
                      value={programForm.teachingLink} 
                      onChange={(e) => setProgramForm({...programForm, teachingLink: e.target.value})} 
                      className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" 
                      placeholder="https://drive.google.com/..." 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Fecha (Domingo)</label>
                      <input 
                        type="date" 
                        required
                        value={programForm.date} 
                        onChange={(e) => setProgramForm({...programForm, date: e.target.value})} 
                        className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Maestro de Turno</label>
                      <select 
                        required
                        value={programForm.teacherId} 
                        onChange={(e) => setProgramForm({...programForm, teacherId: e.target.value})} 
                        className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm bg-white transition-all"
                      >
                        <option value="">Seleccione maestro...</option>
                        {maestros.map((m) => (
                          <option key={m.id} value={m.id}>{m.displayName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setIsAddingProgram(false)} 
                      className="px-6 py-3.5 rounded-xl bg-slate-100 text-primary font-bold hover:bg-slate-200 text-sm cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/95 text-sm flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Guardar Programa
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          {/* Modal Share Photo */}
          {isAddingPhoto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative"
              >
                <button 
                  onClick={() => setIsAddingPhoto(false)}
                  className="absolute top-6 right-6 text-primary/50 hover:text-primary p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <h3 className="font-kenao text-2xl text-primary mb-6 font-bold">
                  Compartir Foto en Galería Kids
                </h3>

                <form onSubmit={handleAddPhoto} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Enlace de la Foto (Google Drive / Direct Link)</label>
                    <input 
                      type="url" 
                      required
                      value={photoForm.url} 
                      onChange={(e) => setPhotoForm({...photoForm, url: e.target.value})} 
                      className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" 
                      placeholder="https://drive.google.com/..." 
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-primary/70 mb-2">Fecha de Captura (Cuándo se tomó)</label>
                    <input 
                      type="date" 
                      required
                      value={photoForm.dateTaken} 
                      onChange={(e) => setPhotoForm({...photoForm, dateTaken: e.target.value})} 
                      className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-sm transition-all" 
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setIsAddingPhoto(false)} 
                      className="px-6 py-3.5 rounded-xl bg-slate-100 text-primary font-bold hover:bg-slate-200 text-sm cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={actionLoading}
                      className="px-6 py-3.5 rounded-xl bg-secondary text-primary font-bold hover:bg-secondary/90 text-sm flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Publicar Foto
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Dashboard Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column - Programs & Gallery */}
          <div className="lg:col-span-2 space-y-8 animate-none">
            
            {/* Sunday Programs Card */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold font-kenao text-primary">Cronograma HC Kids</h3>
                </div>
                <span className="text-xs text-primary/50 font-bold bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                  {programs.length} Clases Planificadas
                </span>
              </div>

              <div className="space-y-4">
                {programs.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Smile className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-primary/60">No hay clases planificadas</p>
                    <p className="text-xs text-primary/40 mt-1">Crea una nueva clase haciendo clic en "Nuevo Programa".</p>
                  </div>
                ) : (
                  programs.map((prog) => (
                    <div key={prog.id} className="p-5 border border-slate-100 bg-[#fbfbfd] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-xs transition-all">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-bold text-primary bg-secondary/15 px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                            {prog.date}
                          </span>
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            {prog.teacherName}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-primary font-kenao mb-2">{prog.teachingTitle}</h4>
                        
                        <a 
                          href={prog.teachingLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs text-primary hover:text-secondary font-bold flex items-center gap-1 bg-white hover:bg-slate-50 border border-slate-100 shadow-3xs px-2.5 py-1 rounded-lg w-max transition-all"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          Ver Contenido
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {deleteProgramConfirmId === prog.id ? (
                          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 p-1.5 rounded-xl">
                            <span className="text-[10px] font-bold text-red-600 px-1 animate-pulse shrink-0">¿Seguro?</span>
                            <button 
                              onClick={() => handleDeleteProgram(prog.id, prog.date)} 
                              className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2.5 rounded-lg text-2xs cursor-pointer shadow-sm transition-colors shrink-0"
                            >
                              Borrar
                            </button>
                            <button 
                              onClick={() => setDeleteProgramConfirmId(null)} 
                              className="bg-white border border-slate-200 text-slate-700 font-bold py-1 px-2.5 rounded-lg text-2xs cursor-pointer shadow-sm hover:bg-slate-50 transition-all shrink-0"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEditProgram(prog)} 
                              className="p-2.5 bg-white border border-slate-100 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-primary transition-all shadow-3xs" 
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeleteProgramConfirmId(prog.id)} 
                              className="p-2.5 bg-white border border-slate-100 text-red-500 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all shadow-3xs" 
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gallery Management Card */}
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Camera className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold font-kenao text-primary">Fotos de HC Kids</h3>
                </div>
                <span className="text-xs text-primary/50 font-bold bg-slate-50 border border-slate-100 px-3 py-1 rounded-full">
                  {photos.length} Fotos Registradas
                </span>
              </div>

              {photos.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-primary/60">No hay fotos registradas</p>
                  <p className="text-xs text-primary/40 mt-1">Comparte fotos haciendo clic en "Compartir Foto".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 shadow-3xs hover:shadow-xs transition-all aspect-video">
                      <img 
                        src={photo.url} 
                        alt={`HC Kids ${photo.dateTaken}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // fallback if direct images are blocked
                          (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=600`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-3 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-secondary">{photo.dateTaken}</span>
                        <p className="text-[11px] text-white/80 font-medium truncate">Por {photo.uploadedByName}</p>
                        
                        {/* Delete Trigger */}
                        <div className="absolute top-2 right-2">
                          {deletePhotoConfirmId === photo.id ? (
                            <div className="flex items-center gap-1 bg-red-600 p-1 rounded-lg shadow-md shrink-0">
                              <button 
                                onClick={() => handleDeletePhoto(photo.id)} 
                                className="text-white font-bold p-1 hover:text-red-200 text-[9px] cursor-pointer"
                                title="Confirmar"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => setDeletePhotoConfirmId(null)} 
                                className="text-white font-bold p-1 hover:text-slate-200 text-[9px] cursor-pointer"
                                title="Cancelar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeletePhotoConfirmId(photo.id)} 
                              className="p-1.5 bg-slate-900/60 backdrop-blur-xs text-white/80 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors shadow-sm"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Column - Comments & Notifications */}
          <div className="space-y-8 animate-none">

             {/* Notifications Panel */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold font-kenao text-primary">Mis Notificaciones</h3>
                </div>
                {notifications.some(n => !n.read) && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-bold text-primary hover:text-secondary bg-secondary/10 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Marcar todo
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-xs text-primary/40 text-center py-6">No tienes notificaciones registradas.</p>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-3.5 rounded-xl border transition-all relative ${
                        notif.read 
                          ? 'bg-slate-50 border-slate-100' 
                          : 'bg-secondary/5 border-secondary/10 shadow-3xs'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-xs font-bold leading-tight ${notif.read ? 'text-primary/70' : 'text-primary font-bold'}`}>
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <button 
                            onClick={() => handleMarkAsRead(notif.id)}
                            className="p-1 bg-white hover:bg-secondary/10 text-primary hover:text-secondary rounded-lg shadow-4xs transition-colors cursor-pointer shrink-0"
                            title="Marcar como leída"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-primary/70 mt-1 leading-relaxed">
                        {notif.body}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Interactive Teacher Comments Card */}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold font-kenao text-primary font-bold">Muro de Maestros</h3>
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="mb-6 flex gap-2">
                <input 
                  type="text" 
                  value={newComment} 
                  required
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Escribe un comentario..." 
                  className="flex-grow p-3 rounded-xl border border-slate-200 focus:border-secondary focus:ring-1 focus:ring-secondary outline-none text-xs transition-all" 
                />
                <button 
                  type="submit" 
                  disabled={isSubmittingComment}
                  className="bg-primary hover:bg-primary/95 text-white p-3 rounded-xl flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>

              {/* Comment Feed */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-primary/40 text-center py-6">No hay comentarios en el muro. ¡Sé el primero!</p>
                ) : (
                  comments.map((comm) => (
                    <div key={comm.id} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3 relative group">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-3xs">
                        {comm.authorPhoto ? (
                          <img src={comm.authorPhoto} alt={comm.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary/40 font-bold text-xs uppercase">
                            {comm.authorName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-xs font-bold text-primary truncate pr-1">{comm.authorName}</span>
                        </div>
                        <p className="text-xs text-primary/80 leading-relaxed font-gordita break-words">
                          {comm.content}
                        </p>
                      </div>

                      {/* Deletion Option (superadmin or author) */}
                      {(comm.authorId === user?.uid || roles.includes('superadmin')) && (
                        <div className="absolute right-3 top-3">
                          {deleteCommentConfirmId === comm.id ? (
                            <div className="flex items-center gap-1 bg-red-600 p-1 rounded-lg shadow-sm shrink-0 scale-90">
                              <button 
                                onClick={() => handleDeleteComment(comm.id)} 
                                className="text-white font-bold p-0.5 hover:text-red-200 text-[8px] cursor-pointer"
                              >
                                <Check className="w-2.5 h-2.5" />
                              </button>
                              <button 
                                onClick={() => setDeleteCommentConfirmId(null)} 
                                className="text-white font-bold p-0.5 hover:text-slate-200 text-[8px] cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setDeleteCommentConfirmId(comm.id)}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity p-1 rounded-lg hover:bg-slate-200"
                              title="Eliminar Comentario"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
