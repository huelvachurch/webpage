import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search, Filter, 
  Eye, GraduationCap, Calendar, Clock, Users, CheckCircle, AlertCircle, 
  ChevronRight, ArrowLeft, BookOpen, Settings, Check, ListTodo, Paperclip, 
  Heading, Bold, Italic, Link, FileText, ChevronDown, ChevronUp, Award
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, 
  orderBy, serverTimestamp, where, getDocs 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  modality: 'self-paced' | 'scheduled';
  durationMode: 'unlimited' | 'limited' | 'flexible' | 'fixed';
  startDate?: any;
  endDate?: any;
  timeLimitDays?: number;
  imageUrl: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: any;
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  grade?: number;
  progress: number;
  enrolledAt: any;
}

interface ClassItem {
  id: string;
  title: string;
  description: string;
  order: number;
  requiresPrevious: boolean;
  dayNumber: number;
}

interface StepItem {
  id: string;
  title: string;
  type: 'theory' | 'quiz';
  order: number;
  content: string;
  attachments?: { name: string; url: string }[];
  questions?: {
    question: string;
    options?: string[];
    correctAnswer?: number;
    type?: 'single' | 'multiple' | 'text' | 'pairs';
    correctAnswers?: number[];
    pairs?: { left: string; right: string }[];
    guidelineAnswer?: string;
  }[];
}

