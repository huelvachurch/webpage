import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search, Filter, 
  Eye, GraduationCap, Calendar, Clock, Users, CheckCircle, AlertCircle, 
  ChevronRight, ArrowLeft, BookOpen, Settings, Check, ListTodo, Paperclip, 
  Heading, Bold, Italic, Link, FileText, ChevronDown, ChevronUp, Award, Edit3, Layout, MessageCircle
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, 
  orderBy, serverTimestamp, where, getDocs, Timestamp 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { TheoryMarkdown } from '../../components/TheoryMarkdown';
import { VisualBlockEditor } from '../../components/VisualBlockEditor';

interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  modality: 'self-paced' | 'scheduled';
  durationMode: 'unlimited' | 'limited' | 'flexible' | 'fixed';
  requiresCellSupervision?: boolean;
  startDate?: any;
  endDate?: any;
  timeLimitDays?: number;
  imageUrl: string;
  diplomaPdfUrl?: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: any;
}

interface Enrollment {
  id: string;
  courseId: string;
  courseTitle?: string;
  courseName?: string;
  studentId: string;
  studentName: string;
  cellId?: string;
  cellName?: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  grade?: number;
  progress: number;
  enrolledAt: any;
  completedAt?: any;
  leaderApproved?: boolean;
  approvedClassIds?: string[];
  accompanyingTeacherId?: string;
  accompanyingTeacherName?: string;
  teacherComments?: string;
  guideName?: string;
}

interface ClassItem {
  id: string;
  title: string;
  description: string;
  order: number;
  requiresPrevious: boolean;
  requiresLeaderApproval?: boolean;
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
    instructions?: string;
    explanation?: string;
    isLocked?: boolean;
  }[];
}