export default function AdminCursos() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  
  // Modals & General Views State
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // activeWorkspaceCourse determines if we are in the course manager or the Wix-like builder
  const [activeWorkspaceCourse, setActiveWorkspaceCourse] = useState<Course | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'contenido' | 'participantes' | 'ajustes'>('contenido');
  
  // Realtime Course builder items state
  const [workspaceClasses, setWorkspaceClasses] = useState<ClassItem[]>([]);
  const [workspaceSteps, setWorkspaceSteps] = useState<Record<string, StepItem[]>>({});
  
  // Active selected item in workspace classes sidebar
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // States for deleting items and collapsing/expanding sidebar on mobile
  const [courseToDeleteId, setCourseToDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [classToDelete, setClassToDelete] = useState<{ id: string; title: string } | null>(null);
  const [stepToDelete, setStepToDelete] = useState<{ classId: string; stepId: string; title: string } | null>(null);
  const [isSidebarCollapsedOnMobile, setIsSidebarCollapsedOnMobile] = useState(true);

  // Markdown Editor Tooling
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  // Attachment Input State
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  
  // Form for initial course placement (New Course)
  const [newCourseFormData, setNewCourseFormData] = useState({
    title: '',
    description: '',
    modality: 'self-paced' as 'self-paced' | 'scheduled',
    durationMode: 'unlimited' as 'unlimited' | 'limited' | 'flexible' | 'fixed',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  });

  // Workspace - Ajustes Tab forms
  const [ajustesFormData, setAjustesFormData] = useState({
    title: '',
    description: '',
    modality: 'self-paced' as 'self-paced' | 'scheduled',
    durationMode: 'unlimited' as 'unlimited' | 'limited' | 'flexible' | 'fixed',
    startDate: '',
    endDate: '',
    timeLimitDays: 0,
    imageUrl: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
  });

  const isAdmin = roles.includes('admin');
  const isProfesor = roles.includes('profesor') || roles.includes('superadmin');

  // Redirect if not authorized
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isProfesor) {
        navigate('/');
      }
    }
  }, [user, isProfesor, loading, isAuthReady, navigate]);

  // Fetch courses list
  useEffect(() => {
    if (isAuthReady && user && isProfesor) {
      const isSuperAdmin = roles.includes('superadmin');
      const q = isSuperAdmin 
        ? query(collection(db, 'courses'), orderBy('createdAt', 'desc'))
        : query(collection(db, 'courses'), where('instructorId', '==', user.uid), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const coursesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        setCourses(coursesData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'courses');
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, user, isProfesor, roles]);

  // Fetch enrollments database
  useEffect(() => {
    if (isAuthReady && user && isProfesor) {
      const q = query(collection(db, 'enrollments'), orderBy('enrolledAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const enrollmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Enrollment[];
        setEnrollments(enrollmentsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, user, isProfesor]);

  // Realtime subscription to Workspace Classes & Steps when course selected
  useEffect(() => {
    if (activeWorkspaceCourse) {
      const classesRef = collection(db, 'courses', activeWorkspaceCourse.id, 'classes');
      const classesQuery = query(classesRef, orderBy('order', 'asc'));
      const stepUnsubscribes: (() => void)[] = [];
      
      const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
        // Unsubscribe from previous database dynamic bindings first
        stepUnsubscribes.forEach(unsub => unsub());
        stepUnsubscribes.length = 0;

        const classesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClassItem[];
        setWorkspaceClasses(classesData);
        
        // Subscribe to step list under each class dynamically
        snapshot.docs.forEach((classDoc) => {
          const stepsRef = collection(db, 'courses', activeWorkspaceCourse.id, 'classes', classDoc.id, 'steps');
          const stepsQuery = query(stepsRef, orderBy('order', 'asc'));
          
          const unsubSteps = onSnapshot(stepsQuery, (stepsSnapshot) => {
            const stepsData = stepsSnapshot.docs.map(sDoc => ({
              id: sDoc.id,
              ...sDoc.data()
            })) as StepItem[];
            
            setWorkspaceSteps((prev) => ({
              ...prev,
              [classDoc.id]: stepsData
            }));
          }, (err) => {
            console.error(`Error loading steps for class ${classDoc.id}`, err);
          });

          stepUnsubscribes.push(unsubSteps);
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `courses/${activeWorkspaceCourse.id}/classes`);
      });
      
      return () => {
        unsubscribeClasses();
        stepUnsubscribes.forEach(unsub => unsub());
      };
    } else {
      setWorkspaceClasses([]);
      setWorkspaceSteps({});
      setActiveClassId(null);
      setActiveStepId(null);
    }
  }, [activeWorkspaceCourse]);

  // Setup initial adjustments form values when course is chosen
  useEffect(() => {
    if (activeWorkspaceCourse) {
      setAjustesFormData({
        title: activeWorkspaceCourse.title,
        description: activeWorkspaceCourse.description,
        modality: activeWorkspaceCourse.modality,
        durationMode: activeWorkspaceCourse.durationMode,
        startDate: activeWorkspaceCourse.startDate ? new Date(activeWorkspaceCourse.startDate.seconds * 1000).toISOString().split('T')[0] : '',
        endDate: activeWorkspaceCourse.endDate ? new Date(activeWorkspaceCourse.endDate.seconds * 1000).toISOString().split('T')[0] : '',
        timeLimitDays: activeWorkspaceCourse.timeLimitDays || 0,
        imageUrl: activeWorkspaceCourse.imageUrl || '',
        status: activeWorkspaceCourse.status || 'draft',
      });
    }
  }, [activeWorkspaceCourse]);

  // Helper properties
  const activeClass = workspaceClasses.find(c => c.id === activeClassId);
  const activeStep = activeClassId && activeStepId && workspaceSteps[activeClassId]
    ? workspaceSteps[activeClassId].find(s => s.id === activeStepId)
    : null;

  // Handles adding initial Course shell
  const handleAddNewCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const coursePayload = {
        title: newCourseFormData.title,
        description: newCourseFormData.description,
        modality: newCourseFormData.modality,
        durationMode: newCourseFormData.durationMode,
        imageUrl: newCourseFormData.imageUrl,
        instructorId: user.uid,
        instructorName: user.displayName || 'Profesor',
        status: 'draft' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'courses'), coursePayload);
      const createdCourse = {
        id: docRef.id,
        ...coursePayload,
        createdAt: new Date(),
      } as unknown as Course;
      
      setIsNewCourseModalOpen(false);
      // Immediately dive into the rich workspace editor!
      setActiveWorkspaceCourse(createdCourse);
      setWorkspaceTab('contenido');

      // Add a first default syllabus class automatically for wix-like helper starts
      await addDoc(collection(db, 'courses', docRef.id, 'classes'), {
        title: 'Clase 1: Introducción',
        description: 'Primera toma de contacto con la materia.',
        order: 0,
        requiresPrevious: false,
        dayNumber: 1,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'courses');
    } finally {
      setIsSaving(false);
    }
  };

  // Handles updating adjustments / general details of active course
  const handleUpdateCourseDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceCourse) return;
    setIsSaving(true);

    // Validate publishing eligibility
    if (ajustesFormData.status === 'published') {
      const totalClasses = workspaceClasses.length;
      const totalSteps = Object.values(workspaceSteps).reduce((sum, list) => sum + list.length, 0);

      if (totalClasses === 0 || totalSteps === 0) {
        alert('No se puede publicar el curso todavía. Para poder publicarlo de forma oficial, debes agregar una estructura de clases y por lo menos un paso con teoría o cuestionario.');
        setIsSaving(false);
        return;
      }
    }

    try {
      const updatePayload = {
        title: ajustesFormData.title,
        description: ajustesFormData.description,
        modality: ajustesFormData.modality,
        durationMode: ajustesFormData.durationMode,
        timeLimitDays: ajustesFormData.timeLimitDays,
        imageUrl: ajustesFormData.imageUrl,
        status: ajustesFormData.status,
        startDate: ajustesFormData.startDate ? serverTimestamp() : null, // Simplification
        endDate: ajustesFormData.endDate ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id), updatePayload);
      
      // Update local state course representation so headers reflect it too
      setActiveWorkspaceCourse((prev) => prev ? { ...prev, ...updatePayload } : null);
      alert('Ajustes generales actualizados con éxito.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${activeWorkspaceCourse.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Course entire document (triggers state-based custom confirmation modal)
  const handleDeleteCourse = (courseId: string) => {
    setCourseToDeleteId(courseId);
    setDeleteConfirmText('');
  };

  // Workspace CLASES / SECTIONS actions
  const handleAddWorkspaceClass = async () => {
    if (!activeWorkspaceCourse) return;
    try {
      const nextOrder = workspaceClasses.length;
      await addDoc(collection(db, 'courses', activeWorkspaceCourse.id, 'classes'), {
        title: `Sección (Clase) ${workspaceClasses.length + 1}`,
        description: '',
        order: nextOrder,
        requiresPrevious: false,
        dayNumber: nextOrder + 1,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${activeWorkspaceCourse.id}/classes`);
    }
  };

  const handleUpdateClassFields = async (classId: string, updatedFields: Partial<ClassItem>) => {
    if (!activeWorkspaceCourse) return;
    try {
      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', classId), updatedFields);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${activeWorkspaceCourse.id}/classes/${classId}`);
    }
  };

  const handleDeleteWorkspaceClass = (classId: string) => {
    const cl = workspaceClasses.find(c => c.id === classId);
    if (cl) {
      setClassToDelete({ id: classId, title: cl.title });
    }
  };

  // Move class order Up/Down to sort
  const handleMoveClass = async (classId: string, direction: 'up' | 'down') => {
    if (!activeWorkspaceCourse) return;
    const index = workspaceClasses.findIndex(c => c.id === classId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === workspaceClasses.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentClass = workspaceClasses[index];
    const targetClass = workspaceClasses[targetIndex];

    try {
      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', currentClass.id), { order: targetClass.order });
      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', targetClass.id), { order: currentClass.order });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${activeWorkspaceCourse.id}/classes`);
    }
  };

  // Workspace PASOS / STEPS actions
  const handleAddWorkspaceStep = async (classId: string, stepType: 'theory' | 'quiz') => {
    if (!activeWorkspaceCourse) return;
    const currentSteps = workspaceSteps[classId] || [];
    const nextOrder = currentSteps.length;

    try {
      const stepPayload = {
        title: stepType === 'theory' ? `Teoría ${currentSteps.length + 1}` : `Cuestionario ${currentSteps.length + 1}`,
        type: stepType,
        order: nextOrder,
        content: stepType === 'theory' 
          ? '### Título del Tema\n\nDesarrolla aquí el material de estudio. Puedes usar encabezados, listas numeradas, textos en negrita o bloques de código informativos.' 
          : '',
        attachments: [],
        questions: stepType === 'quiz' ? [
          {
            question: '¿Escribe la primera pregunta del test aquí?',
            options: ['Primera opción', 'Segunda opción alternativa', 'Tercera opción', 'Cuarta posible respuesta'],
            correctAnswer: 0,
            type: 'single'
          }
        ] : [],
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'courses', activeWorkspaceCourse.id, 'classes', classId, 'steps'), stepPayload);
      setActiveClassId(classId);
      setActiveStepId(docRef.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `courses/${activeWorkspaceCourse.id}/classes/${classId}/steps`);
    }
  };

  const handleUpdateStepFields = async (fields: Partial<StepItem>) => {
    if (!activeWorkspaceCourse || !activeClassId || !activeStepId) return;
    try {
      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', activeClassId, 'steps', activeStepId), fields);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${activeWorkspaceCourse.id}/classes/${activeClassId}/steps/${activeStepId}`);
    }
  };

  const handleDeleteWorkspaceStep = (classId: string, stepId: string) => {
    const steps = workspaceSteps[classId] || [];
    const st = steps.find(s => s.id === stepId);
    if (st) {
      setStepToDelete({ classId, stepId, title: st.title });
    }
  };

  const handleMoveStep = async (classId: string, stepId: string, direction: 'up' | 'down') => {
    if (!activeWorkspaceCourse) return;
    const steps = workspaceSteps[classId] || [];
    const index = steps.findIndex(s => s.id === stepId);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentStep = steps[index];
    const targetStep = steps[targetIndex];

    try {
      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', classId, 'steps', currentStep.id), { order: targetStep.order });
      await updateDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', classId, 'steps', targetStep.id), { order: currentStep.order });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `courses/${activeWorkspaceCourse.id}/classes/${classId}/steps`);
    }
  };

  // Helper text utility injecting markdown
  const injectMarkdownMarkup = (prefix: string, suffix: string = '') => {
    if (!activeStep || activeStep.type !== 'theory') return;
    const textarea = document.getElementById('theory-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = prefix + (selectedText || 'texto') + suffix;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleUpdateStepFields({ content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText || 'texto').length);
    }, 10);
  };

  // Attachments Manager
  const handleAddAttachment = () => {
    if (!activeStep || activeStep.type !== 'theory' || !newAttachmentName || !newAttachmentUrl) return;
    const currentAttachments = activeStep.attachments || [];
    const updated = [...currentAttachments, { name: newAttachmentName, url: newAttachmentUrl }];
    
    handleUpdateStepFields({ attachments: updated });
    setNewAttachmentName('');
    setNewAttachmentUrl('');
  };

  const handleRemoveAttachment = (idx: number) => {
    if (!activeStep || activeStep.type !== 'theory' || !activeStep.attachments) return;
    const updated = activeStep.attachments.filter((_, i) => i !== idx);
    handleUpdateStepFields({ attachments: updated });
  };

  // Quiz Editor Questions List Update
  const handleUpdateQuizQuestion = (questionIdx: number, fields: any) => {
    if (!activeStep || activeStep.type !== 'quiz' || !activeStep.questions) return;
    const updated = [...activeStep.questions];
    updated[questionIdx] = { ...updated[questionIdx], ...fields };
    handleUpdateStepFields({ questions: updated });
  };

  const handleAddQuizQuestion = () => {
    if (!activeStep || activeStep.type !== 'quiz') return;
    const currentQuestions = activeStep.questions || [];
    const updated = [
      ...currentQuestions,
      {
        question: 'Nueva Pregunta instructiva',
        options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctAnswer: 0,
        type: 'single' as const
      }
    ];
    handleUpdateStepFields({ questions: updated });
  };

  const handleRemoveQuizQuestion = (questionIdx: number) => {
    if (!activeStep || activeStep.type !== 'quiz' || !activeStep.questions) return;
    const updated = activeStep.questions.filter((_, idx) => idx !== questionIdx);
    handleUpdateStepFields({ questions: updated });
  };

  // Participantes / Inscripciones handlers
  const handleEnrollmentStatusChange = async (enrollmentId: string, nextStatus: Enrollment['status']) => {
    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    }
  };

  const handleAssignGrade = async (enrollmentId: string, grade: number) => {
    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        grade,
        updatedAt: serverTimestamp(),
      });
      alert('Nota calificada correctamente en el expediente del alumno.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    }
  };

  // Filtering searches
  const filteredCoursesList = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isAuthReady) return <div className="pt-36 text-center text-primary/40 font-semibold">Validando credenciales académicas...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <AnimatePresence mode="wait">
          {!activeWorkspaceCourse ? (
            /* ==========================================
               1. STANDARD MAIN DASHBOARD: LIST OF COURSES
               ========================================== */
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                  <h1 className="text-4xl font-kenao text-primary mb-2">Docencia</h1>
                  <p className="text-primary/60 text-sm">Gestiona tus cursos, clases, secciones de aprendizaje y solicitudes de alumnos</p>
                </div>
                
                <button
                  onClick={() => setIsNewCourseModalOpen(true)}
                  className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg text-sm"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Curso
                </button>
              </div>

              {/* Research Bar */}
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xs mb-8 flex items-center">
                <div className="relative flex-grow">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar entre tus cursos activos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm"
                  />
                </div>
              </div>

              {/* Course items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCoursesList.map((course) => {
                  const courseEnrollments = enrollments.filter(e => e.courseId === course.id);
                  const pendingCount = courseEnrollments.filter(e => e.status === 'pending').length;

                  return (
                    <div 
                      key={course.id}
                      className="bg-white rounded-[2.5rem] shadow-xs border border-slate-100 overflow-hidden group hover:shadow-xl hover:border-slate-200/50 transition-all duration-500 flex flex-col h-full"
                    >
                      <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                        <img 
                          src={course.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} 
                          alt={course.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-4 right-4">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/95 backdrop-blur-md shadow-sm ${
                            course.status === 'published' ? 'text-emerald-700' : course.status === 'draft' ? 'text-amber-700' : 'text-slate-500'
                          }`}>
                            {course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Borrador' : 'Archivado'}
                          </span>
                        </div>
                      </div>

                      <div className="p-8 flex-grow flex flex-col">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">
                          {course.modality === 'self-paced' ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                          {course.modality === 'self-paced' ? 'A ritmo personal' : 'Programado'}
                        </div>

                        <h3 className="text-xl font-bold text-primary mb-2 line-clamp-1 group-hover:text-secondary transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-primary/60 text-xs mb-6 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>

                        <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-primary/40 flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                              <Users className="w-3.5 h-3.5" />
                              {courseEnrollments.length}
                            </span>
                            
                            {pendingCount > 0 && (
                              <span className="bg-red-50 text-red-600 font-bold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 animate-pulse border border-red-100">
                                <Users className="w-3 h-3 text-red-500" />
                                {pendingCount} espera
                              </span>
                            )}
                          </div>

                          <div className="flex gap-1.5">
                            {/* CTA workspace entrance */}
                            <button
                              onClick={() => {
                                setActiveWorkspaceCourse(course);
                                setWorkspaceTab('contenido');
                              }}
                              className="px-4.5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 cursor-pointer"
                            >
                              Workspace <ChevronRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="p-2.5 text-slate-300 hover:text-red-500 bg-slate-50 border border-slate-100 rounded-xl transition-all cursor-pointer"
                              title="Eliminar curso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredCoursesList.length === 0 && (
                  <div className="col-span-full bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-xs">
                    <GraduationCap className="w-16 h-16 text-primary/10 mx-auto mb-4" />
                    <h3 className="text-2xl font-kenao text-primary mb-2">No se encontraron cursos</h3>
                    <p className="text-primary/40 text-sm mb-6">Crea tu primer programa de estudio de forma sencilla haciendo clic en Nuevo programa.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ==========================================
               2. PREMIER WIX-LIKE FULL COURSE WORKSPACE
               ========================================== */
            <motion.div
              key="workspace-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden min-h-[80vh] flex flex-col"
            >
              {/* Header section with course Cover background */}
              <div className="bg-primary px-8 py-8 md:px-12 text-white relative">
                <div className="absolute inset-0 opacity-10 mix-blend-overlay overflow-hidden">
                  <img 
                    src={activeWorkspaceCourse.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setActiveWorkspaceCourse(null)}
                      className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/25 px-2.5 py-1 rounded-md text-white">
                          Edición de Curso
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                          activeWorkspaceCourse.status === 'published' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {activeWorkspaceCourse.status === 'published' ? 'Publicado' : 'Borrador'}
                        </span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-kenao font-normal leading-tight">
                        {activeWorkspaceCourse.title}
                      </h1>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setWorkspaceTab('contenido');
                        setActiveClassId(null);
                        setActiveStepId(null);
                      }}
                      className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer w-full sm:w-auto ${
                        workspaceTab === 'contenido' ? 'bg-secondary text-primary shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/25'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                      Contenido
                    </button>
                    <button
                      onClick={() => setWorkspaceTab('participantes')}
                      className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer w-full sm:w-auto ${
                        workspaceTab === 'participantes' ? 'bg-secondary text-primary shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/25'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Participantes
                      {enrollments.filter(e => e.courseId === activeWorkspaceCourse.id && e.status === 'pending').length > 0 && (
                        <span className="flex-shrink-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" />
                      )}
                    </button>
                    <button
                      onClick={() => setWorkspaceTab('ajustes')}
                      className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer w-full sm:w-auto ${
                        workspaceTab === 'ajustes' ? 'bg-secondary text-primary shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/25'
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Ajustes
                    </button>
                  </div>
                </div>
              </div>

              {/* Workspace Content Router depending on active Tab */}
              <div className="flex-grow flex flex-col bg-white">
                <AnimatePresence mode="wait">
                  
                  {workspaceTab === 'contenido' && (
                    /* ==================================================
                       TAB 2A. CONTENT WORKSPACE (Classes & Steps)
                       ================================================== */
                    <motion.div
                      key="tab-contenido"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]"
                    >
                       {/* Left Sidebar (col-span-4): Clases & Sections tree */}
                      <div className="lg:col-span-4 border-r border-slate-100 flex flex-col bg-slate-50/50 lg:max-h-[70vh] lg:overflow-y-auto">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                          <div className="flex items-center justify-between w-full lg:w-auto">
                            <h2 className="text-xs font-black uppercase tracking-widest text-[#008080] flex items-center gap-1.5">
                              <ListTodo className="w-4 h-4 text-[#008080]/65" />
                              Programa ({workspaceClasses.length})
                            </h2>
                            {/* Mobile Collapse/Expand Trigger Button */}
                            <button
                              type="button"
                              onClick={() => setIsSidebarCollapsedOnMobile(!isSidebarCollapsedOnMobile)}
                              className="lg:hidden text-[10px] font-black uppercase tracking-wider text-secondary bg-secondary/10 hover:bg-secondary/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                            >
                              {isSidebarCollapsedOnMobile ? 'Mostrar Temario ▾' : 'Ocultar Temario ▴'}
                            </button>
                          </div>
                          
                          <button
                            onClick={handleAddWorkspaceClass}
                            className="text-[10px] font-black uppercase tracking-wider text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 cursor-pointer justify-center w-full sm:w-auto"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Clase
                          </button>
                        </div>

                        <div className={`p-4 space-y-3 flex-grow ${isSidebarCollapsedOnMobile ? 'hidden lg:block' : 'block'}`}>
                          {workspaceClasses.map((clase, cIdx) => {
                            const stepsList = workspaceSteps[clase.id] || [];
                            const isSelectedClass = activeClassId === clase.id;

                            return (
                              <div key={clase.id} className={`rounded-2xl border transition-all ${
                                isSelectedClass ? 'bg-white border-secondary/30 shadow-sm' : 'bg-transparent border-slate-100'
                              }`}>
                                {/* Class Header Bar */}
                                <div className="p-4 flex items-center justify-between gap-2">
                                  <div 
                                    className="flex-grow cursor-pointer"
                                    onClick={() => {
                                      setActiveClassId(clase.id);
                                      setActiveStepId(null);
                                      setIsSidebarCollapsedOnMobile(true);
                                    }}
                                  >
                                    <h4 className="font-bold text-primary text-sm mb-0.5 line-clamp-1">{clase.title}</h4>
                                    
                                    {/* Class parameters badges */}
                                    <div className="flex gap-1.5 flex-wrap mt-1">
                                      {clase.requiresPrevious && (
                                        <span className="text-[8px] font-black uppercase tracking-wider bg-red-50 text-red-700 px-2 py-0.5 rounded-md border border-red-100">
                                          Dependiente
                                        </span>
                                      )}
                                      {(activeWorkspaceCourse.durationMode === 'limited' || activeWorkspaceCourse.modality === 'scheduled') && (
                                        <span className="text-[8px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                          Día {clase.dayNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Class layout operations */}
                                  <div className="flex items-center gap-1">
                                    <button 
                                      disabled={cIdx === 0}
                                      onClick={(e) => { e.stopPropagation(); handleMoveClass(clase.id, 'up'); }}
                                      className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-all cursor-pointer"
                                      title="Subir orden"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      disabled={cIdx === workspaceClasses.length - 1}
                                      onClick={(e) => { e.stopPropagation(); handleMoveClass(clase.id, 'down'); }}
                                      className="p-1 text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-all cursor-pointer"
                                      title="Bajar orden"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeleteWorkspaceClass(clase.id); }}
                                      className="p-1 text-slate-300 hover:text-red-500 transition-all cursor-pointer"
                                      title="Borrar clase"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Slide panel of Steps inside class */}
                                <div className="px-4 pb-4 border-t border-slate-50 bg-slate-50/20 rounded-b-2xl pt-2.5">
                                  <div className="space-y-1.5">
                                    {stepsList.map((step, sIdx) => {
                                      const isSelectedStep = activeStepId === step.id && activeClassId === clase.id;

                                      return (
                                        <div 
                                          key={step.id}
                                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                            isSelectedStep ? 'bg-primary text-white font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                                          }`}
                                          onClick={() => {
                                            setActiveClassId(clase.id);
                                            setActiveStepId(step.id);
                                            setIsSidebarCollapsedOnMobile(true);
                                          }}
                                        >
                                          <div className="flex items-center gap-2 flex-grow min-w-0">
                                            <span className="text-[10px] shrink-0">
                                              {step.type === 'theory' ? '📝' : '❓'}
                                            </span>
                                            <span className="truncate">{step.title}</span>
                                          </div>

                                          <div className="flex items-center gap-0.5 opacity-60 hover:opacity-100 shrink-0">
                                            <button 
                                              disabled={sIdx === 0}
                                              onClick={(e) => { e.stopPropagation(); handleMoveStep(clase.id, step.id, 'up'); }}
                                              className="p-0.5 hover:text-white transition-all disabled:opacity-20 text-slate-400 cursor-pointer"
                                            >
                                              <ChevronUp className="w-3 h-3" />
                                            </button>
                                            <button 
                                              disabled={sIdx === stepsList.length - 1}
                                              onClick={(e) => { e.stopPropagation(); handleMoveStep(clase.id, step.id, 'down'); }}
                                              className="p-0.5 hover:text-white transition-all disabled:opacity-20 text-slate-400 cursor-pointer"
                                            >
                                              <ChevronDown className="w-3 h-3" />
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeleteWorkspaceStep(clase.id, step.id); }}
                                              className="p-0.5 hover:text-red-400 text-slate-400 transition-all cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}

                                    {/* Action items inside class to add theory or quizzes */}
                                    <div className="pt-2 flex gap-1">
                                      <button
                                        onClick={() => handleAddWorkspaceStep(clase.id, 'theory')}
                                        className="flex-1 text-[10px] bg-white border border-slate-100 text-slate-600 hover:border-secondary hover:text-primary transition-all py-1.5 rounded-lg font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" /> Teoría
                                      </button>
                                      <button
                                        onClick={() => handleAddWorkspaceStep(clase.id, 'quiz')}
                                        className="flex-1 text-[10px] bg-white border border-slate-100 text-slate-600 hover:border-secondary hover:text-primary transition-all py-1.5 rounded-lg font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" /> Test
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {workspaceClasses.length === 0 && (
                            <div className="py-12 text-center text-primary/30 text-xs font-semibold">
                              No hay clases. Haz clic en + Clase para empezar a crear la estructura.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Panel (col-span-8): Interactive Workspace Rich Editor */}
                      <div className="lg:col-span-8 p-8 flex flex-col max-h-[70vh] overflow-y-auto bg-white">
                        
                        {!activeClassId ? (
                          /* 2A.I NO CLASS CHOSEN PLACEHOLDER */
                          <div className="flex-grow flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mb-6">
                              <BookOpen className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-kenao text-primary mb-2">Comienza a diseñar tu temario</h3>
                            <p className="text-primary/60 text-sm max-w-md leading-relaxed">
                              Selecciona una de las secciones (clases) en el panel de la izquierda para diseñar sus condiciones o agregar clases de teoría y cuestionarios.
                            </p>
                          </div>
                        ) : !activeStepId ? (
                          /* 2A.II CLASS OPTIONS (Inline configuration) SELECTED */
                          <div className="space-y-8 animate-fade-in">
                            <div className="border-b border-slate-100 pb-5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">Configuración técnica</span>
                              <h3 className="text-2xl font-kenao text-primary">Detalles de {activeClass.title}</h3>
                            </div>

                            <div className="space-y-6 max-w-lg">
                              <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Nombre de la Clase</label>
                                <input
                                  type="text"
                                  value={activeClass.title}
                                  onChange={(e) => handleUpdateClassFields(activeClass.id, { title: e.target.value })}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm font-semibold"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Descripción breve (opcional)</label>
                                <textarea
                                  rows={3}
                                  value={activeClass.description}
                                  onChange={(e) => handleUpdateClassFields(activeClass.id, { description: e.target.value })}
                                  placeholder="Escribe brevemente una sinopsis o resumen para esta clase"
                                  className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm resize-none"
                                />
                              </div>

                              {/* Modality dependencies dynamically */}
                              {activeWorkspaceCourse.modality === 'self-paced' && activeWorkspaceCourse.durationMode === 'unlimited' && (
                                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-start gap-3.5">
                                  <input
                                    id="checkbox-dependency"
                                    type="checkbox"
                                    checked={activeClass.requiresPrevious}
                                    onChange={(e) => handleUpdateClassFields(activeClass.id, { requiresPrevious: e.target.checked })}
                                    className="w-4 h-4 border border-slate-300 rounded-sm text-secondary focus:ring-secondary mt-1 cursor-pointer"
                                  />
                                  <div>
                                    <label htmlFor="checkbox-dependency" className="block text-sm font-bold text-primary cursor-pointer">
                                      ¿Bloquear hasta completar clase anterior?
                                    </label>
                                    <span className="block text-xs text-primary/50 text-wrap leading-relaxed mt-1">
                                      El alumno no podrá ingresar ni ver el contenido de esta clase a menos de que haya completado al 100% todos los pasos de la clase precedente.
                                    </span>
                                  </div>
                                </div>
                              )}

                              {(activeWorkspaceCourse.durationMode === 'limited' || activeWorkspaceCourse.modality === 'scheduled') && (
                                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                                  <label className="block text-sm font-bold text-primary mb-1">Día asignado en la formación</label>
                                  <span className="block text-xs text-primary/50 mb-3">Establece en qué día del cronograma se habilitará esta clase para los alumnos inscritos.</span>
                                  <input
                                    type="number"
                                    value={activeClass.dayNumber || 1}
                                    min={1}
                                    onChange={(e) => handleUpdateClassFields(activeClass.id, { dayNumber: parseInt(e.target.value) || 1 })}
                                    className="w-full max-w-[150px] px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm font-semibold inline"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        ) : activeStep ? (
                          /* 2A.III FULL STEP ACTIONS & EDITORS */
                          <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                                  Paso {activeStep.order + 1} • {activeStep.type === 'theory' ? '📝 TEORÍA' : '❓ CUESTIONARIO'}
                                </span>
                                <input
                                  type="text"
                                  value={activeStep.title}
                                  onChange={(e) => handleUpdateStepFields({ title: e.target.value })}
                                  className="text-2xl font-bold text-primary border-b border-transparent hover:border-slate-100 focus:border-secondary outline-none py-0.5 font-kenao"
                                />
                              </div>
                            </div>

                            {/* CONDITIONAL RENDER INDIVIDUAL STEP TYPE */}
                            {activeStep.type === 'theory' ? (
                              /* ====================================
                                 A. TEORÍA EDITOR WITH RICH FORMAT SHORTCUTS & SIMULTANEOUS SIDE-BY-SIDE PREVIEW
                                 ==================================== */
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-stretch">
                                  
                                  {/* LEFT COLUMN: ASSISTED RICH TEXT BOX */}
                                  <div className="space-y-4">
                                    <div className="flex flex-col gap-2.5">
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block">Botones de Formato Rápido (Asistente)</span>
                                      
                                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                                        <button 
                                          type="button"
                                          onClick={() => injectMarkdownMarkup('### ')}
                                          className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-black rounded-lg text-[11px] font-bold border border-slate-150 transition-all flex items-center gap-1 cursor-pointer"
                                          title="Título"
                                        >
                                          📌 Título
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => injectMarkdownMarkup('#### ')}
                                          className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-black rounded-lg text-[11px] font-bold border border-slate-150 transition-all flex items-center gap-1 cursor-pointer"
                                          title="Subtítulo"
                                        >
                                          📑 Subtítulo
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => injectMarkdownMarkup('**', '**')}
                                          className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-black rounded-lg text-[11px] font-bold border border-slate-150 transition-all flex items-center gap-1 cursor-pointer"
                                          title="Destacar en Negrita"
                                        >
                                          ✍️ Negrita
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => injectMarkdownMarkup('\n- Primer punto importante\n- Segundo punto relevante\n')}
                                          className="px-2.5 py-1.5 bg-white text-slate-700 hover:text-black rounded-lg text-[11px] font-bold border border-slate-150 transition-all flex items-center gap-1 cursor-pointer"
                                          title="Lista de Viñetas"
                                        >
                                          📝 Lista
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => injectMarkdownMarkup('\n> "Porque de tal manera amó Dios al mundo..." — Juan 3:16\n')}
                                          className="px-2.5 py-1.5 bg-secondary/15 text-primary hover:bg-secondary/35 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                          title="Citar Versículos"
                                        >
                                          📖 Versículos
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => injectMarkdownMarkup('\n> **Nota:** Explica este concepto de forma sencilla.\n')}
                                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100/70 rounded-lg text-[11px] font-bold transition-all border border-amber-100 flex items-center gap-1 cursor-pointer"
                                          title="Nota"
                                        >
                                          💡 Notas
                                        </button>
                                      </div>
                                    </div>

                                    <textarea
                                      id="theory-textarea"
                                      rows={15}
                                      value={activeStep.content || ''}
                                      onChange={(e) => handleUpdateStepFields({ content: e.target.value })}
                                      className="w-full p-5 rounded-2xl border border-slate-200 font-sans text-xs outline-none focus:ring-2 focus:ring-secondary leading-relaxed bg-slate-50/20 shadow-inner resize-y min-h-[300px]"
                                      placeholder="Escribe el tema aquí de forma sencilla, puedes hacer clic en los botones de formato de arriba para ayudarte..."
                                    />
                                    <span className="text-[10px] text-slate-400 font-semibold italic">Usa los botones superiores para agregar versículos bíblicos de manera hermosa sin trucos complejos.</span>
                                  </div>

                                  {/* RIGHT COLUMN: REALTIME PREVIEW ON STUDY PAPER */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block mb-2.5">Vista Previa en Vivo (Estudio del Alumno)</span>
                                    
                                    <div className="flex-grow p-6 md:p-8 bg-slate-50 border border-slate-200/60 rounded-2xl max-h-[420px] overflow-y-auto shadow-sm prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans text-xs">
                                      {activeStep.content ? (
                                        <ReactMarkdown>{activeStep.content}</ReactMarkdown>
                                      ) : (
                                        <span className="text-slate-400 italic font-semibold">Empieza a escribir en la caja izquierda para ver la hoja de estudio cobrar vida...</span>
                                      )}
                                    </div>
                                  </div>

                                </div>

                                {/* Attachments block */}
                                <div className="pt-6 border-t border-slate-100">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-primary/40 mb-3 flex items-center gap-1.5">
                                    <Paperclip className="w-4 h-4 text-primary/20" />
                                    Archivos y Descargables Adjuntos
                                  </h4>

                                  <div className="space-y-2 mb-4 font-sans text-xs">
                                    {(activeStep.attachments || []).map((file, fIdx) => (
                                      <div key={fIdx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                                        <div className="flex items-center gap-2 text-primary font-bold">
                                          <FileText className="w-4 h-4 text-primary/30" />
                                          {file.name}
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAttachment(fIdx)}
                                          className="text-red-500 hover:text-red-700 font-black transition-all cursor-pointer"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    ))}
                                    {(activeStep.attachments || []).length === 0 && (
                                      <span className="block text-xs text-primary/30 font-semibold italic">Este paso teórico no contiene archivos adjuntos aún.</span>
                                    )}
                                  </div>

                                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex flex-col sm:flex-row gap-2 max-w-xl">
                                    <input
                                      type="text"
                                      placeholder="Nombre: Ej. Guía en PDF"
                                      value={newAttachmentName}
                                      onChange={(e) => setNewAttachmentName(e.target.value)}
                                      className="flex-grow bg-white border border-slate-150 text-xs px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-secondary/50"
                                    />
                                    <input
                                      type="url"
                                      placeholder="URL del archivo: Ej. https://..."
                                      value={newAttachmentUrl}
                                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                                      className="flex-grow bg-white border border-slate-150 text-xs px-3 py-2 rounded-xl outline-none focus:ring-1 focus:ring-secondary/50"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleAddAttachment}
                                      className="text-xs bg-primary text-white border border-primary px-4 py-2 rounded-xl font-bold hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                                    >
                                      Añadir
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* ====================================
                                 B. CUESTIONARIO TEST MULTI CHOICE BUILDER
                                 ==================================== */
                              <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-primary/40">Preguntas del Examen</h4>
                                  <button
                                    onClick={handleAddQuizQuestion}
                                    className="text-[10px] font-black uppercase tracking-wider text-secondary bg-secondary/10 px-3.5 py-1.5 rounded-xl hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Añadir Pregunta
                                  </button>
                                </div>

                                <div className="space-y-6">
                                  {(activeStep.questions || []).map((qItem, qIdx) => {
                                    const qType = qItem.type || 'single';

                                    return (
                                      <div key={qIdx} className="bg-slate-50 border border-slate-200 p-6 md:p-8 rounded-[2.5rem] space-y-6 relative shadow-xs">
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveQuizQuestion(qIdx)}
                                          className="absolute top-6 right-6 p-2 hover:bg-slate-100/80 text-slate-400 hover:text-red-500 rounded-xl transition-all cursor-pointer"
                                          title="Eliminar pregunta"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>

                                        {/* HEADER SUMMARY */}
                                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block mb-0.5">
                                            Pregunta {qIdx + 1}
                                          </span>
                                          
                                          {/* Type selector */}
                                          <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/50 p-1 rounded-2xl w-full max-w-2xl">
                                            {[
                                              { key: 'single', label: '🔘 Opción Única' },
                                              { key: 'multiple', label: '☑️ Selección Múltiple' },
                                              { key: 'text', label: '✍️ Escribir Libre' },
                                              { key: 'pairs', label: '🧩 Relacionar Conceptos' }
                                            ].map((typeObj) => (
                                              <button
                                                type="button"
                                                key={typeObj.key}
                                                onClick={() => {
                                                  const newType = typeObj.key as 'single' | 'multiple' | 'text' | 'pairs';
                                                  const updatedFields: any = { type: newType };
                                                  
                                                  if (newType === 'single') {
                                                    updatedFields.options = qItem.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
                                                    updatedFields.correctAnswer = qItem.correctAnswer !== undefined ? qItem.correctAnswer : 0;
                                                  } else if (newType === 'multiple') {
                                                    updatedFields.options = qItem.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
                                                    updatedFields.correctAnswers = qItem.correctAnswers || [0];
                                                  } else if (newType === 'text') {
                                                    updatedFields.guidelineAnswer = qItem.guidelineAnswer || 'Escribe aquí la respuesta ideal para orientar al alumno.';
                                                  } else if (newType === 'pairs') {
                                                    updatedFields.pairs = qItem.pairs || [
                                                      { left: 'Primer Concepto', right: 'Su Significado' },
                                                      { left: 'Segundo Concepto', right: 'Su Significado' }
                                                    ];
                                                  }
                                                  
                                                  handleUpdateQuizQuestion(qIdx, updatedFields);
                                                }}
                                                className={`flex-grow py-2 px-3 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                                                  qType === typeObj.key 
                                                    ? 'bg-primary text-white shadow-sm' 
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                                                }`}
                                              >
                                                {typeObj.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>

                                        {/* QUESTION TITLE TEXT */}
                                        <div className="space-y-1.5">
                                          <label className="block text-[9px] font-black uppercase tracking-widest text-primary/30">
                                            Enunciado o Pregunta Teológica
                                          </label>
                                          <input
                                            type="text"
                                            value={qItem.question}
                                            placeholder="Ej: ¿Cuáles son las tres virtudes teologales?"
                                            onChange={(e) => handleUpdateQuizQuestion(qIdx, { question: e.target.value })}
                                            className="w-full bg-white px-4 py-3.5 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-xs font-bold text-primary"
                                          />
                                        </div>

                                        {/* DETAILED OPTIONS DEPENDING ON TYPE */}
                                        {qType === 'single' && (
                                          <div className="space-y-4">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-primary/30">Configuración de Opciones (Elige la correcta)</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                              {(qItem.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D']).map((opt, oIdx) => (
                                                <div key={oIdx} className="bg-white p-4.5 rounded-2xl border border-slate-200/80 space-y-2">
                                                  <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">Opción {oIdx + 1}</span>
                                                    <label className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 cursor-pointer">
                                                      <input
                                                        type="radio"
                                                        name={`correct-${qIdx}`}
                                                        checked={qItem.correctAnswer === oIdx}
                                                        onChange={() => handleUpdateQuizQuestion(qIdx, { correctAnswer: oIdx })}
                                                        className="w-4.5 h-4.5 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                                                      />
                                                      Correcta
                                                    </label>
                                                  </div>
                                                  <input
                                                    type="text"
                                                    value={opt}
                                                    onChange={(e) => {
                                                      const currentOpts = qItem.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
                                                      const updatedOpts = [...currentOpts];
                                                      updatedOpts[oIdx] = e.target.value;
                                                      handleUpdateQuizQuestion(qIdx, { options: updatedOpts });
                                                    }}
                                                    className="w-full bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-250 outline-none focus:ring-1 focus:ring-secondary text-xs font-semibold"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {qType === 'multiple' && (
                                          <div className="space-y-4">
                                            <span className="block text-[9px] font-black uppercase tracking-widest text-primary/30">Configuración de Opciones (Marca todas las correctas)</span>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                              {(qItem.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D']).map((opt, oIdx) => {
                                                const correctList = qItem.correctAnswers || [];
                                                const isCorrect = correctList.includes(oIdx);
                                                
                                                return (
                                                  <div key={oIdx} className="bg-white p-4.5 rounded-2xl border border-slate-200/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                      <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">Opción {oIdx + 1}</span>
                                                      <label className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 cursor-pointer">
                                                        <input
                                                          type="checkbox"
                                                          checked={isCorrect}
                                                          onChange={() => {
                                                            let updated;
                                                            if (isCorrect) {
                                                              updated = correctList.filter((val: number) => val !== oIdx);
                                                            } else {
                                                              updated = [...correctList, oIdx];
                                                            }
                                                            handleUpdateQuizQuestion(qIdx, { correctAnswers: updated });
                                                          }}
                                                          className="w-4.5 h-4.5 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                                                        />
                                                        Correcta
                                                      </label>
                                                    </div>
                                                    <input
                                                      type="text"
                                                      value={opt}
                                                      onChange={(e) => {
                                                        const currentOpts = qItem.options || ['Opción A', 'Opción B', 'Opción C', 'Opción D'];
                                                        const updatedOpts = [...currentOpts];
                                                        updatedOpts[oIdx] = e.target.value;
                                                        handleUpdateQuizQuestion(qIdx, { options: updatedOpts });
                                                      }}
                                                      className="w-full bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-250 outline-none focus:ring-1 focus:ring-secondary text-xs font-semibold"
                                                    />
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {qType === 'text' && (
                                          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-sm">💡</span>
                                              <span className="text-[10px] font-black uppercase tracking-widest text-primary/45">Explicación o Criterio de Respuestas (Modelo)</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 font-medium">Esta explicación se le mostrará al alumno una vez que termine de redactar su texto libre para que pueda realizar una autoevaluación.</p>
                                            
                                            <textarea
                                              value={qItem.guidelineAnswer || ''}
                                              onChange={(e) => handleUpdateQuizQuestion(qIdx, { guidelineAnswer: e.target.value })}
                                              rows={4}
                                              placeholder="Ej: Las tres virtudes teologales de acuerdo a 1 Corintios 13 son la Fe, la Esperanza y el Amor (Caridad). El amor posee un carácter permanente..."
                                              className="w-full bg-slate-50/40 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-xs leading-relaxed font-semibold text-slate-700"
                                            />
                                          </div>
                                        )}

                                        {qType === 'pairs' && (
                                          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-sm">🧩</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary/45">Parejas de Relaciones Directas</span>
                                              </div>
                                              
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const currentPairs = qItem.pairs || [];
                                                  const updatedPairs = [...currentPairs, { left: 'Concepto', right: 'Definición Relacionada' }];
                                                  handleUpdateQuizQuestion(qIdx, { pairs: updatedPairs });
                                                }}
                                                className="text-[10px] font-black text-secondary bg-secondary/10 px-3 py-1.5 rounded-xl hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 cursor-pointer"
                                              >
                                                <Plus className="w-3.5 h-3.5" /> Añadir Pareja
                                              </button>
                                            </div>
                                            
                                            <p className="text-[10px] text-slate-500 font-medium italic">Los estudiantes verán la columna izquierda fija, y un selector con las opciones de la columna derecha mezcladas aleatoriamente para unirlas.</p>

                                            <div className="space-y-3 pt-2">
                                              {(qItem.pairs || []).map((pair: any, pIdx: number) => (
                                                <div key={pIdx} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-slate-50/50 p-3 rounded-xl border border-slate-150 relative">
                                                  <input
                                                    type="text"
                                                    value={pair.left}
                                                    placeholder="Concepto Izquierda (Ej. Amor)"
                                                    onChange={(e) => {
                                                      const updatedPairs = [...qItem.pairs];
                                                      updatedPairs[pIdx] = { ...pair, left: e.target.value };
                                                      handleUpdateQuizQuestion(qIdx, { pairs: updatedPairs });
                                                    }}
                                                    className="flex-grow bg-white px-3 py-2 rounded-lg border border-slate-150 text-xs font-bold text-slate-700"
                                                  />
                                                  <span className="text-secondary text-center self-center shrink-0">↔️</span>
                                                  <input
                                                    type="text"
                                                    value={pair.right}
                                                    placeholder="Relación Derecha (Ej. El mayor de todas ellas)"
                                                    onChange={(e) => {
                                                      const updatedPairs = [...qItem.pairs];
                                                      updatedPairs[pIdx] = { ...pair, right: e.target.value };
                                                      handleUpdateQuizQuestion(qIdx, { pairs: updatedPairs });
                                                    }}
                                                    className="flex-grow bg-white px-3 py-2 rounded-lg border border-slate-150 text-xs font-semibold text-slate-600"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const updatedPairs = qItem.pairs.filter((_: any, idx: number) => idx !== pIdx);
                                                      handleUpdateQuizQuestion(qIdx, { pairs: updatedPairs });
                                                    }}
                                                    className="p-2 hover:bg-white text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                    title="Eliminar pareja"
                                                  >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                  </button>
                                                </div>
                                              ))}

                                              {(qItem.pairs || []).length === 0 && (
                                                <span className="block text-[10px] text-slate-400 italic font-semibold text-center py-2">No has definido parejas. Haz clic en "Añadir Pareja" arriba para empezar.</span>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      </div>
                                    );
                                  })}

                                  {(activeStep.questions || []).length === 0 && (
                                    <div className="py-8 text-center text-primary/30 text-xs italic">
                                      Este cuestiorio está vacío. Añade una pregunta para comenzar a armar el test.
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>
                        ) : null}

                      </div>
                    </motion.div>
                  )}

                  {workspaceTab === 'participantes' && (
                    /* ==================================================
                       TAB 2B. PARTICIPANT WORKSPACE (Listings & CTAs)
                       ================================================== */
                    <motion.div
                      key="tab-participantes"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 space-y-6"
                    >
                      <div className="border-b border-slate-100 pb-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                          Alumnos registrados
                        </span>
                        <h2 className="text-3xl font-kenao text-primary font-normal leading-tight">Expedientes Académicos</h2>
                      </div>

                      <div className="space-y-4 max-w-4xl">
                        {enrollments.filter(e => e.courseId === activeWorkspaceCourse.id).length === 0 ? (
                          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <Users className="w-12 h-12 text-primary/10 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-primary mb-1">No hay alumnos inscritos</h3>
                            <p className="text-xs text-primary/40">Los alumnos que soliciten inscribirse en el catálogo público aparecerán aquí.</p>
                          </div>
                        ) : (
                          enrollments.filter(e => e.courseId === activeWorkspaceCourse.id).map((enrollment) => {
                            const isPending = enrollment.status === 'pending';
                            const isActive = enrollment.status === 'active';
                            const isCompleted = enrollment.status === 'completed';

                            return (
                              <div key={enrollment.id} className="bg-white border border-slate-150 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                                <div>
                                  <p className="font-bold text-primary text-base flex items-center gap-2">
                                    {enrollment.studentName}
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                      isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                      isPending ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                      isCompleted ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {isPending ? 'Pendiente' : isActive ? 'Activo' : isCompleted ? 'Completado' : 'Dado de baja'}
                                    </span>
                                  </p>
                                  
                                  {/* Enrollment info timeline */}
                                  <div className="mt-2 text-xs text-primary/40 flex flex-wrap gap-4 font-semibold">
                                    <span>Inscrito el: {enrollment.enrolledAt ? new Date(enrollment.enrolledAt.seconds * 1000).toLocaleDateString() : 'Desconocido'}</span>
                                    <span>Progreso actual: {enrollment.progress || 0}%</span>
                                    {isCompleted && enrollment.grade !== undefined && (
                                      <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                        <Award className="w-3.5 h-3.5" /> Nota Final: {enrollment.grade}/10
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {isPending && (
                                    <button
                                      onClick={() => handleEnrollmentStatusChange(enrollment.id, 'active')}
                                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" /> Aprobar alumno
                                    </button>
                                  )}

                                  {isActive && (
                                    <>
                                      <button
                                        onClick={() => {
                                          const nota = prompt('Asigna una calificación numérica de aprobación (0 al 10):', '10');
                                          if (nota !== null) {
                                            const numericGrade = parseFloat(nota);
                                            if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 10) {
                                              alert('Inserta una nota válida entre 0 y 10.');
                                            } else {
                                              handleAssignGrade(enrollment.id, numericGrade);
                                              handleEnrollmentStatusChange(enrollment.id, 'completed');
                                            }
                                          }
                                        }}
                                        className="bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Award className="w-3.5 h-3.5" /> Graduar alumno
                                      </button>
                                      
                                      <button
                                        onClick={() => handleEnrollmentStatusChange(enrollment.id, 'dropped')}
                                        className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        Dar de baja
                                      </button>
                                    </>
                                  )}

                                  {!isPending && !isActive && (
                                    <button
                                      onClick={() => handleEnrollmentStatusChange(enrollment.id, 'active')}
                                      className="bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                      Re-activar alumno
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}

                  {workspaceTab === 'ajustes' && (
                    /* ==================================================
                       TAB 2C. SETTINGS WORKSPACE (Forms details)
                       ================================================== */
                    <motion.div
                      key="tab-ajustes"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 max-w-2xl"
                    >
                      <div className="border-b border-slate-100 pb-5 mb-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                          GENERALES DEL PROGRAMA
                        </span>
                        <h2 className="text-3xl font-kenao text-primary font-normal leading-tight">Configuración del Curso</h2>
                      </div>

                      <form onSubmit={handleUpdateCourseDetails} className="space-y-6">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Título oficial</label>
                          <input 
                            type="text" 
                            required
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm font-semibold"
                            value={ajustesFormData.title}
                            onChange={(e) => setAjustesFormData({...ajustesFormData, title: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Descripción o Temario General</label>
                          <textarea 
                            required
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm resize-none"
                            value={ajustesFormData.description}
                            onChange={(e) => setAjustesFormData({...ajustesFormData, description: e.target.value})}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Modalidad de cursada</label>
                            <select 
                              className="w-full px-4 py-3 rounded-xl border border-slate-150 outline-none focus:ring-2 focus:ring-secondary text-xs uppercase font-bold tracking-wider bg-white cursor-pointer"
                              value={ajustesFormData.modality}
                              onChange={(e) => {
                                const val = e.target.value as 'self-paced' | 'scheduled';
                                setAjustesFormData({
                                  ...ajustesFormData, 
                                  modality: val,
                                  durationMode: val === 'self-paced' ? 'unlimited' : 'flexible'
                                });
                              }}
                            >
                              <option value="self-paced">A ritmo personal</option>
                              <option value="scheduled">Programado</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Configuración cronograma</label>
                            <select 
                              className="w-full px-4 py-3 rounded-xl border border-slate-150 outline-none focus:ring-2 focus:ring-secondary text-xs uppercase font-bold tracking-wider bg-white cursor-pointer"
                              value={ajustesFormData.durationMode}
                              onChange={(e) => setAjustesFormData({...ajustesFormData, durationMode: e.target.value as any})}
                            >
                              {ajustesFormData.modality === 'self-paced' ? (
                                <>
                                  <option value="unlimited">Sin límite de tiempo</option>
                                  <option value="limited">Con límite de tiempo</option>
                                </>
                              ) : (
                                <>
                                  <option value="flexible">Fecha flexible</option>
                                  <option value="fixed">Duración fija</option>
                                </>
                              )}
                            </select>
                          </div>
                        </div>

                        {ajustesFormData.durationMode === 'limited' && (
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Días habilitados límites</label>
                            <input 
                              type="number" 
                              required
                              className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm"
                              value={ajustesFormData.timeLimitDays}
                              onChange={(e) => setAjustesFormData({...ajustesFormData, timeLimitDays: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        )}

                        {ajustesFormData.durationMode === 'fixed' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Fecha Inicio</label>
                              <input 
                                type="date" 
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm"
                                value={ajustesFormData.startDate}
                                onChange={(e) => setAjustesFormData({...ajustesFormData, startDate: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Fecha Fin</label>
                              <input 
                                type="date" 
                                required
                                className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm"
                                value={ajustesFormData.endDate}
                                onChange={(e) => setAjustesFormData({...ajustesFormData, endDate: e.target.value})}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">URL de Imagen de Portada</label>
                          <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-100 bg-slate-100 shrink-0">
                              <img src={ajustesFormData.imageUrl || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <input 
                              type="url" 
                              required
                              placeholder="https://girasoles.jpg..."
                              className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm flex-grow"
                              value={ajustesFormData.imageUrl}
                              onChange={(e) => setAjustesFormData({...ajustesFormData, imageUrl: e.target.value})}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Estado del Curso</label>
                          <div className="grid grid-cols-3 gap-2">
                            {['draft', 'published', 'archived'].map((statusOption) => (
                              <button
                                key={statusOption}
                                type="button"
                                onClick={() => setAjustesFormData({...ajustesFormData, status: statusOption as any})}
                                className={`py-3 px-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border cursor-pointer ${
                                  ajustesFormData.status === statusOption
                                    ? 'bg-primary text-white border-primary shadow-sm' 
                                    : 'bg-white text-primary/40 border-slate-100 hover:border-primary/25'
                                }`}
                              >
                                {statusOption === 'draft' ? 'Borrador' : statusOption === 'published' ? 'Publicado' : 'Archivado'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex gap-4">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-primary text-white hover:bg-secondary hover:text-primary px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-lg flex-grow cursor-pointer"
                          >
                            {isSaving ? 'Guardando...' : 'Guardar Ajustes generales'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ==========================================
         3. MODAL FOR STARTING A NEW COURSE SHELL
         ========================================== */}
      <AnimatePresence>
        {isNewCourseModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-2xl font-kenao text-primary">Diseñar nuevo programa</h3>
                <button
                  type="button"
                  onClick={() => setIsNewCourseModalOpen(false)}
                  className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddNewCourse} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Título del curso</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Teología sistemática, Vida de Jesús"
                    value={newCourseFormData.title}
                    onChange={(e) => setNewCourseFormData({ ...newCourseFormData, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-150 outline-none focus:ring-2 focus:ring-secondary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Descripción o sinopsis</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Escribe de qué tratará el curso y qué aprenderán los estudiantes."
                    value={newCourseFormData.description}
                    onChange={(e) => setNewCourseFormData({ ...newCourseFormData, description: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-150 outline-none focus:ring-2 focus:ring-secondary text-sm resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Modalidad</label>
                    <select
                      value={newCourseFormData.modality}
                      onChange={(e) => {
                        const val = e.target.value as 'self-paced' | 'scheduled';
                        setNewCourseFormData({
                          ...newCourseFormData,
                          modality: val,
                          durationMode: val === 'self-paced' ? 'unlimited' : 'flexible'
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-150 outline-none focus:ring-2 focus:ring-secondary text-xs uppercase font-bold tracking-wider bg-white cursor-pointer"
                    >
                      <option value="self-paced">A ritmo personal</option>
                      <option value="scheduled">Programado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1.5">Cronograma preliminar</label>
                    <select
                      value={newCourseFormData.durationMode}
                      onChange={(e) => setNewCourseFormData({ ...newCourseFormData, durationMode: e.target.value as any })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-150 outline-none focus:ring-2 focus:ring-secondary text-xs uppercase font-bold tracking-wider bg-white cursor-pointer"
                    >
                      {newCourseFormData.modality === 'self-paced' ? (
                        <>
                          <option value="unlimited">Sin límite de tiempo</option>
                          <option value="limited">Límite de tiempo</option>
                        </>
                      ) : (
                        <>
                          <option value="flexible">Fecha flexible</option>
                          <option value="fixed">Duración fija</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewCourseModalOpen(false)}
                    className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-secondary text-primary hover:shadow-lg px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {isSaving ? 'Creando...' : 'Crear y continuar'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
         4. MODAL FOR CONFIRMING COURSE DELETION (DELETE writing required)
         ========================================== */}
      <AnimatePresence>
        {courseToDeleteId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <Trash2 className="w-8 h-8 shrink-0 bg-red-50 p-1.5 rounded-full" />
                <h3 className="text-lg font-bold text-primary">¿Eliminar este curso?</h3>
              </div>

              <p className="text-xs text-primary/60 mb-6 leading-relaxed">
                Esta acción es irreversible y eliminará de forma permanente el curso, todos sus temas, secciones, materias cargadas y registros relacionados de los alumnos. Elige con prudencia.
              </p>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 text-center">
                <span className="block text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">Para confirmar, escribe:</span>
                <span className="font-mono text-sm font-black text-red-600 tracking-wider">DELETE</span>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Escribe DELETE aquí"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl font-mono text-sm uppercase text-center focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  autoFocus
                />

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCourseToDeleteId(null);
                      setDeleteConfirmText('');
                    }}
                    className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all cursor-pointer bg-slate-50 border border-slate-100 rounded-xl"
                  >
                    No, Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deleteConfirmText !== 'DELETE'}
                    onClick={async () => {
                      if (deleteConfirmText !== 'DELETE') return;
                      try {
                        await deleteDoc(doc(db, 'courses', courseToDeleteId));
                        if (activeWorkspaceCourse?.id === courseToDeleteId) {
                          setActiveWorkspaceCourse(null);
                        }
                        setCourseToDeleteId(null);
                        setDeleteConfirmText('');
                      } catch (err) {
                        handleFirestoreError(err, OperationType.DELETE, `courses/${courseToDeleteId}`);
                      }
                    }}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Sí, Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
         5. MODAL FOR CONFIRMING CLASS DELETION
         ========================================== */}
      <AnimatePresence>
        {classToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-8 max-w-sm w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <Trash2 className="w-8 h-8 shrink-0 bg-red-50 p-1.5 rounded-full" />
                <h3 className="text-lg font-bold text-primary">¿Eliminar esta sección?</h3>
              </div>

              <p className="text-xs text-primary/60 mb-6 leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente la sección <strong className="text-primary font-bold">"{classToDelete.title}"</strong>? Esta operación borrará de inmediato todas las teorías y tests creados debajo de esta sección.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setClassToDelete(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all cursor-pointer bg-slate-50 border border-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeWorkspaceCourse) return;
                    try {
                      await deleteDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', classToDelete.id));
                      if (activeClassId === classToDelete.id) {
                        setActiveClassId(null);
                        setActiveStepId(null);
                      }
                      setClassToDelete(null);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.DELETE, `courses/${activeWorkspaceCourse.id}/classes/${classToDelete.id}`);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Eliminar Sección
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
         6. MODAL FOR CONFIRMING STEP DELETION
         ========================================== */}
      <AnimatePresence>
        {stepToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-primary/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] border border-slate-100 p-8 max-w-sm w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <Trash2 className="w-8 h-8 shrink-0 bg-red-50 p-1.5 rounded-full" />
                <h3 className="text-lg font-bold text-primary">¿Eliminar este contenido?</h3>
              </div>

              <p className="text-xs text-primary/60 mb-6 leading-relaxed">
                ¿Confirmas que deseas eliminar de forma permanente la sección de contenido de tipo <strong className="text-primary font-bold">"{stepToDelete.title}"</strong> de esta clase?
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStepToDelete(null)}
                  className="flex-1 py-3 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all cursor-pointer bg-slate-50 border border-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeWorkspaceCourse) return;
                    try {
                      await deleteDoc(doc(db, 'courses', activeWorkspaceCourse.id, 'classes', stepToDelete.classId, 'steps', stepToDelete.stepId));
                      if (activeStepId === stepToDelete.stepId) {
                        setActiveStepId(null);
                      }
                      setStepToDelete(null);
                    } catch (err) {
                      handleFirestoreError(err, OperationType.DELETE, `courses/${activeWorkspaceCourse.id}/classes/${stepToDelete.classId}/steps/${stepToDelete.stepId}`);
                    }
                  }}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Eliminar Paso
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