const getDriveImageUrl = (url: string) => {
  if (!url) return '';
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800`;
  return url;
};

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
  const [workspaceTab, setWorkspaceTab] = useState<'contenido' | 'participantes' | 'academia' | 'ajustes'>('contenido');
  
  // Realtime Course builder items state
  const [workspaceClasses, setWorkspaceClasses] = useState<ClassItem[]>([]);
  const [workspaceSteps, setWorkspaceSteps] = useState<Record<string, StepItem[]>>({});
  
  // Active selected item in workspace classes sidebar
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  // Helper to detect isolated enumerations and format them as Markdown subtitles (##)
  const formatIsolatedEnumerationsAsSubtitles = (text: string): string => {
    if (!text) return text;
    const lines = text.split('\n');
    const resultLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      const match = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      if (match && !trimmed.startsWith('>') && !trimmed.startsWith('#')) {
        const currentNum = parseInt(match[1], 10);
        const prevNum = currentNum - 1;
        const nextNum = currentNum + 1;

        let hasPrevInList = false;
        for (let k = i - 1; k >= 0; k--) {
          const backLine = lines[k].trim();
          if (backLine.startsWith('#')) break;
          const backMatch = backLine.match(/^(\d+)[.)]\s+/);
          if (backMatch && parseInt(backMatch[1], 10) === prevNum) {
            hasPrevInList = true;
            break;
          }
        }

        let hasNextInList = false;
        for (let j = i + 1; j < lines.length; j++) {
          const aheadLine = lines[j].trim();
          if (aheadLine.startsWith('#')) break;
          const aheadMatch = aheadLine.match(/^(\d+)[.)]\s+/);
          if (aheadMatch && parseInt(aheadMatch[1], 10) === nextNum) {
            hasNextInList = true;
            break;
          }
        }

        if (!hasPrevInList && !hasNextInList) {
          resultLines.push(`## ${trimmed}`);
          continue;
        }
      }
      resultLines.push(line);
    }

    return resultLines.join('\n');
  };

  const handleSimulateSave = async () => {
    if (activeStep) {
      if (activeStep.type === 'theory') {
        await handleUpdateStepFields({
          content: activeStep.content || '',
          attachments: activeStep.attachments || []
        });
      } else if (activeStep.type === 'quiz') {
        await handleUpdateStepFields({
          questions: activeStep.questions || []
        });
      }
    }
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2500);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecciona un archivo PDF válido.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es muy pesado. El tamaño máximo es 5MB para asegurar un análisis rápido.');
      return;
    }

    try {
      setIsAnalyzingPdf(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await fetch('/api/gemini/analyze-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pdfBase64: base64Data, mimeType: file.type })
          });
          
          if (!res.ok) {
            let errorMsg = 'Error analizando PDF';
            try {
              const data = await res.json();
              if (typeof data.error === 'string') {
                try {
                  const parsedErr = JSON.parse(data.error);
                  errorMsg = parsedErr.error?.message || parsedErr.message || data.error;
                } catch {
                  errorMsg = data.error;
                }
              } else if (data.error && typeof data.error === 'object') {
                errorMsg = data.error.message || JSON.stringify(data.error);
              }
            } catch (e) {}
            throw new Error(errorMsg);
          }
          
          const data = await res.json();
          if (data.content) {
            const processedContent = formatIsolatedEnumerationsAsSubtitles(data.content);
            handleUpdateStepFields({ content: processedContent });
          }
        } catch (error: any) {
          console.error("Error AI PDF:", error);
          if (error.message.includes('Failed to fetch')) {
             alert('Error de conexión o archivo demasiado grande. Intenta con un PDF más pequeño o revisa tu conexión.');
          } else {
             alert(error.message || 'Ocurrió un error al analizar el PDF con IA.');
          }
        } finally {
          setIsAnalyzingPdf(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        alert('Error al leer el archivo.');
        setIsAnalyzingPdf(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setIsAnalyzingPdf(false);
    }
  };

  // States for deleting items and collapsing/expanding sidebar on mobile
  const [courseToDeleteId, setCourseToDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [classToDelete, setClassToDelete] = useState<{ id: string; title: string } | null>(null);
  const [stepToDelete, setStepToDelete] = useState<{ classId: string; stepId: string; title: string } | null>(null);
  const [isSidebarCollapsedOnMobile, setIsSidebarCollapsedOnMobile] = useState(false);
  const [isProgramaCollapsed, setIsProgramaCollapsed] = useState(false);

  // Inline step title editing state
  const [isEditingStepTitle, setIsEditingStepTitle] = useState(false);
  const [editingStepTitleValue, setEditingStepTitleValue] = useState('');

  // Theory & Quiz view mode & interactive preview states
  const [theoryViewMode, setTheoryViewMode] = useState<'editor' | 'preview' | 'both'>('editor');
  const [quizViewMode, setQuizViewMode] = useState<'editor' | 'preview'>('editor');
  const [quizPreviewAnswers, setQuizPreviewAnswers] = useState<Record<number, any>>({});
  const [quizPreviewSubmitted, setQuizPreviewSubmitted] = useState(false);
  const [showGuidelineForQuestion, setShowGuidelineForQuestion] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setIsEditingStepTitle(false);
    setQuizPreviewAnswers({});
    setQuizPreviewSubmitted(false);
    setShowGuidelineForQuestion({});
  }, [activeStepId]);

  // Markdown Editor Tooling
  
  // Attachment Input State
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  
  // Form for initial course placement (New Course)
  const [newCourseFormData, setNewCourseFormData] = useState({
    title: '',
    description: '',
    modality: 'self-paced' as 'self-paced' | 'scheduled',
    durationMode: 'unlimited' as 'unlimited' | 'limited' | 'flexible' | 'fixed',
    requiresCellSupervision: false,
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  });

  // Workspace - Ajustes Tab forms
  const [ajustesFormData, setAjustesFormData] = useState({
    diplomaPdfUrl: "",
    title: '',
    description: '',
    modality: 'self-paced' as 'self-paced' | 'scheduled',
    durationMode: 'unlimited' as 'unlimited' | 'limited' | 'flexible' | 'fixed',
    requiresCellSupervision: false,
    startDate: '',
    endDate: '',
    timeLimitDays: 0,
    imageUrl: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
  });

  const isAdmin = roles.includes('admin') || roles.includes('superadmin');
  const isProfesor = roles.includes('profesor') || isAdmin;

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

  const [potentialTeachers, setPotentialTeachers] = useState<{id: string, name: string}[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, string>>({}); // local state for dropdowns
  
  // Fetch enrollments database
  useEffect(() => {
    if (isAuthReady && user && isProfesor) {
      const q = query(collection(db, 'enrollments'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const enrollmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Enrollment[];
        // Sort in memory to avoid missing docs without enrolledAt field
        enrollmentsData.sort((a, b) => {
          const timeA = a.enrolledAt?.seconds || 0;
          const timeB = b.enrolledAt?.seconds || 0;
          return timeB - timeA;
        });
        setEnrollments(enrollmentsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, user, isProfesor]);

  // Fetch potential teachers for accompaniment
  useEffect(() => {
    if (isAuthReady && user && isProfesor) {
      const q = query(collection(db, 'users'), where('roles', 'array-contains-any', ['profesor', 'admin', 'superadmin']));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const teachersList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().displayName || 'Sin nombre',
        }));
        setPotentialTeachers(teachersList);
      }, (error) => {
        console.error("Error fetching teachers:", error);
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

  const formatDateForInput = (d: any) => {
    if (!d) return '';
    if (typeof d === 'string') return d.split('T')[0];
    if (d && typeof d.seconds === 'number') return new Date(d.seconds * 1000).toISOString().split('T')[0];
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return '';
  };

  // Setup initial adjustments form values when course is chosen
  useEffect(() => {
    if (activeWorkspaceCourse) {
      setAjustesFormData({
        title: activeWorkspaceCourse.title || '',
        description: activeWorkspaceCourse.description || '',
        modality: activeWorkspaceCourse.modality || 'self-paced',
        durationMode: activeWorkspaceCourse.durationMode || 'unlimited',
        requiresCellSupervision: activeWorkspaceCourse.requiresCellSupervision || false,
        startDate: formatDateForInput(activeWorkspaceCourse.startDate),
        endDate: formatDateForInput(activeWorkspaceCourse.endDate),
        timeLimitDays: activeWorkspaceCourse.timeLimitDays || 0,
        imageUrl: activeWorkspaceCourse.imageUrl || '',
        diplomaPdfUrl: activeWorkspaceCourse.diplomaPdfUrl || '',
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
        requiresCellSupervision: newCourseFormData.requiresCellSupervision || false,
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
      // Immediately dive into the rich workspace editor with an empty course (no pre-established modules)
      setActiveWorkspaceCourse(createdCourse);
      setWorkspaceTab('contenido');
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

    try {
      const startDateVal = ajustesFormData.startDate ? new Date(ajustesFormData.startDate) : null;
      const endDateVal = ajustesFormData.endDate ? new Date(ajustesFormData.endDate) : null;

      const updatePayload = {
        title: ajustesFormData.title,
        description: ajustesFormData.description,
        modality: ajustesFormData.modality,
        durationMode: ajustesFormData.durationMode,
        requiresCellSupervision: ajustesFormData.requiresCellSupervision || false,
        timeLimitDays: ajustesFormData.timeLimitDays,
        imageUrl: ajustesFormData.imageUrl,
        diplomaPdfUrl: ajustesFormData.diplomaPdfUrl,
        status: ajustesFormData.status,
        startDate: startDateVal && !isNaN(startDateVal.getTime()) ? Timestamp.fromDate(startDateVal) : null,
        endDate: endDateVal && !isNaN(endDateVal.getTime()) ? Timestamp.fromDate(endDateVal) : null,
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
        title: `Clase ${workspaceClasses.length + 1}`,
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

  const classUpdateTimeoutRef = useRef<Record<string, any>>({});
  const stepUpdateTimeoutRef = useRef<Record<string, any>>({});

  const handleUpdateClassFields = (classId: string, updatedFields: Partial<ClassItem>) => {
    if (!activeWorkspaceCourse) return;
    const courseId = activeWorkspaceCourse.id;

    // Instantly update local state so typing is smooth and accent keys (tildes) work properly
    setWorkspaceClasses(prev => prev.map(c => c.id === classId ? { ...c, ...updatedFields } : c));

    // Debounce Firestore update
    if (classUpdateTimeoutRef.current[classId]) {
      clearTimeout(classUpdateTimeoutRef.current[classId]);
    }
    classUpdateTimeoutRef.current[classId] = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'courses', courseId, 'classes', classId), updatedFields);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}/classes/${classId}`);
      }
    }, 600);
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
        content: '',
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

  const handleUpdateStepFields = (fields: Partial<StepItem>) => {
    if (!activeWorkspaceCourse || !activeClassId || !activeStepId) return;
    const courseId = activeWorkspaceCourse.id;
    const classId = activeClassId;
    const stepId = activeStepId;

    // Instantly update local state
    setWorkspaceSteps(prev => {
      const list = prev[classId] || [];
      const idx = list.findIndex(s => s.id === stepId);
      if (idx === -1) return prev;
      const updatedList = [...list];
      updatedList[idx] = { ...updatedList[idx], ...fields };
      return { ...prev, [classId]: updatedList };
    });

    // Debounce Firestore update
    const key = `${classId}_${stepId}`;
    if (stepUpdateTimeoutRef.current[key]) {
      clearTimeout(stepUpdateTimeoutRef.current[key]);
    }
    stepUpdateTimeoutRef.current[key] = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'courses', courseId, 'classes', classId, 'steps', stepId), fields);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `courses/${courseId}/classes/${classId}/steps/${stepId}`);
      }
    }, 600);
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
  const handleAssignTeacher = async (enrollmentId: string, teacherId: string) => {
    try {
      const teacher = potentialTeachers.find(t => t.id === teacherId);
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        accompanyingTeacherId: teacherId || null,
        accompanyingTeacherName: teacher ? teacher.name : null,
        updatedAt: serverTimestamp(),
      });
      alert('Acompañante asignado exitosamente.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    }
  };

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
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    }
  };

  const isParticipantOfCourse = (e: Enrollment, course: Course | null | { id: string; title: string }) => {
    if (!e || !course) return false;
    if (e.courseId && (e.courseId === course.id || e.courseId.trim() === course.id.trim())) return true;
    if ((e as any).courseName && (e as any).courseName.toLowerCase().trim() === course.title.toLowerCase().trim()) return true;
    if ((e as any).courseTitle && (e as any).courseTitle.toLowerCase().trim() === course.title.toLowerCase().trim()) return true;
    if (e.courseId && e.courseId.toLowerCase().trim() === course.title.toLowerCase().trim()) return true;
    return false;
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    try {
      await deleteDoc(doc(db, 'enrollments', enrollmentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `enrollments/${enrollmentId}`);
    }
  };

  // Filtering searches
  const filteredCoursesList = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isAuthReady) return <div className="pt-36 text-center text-primary/40 font-semibold">Validando credenciales académicas...</div>;

  return (
    <div>
      <div>
        
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
              {/* Top Action & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
                <div className="relative flex-grow max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar entre tus cursos activos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-sm bg-slate-50/50"
                  />
                </div>

                <button
                  onClick={() => setIsNewCourseModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-md text-sm shrink-0 cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nuevo Curso</span>
                </button>
              </div>

              {/* Course items grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCoursesList.map((course) => {
                  const courseEnrollments = enrollments.filter(e => isParticipantOfCourse(e, course));
                  const pendingCount = courseEnrollments.filter(e => e.status === 'pending').length;

                  return (
                    <div 
                      key={course.id}
                      className="bg-white rounded-[2.5rem] shadow-xs border border-slate-100 overflow-hidden group hover:shadow-xl hover:border-slate-200/50 transition-all duration-500 flex flex-col h-full"
                    >
                      <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                        <img 
                          src={getDriveImageUrl(course.imageUrl) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200'} 
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
                    src={getDriveImageUrl(activeWorkspaceCourse.imageUrl) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'} 
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
                    </button>
                    {activeWorkspaceCourse && !activeWorkspaceCourse.requiresCellSupervision && (
                      <button
                        onClick={() => setWorkspaceTab('academia')}
                        className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer w-full sm:w-auto ${
                          workspaceTab === 'academia' ? 'bg-secondary text-primary shadow-md' : 'bg-white/10 text-white/80 hover:bg-white/25'
                        }`}
                      >
                        <GraduationCap className="w-4 h-4" />
                        Academia
                        {enrollments.filter(e => activeWorkspaceCourse && isParticipantOfCourse(e, activeWorkspaceCourse) && e.status === 'pending').length > 0 && (
                          <span className="flex-shrink-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" />
                        )}
                      </button>
                    )}
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
                      <div className={`border-r border-slate-100 flex flex-col bg-slate-50/50 lg:max-h-[70vh] lg:overflow-y-auto transition-all ${
                        isProgramaCollapsed ? 'hidden' : 'lg:col-span-4'
                      }`}>
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                          <div className="flex items-center justify-between w-full gap-4">
                            <h2 className="text-xs font-black uppercase tracking-widest text-[#008080] flex items-center gap-1.5 shrink-0">
                              <ListTodo className="w-4 h-4 text-[#008080]/65" />
                              Programa ({workspaceClasses.length})
                            </h2>
                            <div className="flex items-center gap-2">
                              {/* Mobile Collapse/Expand Trigger Button */}
                              <button
                                type="button"
                                onClick={() => setIsSidebarCollapsedOnMobile(!isSidebarCollapsedOnMobile)}
                                className="lg:hidden text-[10px] font-black uppercase tracking-wider text-secondary bg-secondary/10 hover:bg-secondary/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                              >
                                {isSidebarCollapsedOnMobile ? 'Mostrar Temario ▾' : 'Ocultar Temario ▴'}
                              </button>
                              {/* Desktop Collapse Trigger Button */}
                              <button
                                type="button"
                                onClick={() => setIsProgramaCollapsed(true)}
                                className="hidden lg:flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-primary bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-slate-200/60 shadow-2xs"
                                title="Ocultar columna de Programa para ampliar editor"
                              >
                                <span>Ocultar</span>
                              </button>
                            </div>
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
                                      {clase.requiresLeaderApproval && (
                                        <span className="text-[8px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200">
                                          Supervisada
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
                                      onClick={(e) => { e.stopPropagation(); setActiveClassId(clase.id); setActiveStepId(null); setIsSidebarCollapsedOnMobile(true); }}
                                      className="p-1 text-slate-400 hover:text-secondary transition-all cursor-pointer"
                                      title="Configuración Técnica"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
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

                      {/* Right Panel (col-span-8 or 12): Interactive Workspace Rich Editor */}
                      <div className={`p-8 flex flex-col max-h-[70vh] overflow-y-auto bg-white transition-all ${
                        isProgramaCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'
                      }`}>
                        {isProgramaCollapsed && (
                          <div className="mb-4 flex items-center justify-between bg-teal-50 border border-teal-100 px-4 py-2.5 rounded-2xl">
                            <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
                              <ListTodo className="w-4 h-4 text-teal-600" />
                              <span>Programa ocultado (Vista de Editor ampliada)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsProgramaCollapsed(false)}
                              className="text-xs font-bold bg-white text-teal-700 hover:bg-teal-700 hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer border border-teal-200"
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                              Mostrar Programa
                            </button>
                          </div>
                        )}
                        
                        {!activeClassId ? (
                          /* 2A.I NO CLASS CHOSEN PLACEHOLDER */
                          <div className="flex-grow hidden"></div>
                        ) : !activeStepId ? (
                          /* 2A.II CLASS OPTIONS (Inline configuration) SELECTED */
                          <div className="space-y-8 animate-fade-in">
                            <div className="border-b border-slate-100 pb-5 flex items-start justify-between">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">Configuración técnica</span>
                                <h3 className="text-2xl font-kenao text-primary">Detalles de {activeClass.title}</h3>
                              </div>
                              <button onClick={() => setActiveClassId(null)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
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

                              {/* Leader approval dependency option */}
                              {activeWorkspaceCourse.requiresCellSupervision && (
                                <div className="bg-amber-50/80 border border-amber-200 p-5 rounded-2xl flex items-start gap-3.5">
                                  <input
                                    id="checkbox-leader-approval"
                                    type="checkbox"
                                    checked={activeClass.requiresLeaderApproval || false}
                                    onChange={(e) => handleUpdateClassFields(activeClass.id, { requiresLeaderApproval: e.target.checked })}
                                    className="w-4 h-4 border border-amber-300 rounded-sm text-amber-600 focus:ring-amber-500 mt-1 cursor-pointer"
                                  />
                                  <div>
                                    <label htmlFor="checkbox-leader-approval" className="block text-sm font-bold text-primary cursor-pointer flex items-center gap-2">
                                      <span>¿Bloquear hasta que el líder de célula acepte?</span>
                                      <span className="bg-amber-200 text-amber-900 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Supervisión</span>
                                    </label>
                                    <span className="block text-xs text-amber-900/70 text-wrap leading-relaxed mt-1">
                                      Esta clase requerirá que el Líder de la Célula del alumno entre a su Portal de Líderes y haga clic en "Aprobar / Desbloquear Clase" para que el alumno pueda acceder.
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
                                {isEditingStepTitle ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <input
                                      type="text"
                                      value={editingStepTitleValue}
                                      onChange={(e) => setEditingStepTitleValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          if (editingStepTitleValue.trim()) {
                                            handleUpdateStepFields({ title: editingStepTitleValue.trim() });
                                          }
                                          setIsEditingStepTitle(false);
                                        } else if (e.key === 'Escape') {
                                          setIsEditingStepTitle(false);
                                        }
                                      }}
                                      autoFocus
                                      className="px-3 py-1.5 rounded-xl border border-secondary outline-none focus:ring-2 focus:ring-secondary text-lg font-bold text-primary bg-white shadow-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (editingStepTitleValue.trim()) {
                                          handleUpdateStepFields({ title: editingStepTitleValue.trim() });
                                        }
                                        setIsEditingStepTitle(false);
                                      }}
                                      className="p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer"
                                      title="Guardar título"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setIsEditingStepTitle(false)}
                                      className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
                                      title="Cancelar"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingStepTitleValue(activeStep.title);
                                        setIsEditingStepTitle(true);
                                      }}
                                      className="p-1.5 bg-slate-50 text-slate-400 hover:text-secondary rounded-lg shrink-0 cursor-pointer transition-colors"
                                      title="Editar título"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <h3
                                      onClick={() => {
                                        setEditingStepTitleValue(activeStep.title);
                                        setIsEditingStepTitle(true);
                                      }}
                                      className="text-2xl font-bold text-primary py-0.5 font-kenao cursor-pointer hover:text-secondary transition-colors"
                                      title="Haz clic para editar el título"
                                    >
                                      {activeStep.title}
                                    </h3>
                                  </div>
                                )}
                              </div>
                              <button onClick={() => setActiveStepId(null)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-800 rounded-lg transition-colors cursor-pointer self-start"><X className="w-4 h-4" /></button>
                            </div>

                            {/* CONDITIONAL RENDER INDIVIDUAL STEP TYPE */}
                            {activeStep.type === 'theory' ? (
                              /* ====================================
                                 A. TEORÍA EDITOR WITH TABBED / SIDE-BY-SIDE VIEW MODES
                                 ==================================== */
                              <div className="space-y-6">
                                {/* Mode Switcher Tabs for Theory */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-2xl mb-6">
                                  <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl">
                                    <button
                                      type="button"
                                      onClick={() => setTheoryViewMode('editor')}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        theoryViewMode === 'editor'
                                          ? 'bg-white text-primary shadow-xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      <Edit3 className="w-4 h-4" />
                                      Editor
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTheoryViewMode('preview')}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        theoryViewMode === 'preview'
                                          ? 'bg-white text-primary shadow-xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      <Eye className="w-4 h-4" />
                                      Vista Previa
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setTheoryViewMode('both')}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        theoryViewMode === 'both'
                                          ? 'bg-white text-primary shadow-xs'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      <Layout className="w-4 h-4" />
                                      Vista Dividida
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2 px-2">
                                    <button
                                      type="button"
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={isAnalyzingPdf}
                                      className="px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all border border-indigo-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                                      title="Subir PDF para extraer estructura con Inteligencia Artificial"
                                    >
                                      {isAnalyzingPdf ? '⏳ Analizando...' : '✨ Analizar PDF'}
                                    </button>
                                    <input
                                      type="file"
                                      accept="application/pdf"
                                      className="hidden"
                                      ref={fileInputRef}
                                      onChange={handlePdfFileChange}
                                    />
                                  </div>
                                </div>

                                {/* CONTENT CONTAINER DEPENDING ON THEORY VIEW MODE */}
                                <div className={theoryViewMode === 'both' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch' : ''}>
                                  {/* EDITOR COLUMN */}
                                  <div className={theoryViewMode === 'preview' ? 'hidden' : theoryViewMode === 'both' ? 'space-y-3' : ''}>
                                    {theoryViewMode === 'both' && (
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block">Constructor Visual</span>
                                    )}
                                    <div className="bg-slate-50/50 p-6 border border-slate-200/60 rounded-2xl shadow-xs min-h-[450px]">
                                      <VisualBlockEditor
                                        key={activeStep.id}
                                        content={activeStep.content || ''}
                                        onChange={(newContent) => handleUpdateStepFields({ content: newContent })}
                                      />
                                    </div>
                                  </div>

                                  {/* PREVIEW COLUMN */}
                                  <div className={theoryViewMode === 'editor' ? 'hidden' : theoryViewMode === 'both' ? 'space-y-3' : ''}>
                                    {theoryViewMode === 'both' && (
                                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block">Vista Previa</span>
                                    )}
                                    <div className="bg-white p-8 md:p-10 rounded-2xl border border-slate-200/80 shadow-xs min-h-[450px] prose prose-slate max-w-none text-slate-800 leading-relaxed font-sans">
                                      <TheoryMarkdown content={activeStep.content || ''} />
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

                                    <div className="flex justify-end mt-4">
                                      <button
                                        type="button"
                                        onClick={handleSimulateSave}
                                        className="bg-primary text-white hover:bg-secondary hover:text-primary px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                                      >
                                        <Save className="w-4 h-4" />
                                        Guardar cambios
                                      </button>
                                    </div>
                                </div>
                              </div>
                            ) : (
                              /* ====================================
                                 B. CUESTIONARIO TEST MULTI CHOICE BUILDER & VISTA PREVIA
                                 ==================================== */
                              <div className="space-y-6">
                                {/* Mode Switcher Tabs */}
                                <div className="flex items-center justify-between bg-slate-100/80 p-1.5 rounded-2xl mb-6">
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setQuizViewMode('editor')}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        quizViewMode === 'editor'
                                          ? 'bg-white text-primary shadow-xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                      Editor ({(activeStep.questions || []).length})
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setQuizViewMode('preview')}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        quizViewMode === 'preview'
                                          ? 'bg-primary text-white shadow-xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Vista Previa
                                    </button>
                                  </div>

                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline px-3">
                                    {quizViewMode === 'editor' ? 'Modo Edición' : 'Modo Vista Alumno'}
                                  </span>
                                </div>

                                {quizViewMode === 'editor' ? (
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
                                                        updatedFields.instructions = qItem.instructions || '';
                                                        updatedFields.guidelineAnswer = qItem.guidelineAnswer || '';
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
                                                  <span className="text-sm">📝</span>
                                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">Instrucciones de la Pregunta (Texto de Fondo)</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium">Estas instrucciones aparecerán como texto de fondo (placeholder) en el área de redacción del alumno. Si se deja en blanco, saldrá el texto por defecto.</p>
                                                
                                                <textarea
                                                  value={qItem.instructions || ''}
                                                  onChange={(e) => handleUpdateQuizQuestion(qIdx, { instructions: e.target.value })}
                                                  rows={3}
                                                  placeholder="Escribe aquí las instrucciones de redacción o preguntas guía para el alumno..."
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

                                            {/* EXTRA SETTINGS (COMMON TO ALL TYPES) */}
                                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                                              <div className="flex items-center justify-between">
                                                <div>
                                                  <h5 className="text-[10px] font-black uppercase tracking-widest text-primary/60">No Modificable</h5>
                                                  <p className="text-[9px] text-slate-500 font-medium mt-0.5">Bloquear respuestas después de enviar el formulario para que el alumno no pueda alterarlas.</p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                  <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={qItem.isLocked || false}
                                                    onChange={(e) => handleUpdateQuizQuestion(qIdx, { isLocked: e.target.checked })}
                                                  />
                                                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                                                </label>
                                              </div>
                                              
                                              <div className="pt-3 border-t border-slate-200 space-y-4">
                                                {/* Reflexión (Opcional) */}
                                                <div>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-primary/60">
                                                      Reflexión / Pauta de Autoevaluación (Opcional)
                                                    </label>
                                                    <span className="text-[9px] text-slate-400 font-medium italic">Se muestra al alumno tras responder</span>
                                                  </div>
                                                  <p className="text-[9px] text-slate-500 font-medium mb-2">
                                                    Modelo de reflexión o respuesta ideal para que el alumno compare su respuesta.
                                                  </p>
                                                  <textarea
                                                    value={qItem.guidelineAnswer || ''}
                                                    onChange={(e) => handleUpdateQuizQuestion(qIdx, { guidelineAnswer: e.target.value })}
                                                    rows={3}
                                                    placeholder="Ej: Las tres virtudes teologales de acuerdo a 1 Corintios 13 son la Fe, la Esperanza y el Amor..."
                                                    className="w-full bg-white px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-xs text-slate-600 leading-relaxed font-medium"
                                                  />
                                                </div>

                                                {/* Explicación Adicional (Opcional) */}
                                                <div>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[9px] font-black uppercase tracking-widest text-primary/60">
                                                      Explicación Adicional (Opcional)
                                                    </label>
                                                    <span className="text-[9px] text-slate-400 font-medium italic">Debajo de la pregunta</span>
                                                  </div>
                                                  <p className="text-[9px] text-slate-500 font-medium mb-2">
                                                    Aclaración o nota contextual complementaria.
                                                  </p>
                                                  <textarea
                                                    value={qItem.explanation || ''}
                                                    onChange={(e) => handleUpdateQuizQuestion(qIdx, { explanation: e.target.value })}
                                                    rows={2}
                                                    placeholder="Explicación que aparecerá debajo de la pregunta (opcional)..."
                                                    className="w-full bg-white px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-xs text-slate-600 leading-relaxed font-medium"
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                          </div>
                                        );
                                      })}

                                      {(activeStep.questions || []).length === 0 && (
                                        <div className="py-8 text-center text-primary/30 text-xs italic">
                                          Este cuestiorio está vacío. Añade una pregunta para comenzar a armar el test.
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
                                      <button
                                        type="button"
                                        onClick={handleSimulateSave}
                                        className="bg-primary text-white hover:bg-secondary hover:text-primary px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                                      >
                                        <Save className="w-4 h-4" />
                                        Guardar cambios
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* VISTA PREVIA DEL CUESTIONARIO (MODO ESTUDIANTE) */
                                  <div className="space-y-6 bg-slate-50/50 p-6 md:p-8 rounded-[2.5rem] border border-slate-200/80">
                                    <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                                      <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                                          Vista Previa Interactiva
                                        </span>
                                        <h4 className="text-xl font-bold text-primary font-kenao">
                                          {activeStep.title}
                                        </h4>
                                      </div>
                                      <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-xl border border-primary/20 flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5 text-primary" />
                                        Simulación Estudiante
                                      </span>
                                    </div>

                                    {(activeStep.questions || []).length === 0 ? (
                                      <div className="py-12 text-center text-slate-400 text-sm italic">
                                        No hay preguntas configuradas para este cuestionario todavía. Haz clic en la pestaña "Editor" para agregar la primera.
                                      </div>
                                    ) : (
                                      <div className="space-y-8">
                                        {(activeStep.questions || []).map((qItem, qIdx) => {
                                          const qType = qItem.type || 'single';
                                          const studentAns = quizPreviewAnswers[qIdx];
                                          const isShowGuideline = showGuidelineForQuestion[qIdx];

                                          return (
                                            <div key={qIdx} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                                              <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                  <span className="flex-shrink-0 w-7 h-7 bg-primary text-white font-bold text-xs rounded-full flex items-center justify-center mt-0.5">
                                                    {qIdx + 1}
                                                  </span>
                                                  <div>
                                                    <h5 className="font-bold text-primary text-base leading-snug">
                                                      {qItem.question || 'Pregunta sin enunciado'}
                                                    </h5>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 block">
                                                      {qType === 'single' && 'Selección Única'}
                                                      {qType === 'multiple' && 'Selección Múltiple'}
                                                      {qType === 'text' && 'Desarrollo Escrito / Respuesta Libre'}
                                                      {qType === 'pairs' && 'Relacionar Conceptos'}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* SINGLE CHOICE PREVIEW */}
                                              {qType === 'single' && (
                                                <div className="space-y-2.5 pt-2">
                                                  {(qItem.options || []).map((opt, oIdx) => {
                                                    const isSelected = studentAns === oIdx;
                                                    const isCorrect = qItem.correctAnswer === oIdx;
                                                    let optStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";
                                                    
                                                    if (quizPreviewSubmitted) {
                                                      if (isCorrect) {
                                                        optStyle = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                                                      } else if (isSelected && !isCorrect) {
                                                        optStyle = "bg-red-50 border-red-300 text-red-900";
                                                      }
                                                    } else if (isSelected) {
                                                      optStyle = "bg-secondary/15 border-secondary text-primary font-bold shadow-xs";
                                                    }

                                                    return (
                                                      <label
                                                        key={oIdx}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer text-xs ${optStyle}`}
                                                      >
                                                        <input
                                                          type="radio"
                                                          name={`preview-q-${qIdx}`}
                                                          checked={isSelected}
                                                          onChange={() => {
                                                            setQuizPreviewAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
                                                          }}
                                                          className="w-4 h-4 text-secondary focus:ring-secondary cursor-pointer"
                                                        />
                                                        <span className="flex-grow">{opt}</span>
                                                        {quizPreviewSubmitted && isCorrect && (
                                                          <span className="text-emerald-600 font-bold text-[10px] uppercase bg-emerald-100 px-2 py-0.5 rounded-md">Correcta</span>
                                                        )}
                                                      </label>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {/* MULTIPLE CHOICE PREVIEW */}
                                              {qType === 'multiple' && (
                                                <div className="space-y-2.5 pt-2">
                                                  {(qItem.options || []).map((opt, oIdx) => {
                                                    const selectedArr = Array.isArray(studentAns) ? studentAns : [];
                                                    const isSelected = selectedArr.includes(oIdx);
                                                    const isCorrect = (qItem.correctAnswers || []).includes(oIdx);
                                                    let optStyle = "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100";

                                                    if (quizPreviewSubmitted) {
                                                      if (isCorrect) {
                                                        optStyle = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                                                      } else if (isSelected && !isCorrect) {
                                                        optStyle = "bg-red-50 border-red-300 text-red-900";
                                                      }
                                                    } else if (isSelected) {
                                                      optStyle = "bg-secondary/15 border-secondary text-primary font-bold shadow-xs";
                                                    }

                                                    return (
                                                      <label
                                                        key={oIdx}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer text-xs ${optStyle}`}
                                                      >
                                                        <input
                                                          type="checkbox"
                                                          checked={isSelected}
                                                          onChange={() => {
                                                            const current = Array.isArray(studentAns) ? [...studentAns] : [];
                                                            const updated = isSelected ? current.filter(i => i !== oIdx) : [...current, oIdx];
                                                            setQuizPreviewAnswers(prev => ({ ...prev, [qIdx]: updated }));
                                                          }}
                                                          className="w-4 h-4 rounded text-secondary focus:ring-secondary cursor-pointer"
                                                        />
                                                        <span className="flex-grow">{opt}</span>
                                                        {quizPreviewSubmitted && isCorrect && (
                                                          <span className="text-emerald-600 font-bold text-[10px] uppercase bg-emerald-100 px-2 py-0.5 rounded-md">Correcta</span>
                                                        )}
                                                      </label>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                              {/* TEXT PREVIEW */}
                                              {qType === 'text' && (
                                                <div className="space-y-3 pt-2">
                                                  <textarea
                                                    rows={4}
                                                    value={studentAns || ''}
                                                    onChange={(e) => setQuizPreviewAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                                                    placeholder="El estudiante redactará aquí su respuesta..."
                                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-secondary"
                                                  />
                                                  <div className="flex items-center justify-between">
                                                    <button
                                                      type="button"
                                                      onClick={() => setShowGuidelineForQuestion(prev => ({ ...prev, [qIdx]: !prev[qIdx] }))}
                                                      className="text-xs font-bold text-secondary hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                      💡 {isShowGuideline ? 'Ocultar Pauta / Respuesta Modelo' : 'Ver Pauta de Evaluación Modelo'}
                                                    </button>
                                                  </div>
                                                  {isShowGuideline && (
                                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed font-medium">
                                                      <span className="font-bold block mb-1">Pauta / Respuesta de orientación:</span>
                                                      {qItem.guidelineAnswer || 'No hay pauta especificada para esta pregunta.'}
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              {/* PAIRS PREVIEW */}
                                              {qType === 'pairs' && (
                                                <div className="space-y-3 pt-2">
                                                  <p className="text-xs text-slate-500 font-medium italic">Relaciona cada concepto de la izquierda con su opción correspondiente:</p>
                                                  {(qItem.pairs || []).map((pair, pIdx) => {
                                                    const pairAnsMap = studentAns || {};
                                                    const selectedRight = pairAnsMap[pIdx];
                                                    const isMatchCorrect = selectedRight === pair.right;

                                                    return (
                                                      <div 
                                                        key={pIdx} 
                                                        className={`flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl text-xs border transition-all ${
                                                          quizPreviewSubmitted && isMatchCorrect ? 'bg-emerald-50 border-emerald-300' :
                                                          quizPreviewSubmitted ? 'bg-red-50 border-red-300' :
                                                          'bg-slate-50 border-slate-200'
                                                        }`}
                                                      >
                                                        <span className="font-bold text-primary sm:w-1/3">{pair.left}</span>
                                                        <span className="text-slate-400 font-bold shrink-0">
                                                          {quizPreviewSubmitted ? (isMatchCorrect ? '✅' : '❌') : '↔'}
                                                        </span>
                                                        <select
                                                          disabled={quizPreviewSubmitted}
                                                          value={selectedRight || ''}
                                                          onChange={(e) => {
                                                            const currentMap = studentAns || {};
                                                            setQuizPreviewAnswers(prev => ({
                                                              ...prev,
                                                              [qIdx]: { ...currentMap, [pIdx]: e.target.value }
                                                            }));
                                                          }}
                                                          className="sm:w-1/2 bg-white p-2.5 rounded-xl border border-slate-200 outline-none text-xs font-semibold text-slate-700 disabled:opacity-80 cursor-pointer"
                                                        >
                                                          <option value="">Seleccionar respuesta...</option>
                                                          {(qItem.pairs || []).map((pRight, rIdx) => (
                                                            <option key={rIdx} value={pRight.right}>
                                                              {pRight.right}
                                                            </option>
                                                          ))}
                                                        </select>

                                                        {quizPreviewSubmitted && (
                                                          <div className="shrink-0 text-[10px] font-bold">
                                                            {isMatchCorrect ? (
                                                              <span className="text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md uppercase tracking-wider block">¡Correcto!</span>
                                                            ) : (
                                                              <span className="text-red-700 bg-red-100/80 px-2.5 py-1 rounded-md block">
                                                                Debió ser: <strong className="font-extrabold">{pair.right}</strong>
                                                              </span>
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}

                                            </div>
                                          );
                                        })}

                                        {/* SUBMIT SIMULATION BAR */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 bg-white p-6 rounded-3xl">
                                          <div className="text-xs text-slate-500">
                                            {quizPreviewSubmitted ? (
                                              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                Simulación realizada. Revisa las respuestas arriba.
                                              </span>
                                            ) : (
                                              <span>Prueba cómo el estudiante interactuará con este test en tiempo real.</span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {quizPreviewSubmitted && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setQuizPreviewSubmitted(false);
                                                  setQuizPreviewAnswers({});
                                                }}
                                                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                              >
                                                Reiniciar Simulación
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => setQuizPreviewSubmitted(true)}
                                              className="px-6 py-2.5 bg-primary text-white hover:bg-secondary hover:text-primary rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2"
                                            >
                                              <CheckCircle className="w-4 h-4" />
                                              Comprobar Respuestas
                                            </button>
                                            <button
                                              type="button"
                                              onClick={handleSimulateSave}
                                              className="px-6 py-2.5 bg-secondary text-primary hover:bg-primary hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2"
                                            >
                                              <Save className="w-4 h-4" />
                                              Guardar Cambios
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        ) : null}

                      </div>
                    </motion.div>
                  )}

                  {workspaceTab === 'participantes' && (
                    /* ==================================================
                       TAB 2B. PARTICIPANT WORKSPACE (Simple List)
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
                          Listado general
                        </span>
                        <h2 className="text-3xl font-kenao text-primary font-normal leading-tight">Participantes del Curso</h2>
                      </div>

                      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm max-w-4xl">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500">
                                <th className="p-4 font-black">Participante</th>
                                <th className="p-4 font-black">Curso</th>
                                <th className="p-4 font-black">Estado</th>
                                <th className="p-4 font-black">Fecha de Inicio</th>
                                <th className="p-4 font-black">Fecha de Finalización</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {enrollments.filter(e => activeWorkspaceCourse && isParticipantOfCourse(e, activeWorkspaceCourse)).length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">No hay alumnos inscritos.</td>
                                </tr>
                              ) : (
                                enrollments.filter(e => activeWorkspaceCourse && isParticipantOfCourse(e, activeWorkspaceCourse)).map((enrollment) => (
                                  <tr key={enrollment.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 text-sm font-bold text-primary flex items-center gap-2">
                                      <Users className="w-4 h-4 text-slate-400" />
                                      {enrollment.studentName}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-medium">
                                      {enrollment.courseTitle || activeWorkspaceCourse?.title}
                                    </td>
                                    <td className="p-4">
                                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md inline-block ${
                                        enrollment.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                        enrollment.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                                        enrollment.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {enrollment.status === 'pending' ? 'Pendiente Aprobación' : enrollment.status === 'active' ? 'Cursando' : enrollment.status === 'completed' ? 'Completado' : 'Baja'}
                                      </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-medium">
                                      {enrollment.enrolledAt ? new Date(enrollment.enrolledAt.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 font-medium">
                                      {enrollment.completedAt ? new Date(enrollment.completedAt.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {workspaceTab === 'academia' && (
                    /* ==================================================
                       TAB 2C. ACADEMIA WORKSPACE (Cards & Mentors)
                       ================================================== */
                    <motion.div
                      key="tab-academia"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-8 space-y-6"
                    >
                      <div className="border-b border-slate-100 pb-5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                          Acompañamiento y Mentoría
                        </span>
                        <h2 className="text-3xl font-kenao text-primary font-normal leading-tight">Academia</h2>
                      </div>

                      <div className="space-y-4 max-w-4xl">
                        {enrollments.filter(e => activeWorkspaceCourse && isParticipantOfCourse(e, activeWorkspaceCourse)).length === 0 ? (
                          <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <Users className="w-12 h-12 text-primary/10 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-primary mb-1">No hay alumnos inscritos</h3>
                            <p className="text-xs text-primary/40">Los alumnos que soliciten inscribirse en el catálogo público aparecerán aquí.</p>
                          </div>
                        ) : (
                          enrollments.filter(e => activeWorkspaceCourse && isParticipantOfCourse(e, activeWorkspaceCourse)).map((enrollment) => {
                            const isPending = enrollment.status === 'pending';
                            const isActive = enrollment.status === 'active';
                            const isCompleted = enrollment.status === 'completed';

                            return (
                              <div key={enrollment.id} className="bg-white border border-slate-150 rounded-3xl flex flex-col shadow-xs overflow-hidden text-left">
                                <div className="p-6 flex flex-col lg:flex-row justify-between gap-6">
                                  <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 ${
                                        isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        isPending ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                        isCompleted ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                        'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}>
                                        {isPending ? 'Pendiente' : isActive ? 'Activo' : isCompleted ? 'Completado' : 'Dado de baja'}
                                      </span>
                                    </div>
                                    <h3 className="font-bold text-primary text-xl flex items-center gap-2">
                                      <Users className="w-5 h-5 text-secondary shrink-0" />
                                      {enrollment.studentName}
                                    </h3>
                                      
                                    {/* Enrollment info timeline */}
                                    <div className="mt-1 text-xs text-slate-500 font-medium flex flex-wrap gap-4">
                                      <span>Inscrito el: {enrollment.enrolledAt ? new Date(enrollment.enrolledAt.seconds * 1000).toLocaleDateString() : 'Desconocido'}</span>
                                      <span className="font-bold text-primary/70">Progreso: {enrollment.progress || 0}%</span>
                                      {isCompleted && enrollment.grade !== undefined && (
                                        <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                          <Award className="w-3.5 h-3.5" /> Nota Final: {enrollment.grade}/10
                                        </span>
                                      )}
                                    </div>
                                    
                                    {enrollment.teacherComments && (
                                      <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-1.5"><MessageCircle className="w-3.5 h-3.5" /> Comentarios del Acompañante</p>
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{enrollment.teacherComments}</p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col gap-3 shrink-0">
                                    {isPending && (
                                      <button
                                        onClick={() => handleEnrollmentStatusChange(enrollment.id, 'active')}
                                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                      >
                                        <CheckCircle className="w-4 h-4" /> Aprobar alumno
                                      </button>
                                    )}

                                    {!isPending && !isActive && (
                                      <button
                                        onClick={() => handleEnrollmentStatusChange(enrollment.id, 'active')}
                                        className="bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        Re-activar alumno
                                      </button>
                                    )}
                                    
                                    <button
                                      onClick={() => handleDeleteEnrollment(enrollment.id)}
                                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer w-fit self-end"
                                      title="Eliminar Expediente"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                
                                {/* Acompañante (if not cell course) */}
                                {!activeWorkspaceCourse?.requiresCellSupervision && (
                                  <div className="bg-slate-50/80 p-4 border-t border-slate-150 flex flex-col sm:flex-row sm:items-center gap-4">
                                    <div className="flex flex-col gap-1.5 flex-grow">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Seleccionar Acompañante Docente:
                                      </label>
                                      <div className="flex flex-col sm:flex-row items-center gap-2">
                                        <select
                                          value={selectedTeachers[enrollment.id] !== undefined ? selectedTeachers[enrollment.id] : (enrollment.accompanyingTeacherId || '')}
                                          onChange={(e) => setSelectedTeachers(prev => ({ ...prev, [enrollment.id]: e.target.value }))}
                                          className="bg-white border border-slate-200 text-primary text-xs font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-secondary/50 w-full sm:w-72 cursor-pointer shadow-sm"
                                        >
                                          <option value="">-- Sin asignar (Pendiente) --</option>
                                          {potentialTeachers.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                          ))}
                                        </select>
                                        {(selectedTeachers[enrollment.id] !== undefined && selectedTeachers[enrollment.id] !== (enrollment.accompanyingTeacherId || '')) && (
                                          <button
                                            onClick={() => handleAssignTeacher(enrollment.id, selectedTeachers[enrollment.id])}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                                          >
                                            <Check className="w-3.5 h-3.5 shrink-0" /> Guardar asignación
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
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

                        {/* Requisito de Supervisión por Célula / Líder */}
                        <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl space-y-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <label className="block text-sm font-bold text-primary">
                                Supervisión por Líder
                              </label>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Requisito de estar vinculado a una Célula para inscribirse y aprobación del líder.
                              </p>
                            </div>
                            <select
                              value={ajustesFormData.requiresCellSupervision ? 'yes' : 'no'}
                              onChange={(e) => setAjustesFormData({ ...ajustesFormData, requiresCellSupervision: e.target.value === 'yes' })}
                              className="px-4 py-2.5 rounded-xl border border-amber-300 bg-white text-xs font-bold uppercase text-primary cursor-pointer focus:ring-2 focus:ring-amber-400"
                            >
                              <option value="no">No</option>
                              <option value="yes">Sí</option>
                            </select>
                          </div>

                        </div>

                        {ajustesFormData.durationMode === 'limited' && (
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Días habilitados límites</label>
                            <input 
                              type="number" 
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
                                className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm"
                                value={ajustesFormData.startDate}
                                onChange={(e) => setAjustesFormData({...ajustesFormData, startDate: e.target.value})}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Fecha Fin</label>
                              <input 
                                type="date" 
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
                              <img src={getDriveImageUrl(ajustesFormData.imageUrl) || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'} alt="" className="w-full h-full object-cover" />
                            </div>
                            <input 
                              type="text" 
                              placeholder="https://girasoles.jpg..."
                              className="w-full px-4 py-3 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-secondary text-sm flex-grow"
                              value={ajustesFormData.imageUrl}
                              onChange={(e) => setAjustesFormData({...ajustesFormData, imageUrl: e.target.value})}
                            />
                          </div>
                        </div>

                        {/* Diploma PDF Config */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150">
                          <label className="block text-xs font-black text-primary/40 uppercase tracking-widest mb-3">Enlace al Diploma (PDF)</label>
                          <p className="text-xs text-slate-500 mb-4">Si este curso entrega un diploma de finalización, puedes pegar aquí el enlace público del archivo PDF. Se mostrará a los alumnos al terminar el curso.</p>
                          <div className="relative">
                            <input 
                              type="url"
                              placeholder="Ej. https://drive.google.com/..."
                              value={ajustesFormData.diplomaPdfUrl}
                              onChange={(e) => setAjustesFormData({...ajustesFormData, diplomaPdfUrl: e.target.value})}
                              className="w-full bg-white pl-4 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-sm font-medium text-primary shadow-sm"
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

                {/* Requisito de Supervisión por Célula */}
                <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-primary">
                        Supervisión por Líder
                      </label>
                      <p className="text-[11px] text-slate-500">
                        ¿Requiere estar en célula y aprobación del líder?
                      </p>
                    </div>
                    <select
                      value={newCourseFormData.requiresCellSupervision ? 'yes' : 'no'}
                      onChange={(e) => setNewCourseFormData({ ...newCourseFormData, requiresCellSupervision: e.target.value === 'yes' })}
                      className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold uppercase text-primary cursor-pointer focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="no">No</option>
                      <option value="yes">Sí</option>
                    </select>
                  </div>
                  {newCourseFormData.requiresCellSupervision && (
                    <p className="text-[10px] text-amber-900 bg-amber-100/80 p-2.5 rounded-xl leading-relaxed font-medium">
                      🧩 <strong>Requisito activo:</strong> El alumno debe estar vinculado a una Célula. El Líder de Célula deberá aprobar el inicio y podrá desbloquear clases requeridas desde el Portal de Líderes.
                    </p>
                  )}
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

      {/* Floating Save Success Toast */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[200] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3.5 font-bold text-xs border border-emerald-400/30"
          >
            <CheckCircle className="w-6 h-6 text-emerald-200 shrink-0" />
            <div>
              <p className="font-bold text-sm text-white">¡Cambios guardados con éxito!</p>
              <p className="text-[11px] text-emerald-100 font-normal">Toda la teoría y los cuestionarios han sido guardados correctamente en la nube.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
