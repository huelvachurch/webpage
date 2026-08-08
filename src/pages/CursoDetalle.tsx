import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, BookOpen, Clock, Calendar, CheckCircle, ChevronRight, Lock, 
  Menu, Download, Award, AlertCircle, HelpCircle, GraduationCap, ArrowRight,
  RefreshCw, Check, FileText
} from 'lucide-react';
import { 
  doc, onSnapshot, collection, query, orderBy, where, updateDoc, 
  serverTimestamp, addDoc, getDocs 
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { TheoryMarkdown } from '../components/TheoryMarkdown';

interface Course {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  modality: 'self-paced' | 'scheduled';
  durationMode: 'unlimited' | 'limited' | 'flexible' | 'fixed';
  timeLimitDays?: number;
  startDate?: any;
  endDate?: any;
  imageUrl: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  progress: number;
  grade?: number;
  completedSteps?: string[];
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
    options: string[];
    correctAnswer: number;
    type?: 'single' | 'multiple' | 'text' | 'pairs';
    correctAnswers?: number[];
    guidelineAnswer?: string;
    pairs?: { left: string; right: string }[];
  }[];
}

export default function CursoDetalle() {
  const { id } = useParams<{ id: string }>();
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [steps, setSteps] = useState<Record<string, StepItem[]>>({});
  
  // Player navigation state
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  
  // Mobile sidebar toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Take test state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (isAuthReady && !loading && !user) {
      navigate('/login');
    }
  }, [user, loading, isAuthReady, navigate]);

  // Read Course details
  useEffect(() => {
    if (id) {
      const courseRef = doc(db, 'courses', id);
      const unsubscribe = onSnapshot(courseRef, (snapshot) => {
        if (snapshot.exists()) {
          setCourse({ id: snapshot.id, ...snapshot.data() } as Course);
        } else {
          console.error("Course not found");
          navigate('/mis-cursos');
        }
      }, (error) => {
        console.error("Error fetching course", error);
      });
      return () => unsubscribe();
    }
  }, [id, navigate]);

  // Read Enrollment details
  useEffect(() => {
    if (id && user) {
      const q = query(
        collection(db, 'enrollments'),
        where('courseId', '==', id),
        where('studentId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const snapshotDoc = snapshot.docs[0];
          const data = snapshotDoc.data();
          setEnrollment({
            id: snapshotDoc.id,
            completedSteps: data.completedSteps || [],
            ...data
          } as Enrollment);
        } else {
          // If no active enrollment exists in DB, check if user has admin/profesor privileges
          const isAdminOrProf = roles?.includes('admin') || roles?.includes('profesor') || roles?.includes('superadmin');
          if (isAdminOrProf) {
            setEnrollment({
              id: 'admin-preview-enrollment',
              courseId: id,
              studentId: user.uid,
              status: 'active',
              progress: 100,
              completedSteps: [],
              enrolledAt: { seconds: Math.floor(Date.now() / 1000) }
            } as Enrollment);
          } else {
            // If normal user without enrollment, redirect back to course landing catalog
            navigate('/cursos');
          }
        }
        setIsLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [id, user, roles, navigate]);

  // Read Syllabus structure (classes & steps)
  useEffect(() => {
    if (isAuthReady && user && id) {
      const classesRef = collection(db, 'courses', id, 'classes');
      const classesQuery = query(classesRef, orderBy('order', 'asc'));

      const stepUnsubscribes: (() => void)[] = [];

      const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
        // Clean up previous step unsubscribes first
        stepUnsubscribes.forEach(unsub => unsub());
        stepUnsubscribes.length = 0;

        const classesData = snapshot.docs.map(classDoc => ({
          id: classDoc.id,
          ...classDoc.data()
        })) as ClassItem[];
        setClasses(classesData);

        // Preselect active class if none chosen yet and user has active selection
        if (classesData.length > 0 && !activeClassId) {
          setActiveClassId(classesData[0].id);
        }

        // Subscribe to steps of each class
        snapshot.docs.forEach((classDoc) => {
          const stepsRef = collection(db, 'courses', id, 'classes', classDoc.id, 'steps');
          const stepsQuery = query(stepsRef, orderBy('order', 'asc'));

          const unsubSteps = onSnapshot(stepsQuery, (stepsSnapshot) => {
            const stepsData = stepsSnapshot.docs.map(sDoc => ({
              id: sDoc.id,
              ...sDoc.data()
            })) as StepItem[];

            setSteps(prev => ({
              ...prev,
              [classDoc.id]: stepsData
            }));

            // Preselect first step if first class is requested but no step selected
            if (classDoc.id === classesData[0]?.id && stepsData.length > 0 && !activeStepId) {
              setActiveStepId(stepsData[0].id);
            }
          }, (err) => {
            console.error(`Error loading steps for class ${classDoc.id}`, err);
          });

          stepUnsubscribes.push(unsubSteps);
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, `courses/${id}/classes`);
      });

      return () => {
        unsubscribeClasses();
        stepUnsubscribes.forEach(unsub => unsub());
      };
    }
  }, [id, isAuthReady, user, activeClassId, activeStepId]);

  // Reset Quiz State on step changes
  useEffect(() => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizPassed(false);
    setQuizScore(0);
  }, [activeStepId]);

  if (loading || isLoading || !course || !enrollment) {
    return (
      <div className="pt-36 text-center text-primary/40 font-semibold flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin mb-4 text-secondary" />
        Preparando aula virtual...
      </div>
    );
  }

  // Handle pending enrollment status for non-admin/non-teacher users
  if (enrollment.status === 'pending' && !(roles?.includes('admin') || roles?.includes('profesor') || roles?.includes('superadmin'))) {
    return (
      <div className="pt-36 pb-24 bg-slate-50 min-h-screen flex items-center justify-center px-4">
        <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-amber-200 shadow-sm max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">Solicitud Pendiente de Aprobación</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Tu solicitud para acceder a <strong className="text-primary">{course.title}</strong> se ha registrado correctamente y está pendiente de ser aprobada por el profesor o administración del curso.
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/mis-cursos')}
              className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-secondary hover:text-primary transition-all cursor-pointer shadow-md"
            >
              Ir a Mis Cursos
            </button>
            <button
              onClick={() => navigate('/cursos')}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              Catálogo de Cursos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verification if class is locked (Dependencies)
  const isClassLocked = (clase: ClassItem, index: number) => {
    // 1. Unlimited timeframe dependents
    if (course.modality === 'self-paced' && course.durationMode === 'unlimited') {
      if (index === 0) return false;
      if (!clase.requiresPrevious) return false;

      // Check if previous class has any incomplete steps
      const prevClass = classes[index - 1];
      if (!prevClass) return false;

      const prevClassSteps = steps[prevClass.id] || [];
      if (prevClassSteps.length === 0) return false;

      const completed = enrollment.completedSteps || [];
      // Every step of preceding class must be inside completed list
      return !prevClassSteps.every(step => completed.includes(step.id));
    }

    // 2. Scheduled or limited timeframe day checks
    if (course.durationMode === 'limited' || course.modality === 'scheduled') {
      if (!enrollment.enrolledAt) return false;
      const enrolledTimestamp = enrollment.enrolledAt.seconds * 1000;
      const daysElapsed = Math.max(1, Math.floor((Date.now() - enrolledTimestamp) / (1000 * 60 * 60 * 24)) + 1);
      
      return daysElapsed < (clase.dayNumber || 1);
    }

    return false;
  };

  // Days remaining for class unlock
  const getDaysRemainingForUnlock = (clase: ClassItem) => {
    if (!enrollment.enrolledAt) return 0;
    const enrolledTimestamp = enrollment.enrolledAt.seconds * 1000;
    const daysElapsed = Math.floor((Date.now() - enrolledTimestamp) / (1000 * 60 * 60 * 24)) + 1;
    return (clase.dayNumber || 1) - daysElapsed;
  };

  // active details references
  const activeClass = classes.find(c => c.id === activeClassId);
  const activeStep = activeClassId && activeStepId && steps[activeClassId]
    ? steps[activeClassId].find(s => s.id === activeStepId)
    : null;

  // Total steps in course count
  const allCourseStepsList = Object.values(steps).flat();
  const totalStepsCount = allCourseStepsList.length;

  // Complete a Step
  const handleCompleteStep = async () => {
    if (!enrollment || !activeStepId) return;

    const completed = enrollment.completedSteps || [];
    if (completed.includes(activeStepId)) {
      // Step already completed: just move to next step automatically
      navigateNextStep();
      return;
    }

    const updatedCompleted = [...completed, activeStepId];
    
    // Recalculate progress percentage
    const nextProgress = totalStepsCount > 0 
      ? Math.round((updatedCompleted.length / totalStepsCount) * 100) 
      : 100;

    try {
      await updateDoc(doc(db, 'enrollments', enrollment.id), {
        completedSteps: updatedCompleted,
        progress: nextProgress,
        updatedAt: serverTimestamp()
      });

      // Move forward automatically!
      navigateNextStep();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enrollments/${enrollment.id}`);
    }
  };

  // Navigate to next logical step
  const navigateNextStep = () => {
    if (!activeClassId || !activeStepId) return;
    const classSteps = steps[activeClassId] || [];
    const stepIdx = classSteps.findIndex(s => s.id === activeStepId);

    // If there is another step in original class, choose it
    if (stepIdx < classSteps.length - 1) {
      setActiveStepId(classSteps[stepIdx + 1].id);
      return;
    }

    // Otherwise, find next unlocked class
    const classIdx = classes.findIndex(c => c.id === activeClassId);
    if (classIdx < classes.length - 1) {
      const nextClass = classes[classIdx + 1];
      const nextClassIndex = classIdx + 1;
      
      if (!isClassLocked(nextClass, nextClassIndex)) {
        setActiveClassId(nextClass.id);
        const nextClassSteps = steps[nextClass.id] || [];
        if (nextClassSteps.length > 0) {
          setActiveStepId(nextClassSteps[0].id);
        } else {
          setActiveStepId(null);
        }
      } else {
        alert("¡Has terminado este módulo! El siguiente módulo se encuentra bloqueado hasta que completes los requisitos de tiempo o de materias previas.");
      }
    }
  };

  // Evaluate if the student has completed answering every question
  const isQuizIncomplete = () => {
    if (!activeStep || !activeStep.questions) return true;
    return activeStep.questions.some((q, idx) => {
      const ans = quizAnswers[idx];
      const qType = q.type || 'single';
      if (qType === 'single') {
        return ans === undefined;
      }
      if (qType === 'multiple') {
        return !Array.isArray(ans) || ans.length === 0;
      }
      if (qType === 'text') {
        return !ans || typeof ans !== 'string' || ans.trim().length === 0;
      }
      if (qType === 'pairs') {
        if (!ans) return true;
        const pairs = q.pairs || [];
        // Check if all left concepts have been paired with some value
        return pairs.some((p: any) => !ans[p.left]);
      }
      return true;
    });
  };

  // Submit test answers
  const handleSubmitQuiz = () => {
    if (!activeStep || activeStep.type !== 'quiz' || !activeStep.questions) return;
    
    const questions = activeStep.questions;
    let correctCount = 0;

    questions.forEach((q, idx) => {
      const qType = q.type || 'single';
      const ans = quizAnswers[idx];

      if (qType === 'single') {
        if (ans === q.correctAnswer) {
          correctCount++;
        }
      } else if (qType === 'multiple') {
        const correctAnswers = q.correctAnswers || [0];
        const studentAnswers = Array.isArray(ans) ? ans : [];
        const isSameLength = correctAnswers.length === studentAnswers.length;
        const allCorrect = correctAnswers.every((val: number) => studentAnswers.includes(val));
        const noExtraneous = studentAnswers.every((val: number) => correctAnswers.includes(val));
        if (isSameLength && allCorrect && noExtraneous) {
          correctCount++;
        }
      } else if (qType === 'text') {
        // Free text theological essays always count as completed / correct once submitted.
        if (typeof ans === 'string' && ans.trim().length > 0) {
          correctCount++;
        }
      } else if (qType === 'pairs') {
        const pairs = q.pairs || [];
        const studentMatches = ans || {};
        const allMatchedCorrectly = pairs.every((p: any) => studentMatches[p.left] === p.right);
        if (allMatchedCorrectly && pairs.length > 0) {
          correctCount++;
        }
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setQuizScore(score);
    setQuizSubmitted(true);

    if (correctCount === questions.length) {
      setQuizPassed(true);
    } else {
      setQuizPassed(false);
    }
  };

  return (
    <div className="pt-24 bg-slate-50 min-h-screen flex flex-col lg:flex-row">
      
      {/* 2B. MOBILE NAVIGATION TRIGGER CHIP */}
      <div className="lg:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/mis-cursos')}
          className="flex items-center gap-1.5 text-xs font-bold text-primary/60 hover:text-primary transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Mis Cursos
        </button>

        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 bg-primary/5 text-primary py-2 px-3.5 rounded-xl border border-primary/10 text-xs font-bold cursor-pointer"
        >
          <Menu className="w-4.5 h-4.5" />
          Temario del curso ({enrollment.progress}%)
        </button>
      </div>

      {/* =========================================================
         LEFT COLUMN SIDEBAR: ACADEMIC MODULES TREE ACCORDION
         ========================================================= */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            className="w-full lg:w-80 border-r border-slate-200/60 bg-white shrink-0 flex flex-col max-h-[calc(100vh-6rem)] overflow-y-auto"
          >
            {/* Header profile of course inside user sidebar */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/40">
              <Link
                to="/mis-cursos"
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-primary/40 hover:text-primary mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-primary/30" /> Volver a clases
              </Link>
              
              <h2 className="text-lg font-kenao text-primary leading-tight font-normal line-clamp-1 mb-2">
                {course.title}
              </h2>
              
              {/* Progress bar tracking layout */}
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[10px] font-black text-secondary uppercase tracking-widest">
                  <span>Academia progreso</span>
                  <span>{enrollment.progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${enrollment.progress}%` }}
                    className="h-full bg-secondary"
                  />
                </div>
              </div>
            </div>

            {/* Syllabus Navigation list */}
            <div className="p-4 space-y-3.5 flex-grow">
              {classes.map((clase, idx) => {
                const classSteps = steps[clase.id] || [];
                const isLocked = isClassLocked(clase, idx);
                const isSelectedClass = activeClassId === clase.id;

                return (
                  <div key={clase.id} className="space-y-1">
                    {/* Class header bar trigger */}
                    <div 
                      onClick={() => !isLocked && setActiveClassId(clase.id)}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isLocked ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed opacity-60' :
                        isSelectedClass ? 'bg-primary text-white border-primary border shadow-sm cursor-pointer' :
                        'bg-white border-slate-100/80 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-xs line-clamp-1">{clase.title}</p>
                          <span className="block text-[9px] font-semibold opacity-60 mt-0.5 uppercase tracking-widest">
                            {classSteps.length} pasos lectivos
                          </span>
                        </div>

                        {/* Locker badge indicators */}
                        {isLocked ? (
                          <div className="p-1.5 bg-slate-100/60 text-slate-400 rounded-lg">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          isSelectedClass && (
                            <span className="w-2.5 h-2.5 bg-secondary rounded-full animate-pulse" />
                          )
                        )}
                      </div>

                      {/* Display locked warning inline */}
                      {isLocked && (
                        <span className="block text-[8px] font-extrabold tracking-wider text-red-500 mt-2 bg-red-50 border border-red-100 p-1.5 rounded-md leading-relaxed text-center">
                          {course.modality === 'self-paced' && course.durationMode === 'unlimited' ? (
                            'Bloqueado: Completa clase previa'
                          ) : (
                            `Desbloquea en el Día ${clase.dayNumber} (Faltan ${getDaysRemainingForUnlock(clase)} días)`
                          )}
                        </span>
                      )}
                    </div>

                    {/* Collapse expansion of steps when class selected and unlocked */}
                    {!isLocked && isSelectedClass && (
                      <div className="pl-3 space-y-1 pt-1.5">
                        {classSteps.map((step) => {
                          const isDone = (enrollment.completedSteps || []).includes(step.id);
                          const isCurrentStep = activeStepId === step.id;

                          return (
                            <div
                              key={step.id}
                              onClick={() => {
                                setActiveClassId(clase.id);
                                setActiveStepId(step.id);
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                isCurrentStep ? 'bg-slate-100 text-primary border-l-2 border-secondary font-bold' :
                                'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span>{step.type === 'theory' ? '📝' : '❓'}</span>
                                <span className="truncate">{step.title}</span>
                              </div>

                              {isDone && (
                                <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0 fill-emerald-50/20" />
                              )}
                            </div>
                          );
                        })}

                        {classSteps.length === 0 && (
                          <span className="block text-[10px] text-primary/30 italic pl-6 py-2">
                            Syllabus vacío
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
         RIGHT COLUMN WORKSPACE: RICH STUDY SCREEN PLAYER
         ========================================================= */}
      <div className="flex-grow flex flex-col p-6 md:p-10 max-h-[calc(100vh-6rem)] overflow-y-auto">
        
        {!activeStep ? (
          /* Placeholder screens */
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center max-w-xl mx-auto">
            <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mb-6 shadow-xs">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-kenao text-primary mb-3">Tu Aula Virtual de Aprendizaje</h3>
            <p className="text-primary/60 text-sm leading-relaxed mb-6">
              Haz clic en cualquiera de las clases y sus contenidos en el temario de la izquierda para comenzar a estudiar, responder cuestionarios académicos e incrementar tus calificaciones.
            </p>
          </div>
        ) : (
          /* Main active learning panel */
          <div className="max-w-3xl mx-auto w-full space-y-8 pb-12 animate-fade-in">
            
            {/* Header indicators */}
            <div className="border-b border-slate-150 pb-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                {activeClass?.title} • Paso {activeStep.order + 1}
              </span>
              <h1 className="text-3xl md:text-4xl font-kenao text-primary font-normal leading-tight">
                {activeStep.title}
              </h1>
            </div>

            {/* COMPONENT CONDITIONAL CONTROLLER DEPENDING ON ACTIVE LEARN TYPE */}
            {activeStep.type === 'theory' ? (
              /* A. THE THEORY RENDER LAYOUT SHEET */
              <div className="space-y-8 leading-relaxed">
                <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed tracking-normal font-sans">
                  <TheoryMarkdown content={activeStep.content || ''} />
                </div>

                {/* Attachments downloads block if files exist */}
                {activeStep.attachments && activeStep.attachments.length > 0 && (
                  <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl">
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary/40 mb-3.5 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary/20" />
                      Archivos y material descargable adjunto
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeStep.attachments.map((file, fIdx) => (
                        <a
                          key={fIdx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3.5 bg-white border border-slate-150 rounded-xl hover:border-secondary transition-all hover:shadow-xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Download className="w-4 h-4 text-primary/35 group-hover:text-secondary shrink-0" />
                            <span className="text-xs font-bold text-primary truncate">{file.name}</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-primary/20 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm step read done action */}
                <div className="pt-8 border-t border-slate-150 flex justify-end">
                  <button
                    onClick={handleCompleteStep}
                    className="bg-primary text-white hover:bg-secondary hover:text-primary font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    {(enrollment.completedSteps || []).includes(activeStepId) ? (
                      <>Siguiente paso <ChevronRight className="w-4 h-4" /></>
                    ) : (
                      <>Completar y continuar <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* B. QUIZ QUESTION SHEETS TEST PATTERN */
              <div className="space-y-6">
                
                {/* Score notification panel if already test done */}
                {quizSubmitted && (
                  <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left ${
                    quizPassed ? 'bg-emerald-50 text-emerald-950 border-emerald-200' : 'bg-red-50 text-red-950 border-red-200'
                  }`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                      quizPassed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {quizPassed ? <Award className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    </div>

                    <div className="flex-grow">
                      <p className="font-bold text-lg mb-0.5">
                        {quizPassed ? '¡Prueba aprobada con éxito!' : 'Prueba suspendida o requiere autoevaluación.'}
                      </p>
                      <p className="text-xs opacity-80 leading-relaxed font-semibold">
                        {quizPassed 
                          ? 'Excelente desempeño, has obtenido el 100% de aciertos en esta evaluación.' 
                          : 'Se requiere resolver correctamente todas las preguntas para registrar el avance de clase.'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-black opacity-40 uppercase tracking-widest block">Evaluación</span>
                      <span className="text-3xl font-black">{quizScore}%</span>
                    </div>
                  </div>
                )}

                {/* Questions render */}
                <div className="space-y-8 pt-4">
                  {(activeStep.questions || []).map((qItem, qIdx) => {
                    const qType = qItem.type || 'single';
                    const isQuestionChecked = quizAnswers[qIdx] !== undefined;

                    // Compute correctness status for question item styling
                    let isCorrectNow = false;
                    if (quizSubmitted) {
                      if (qType === 'single') {
                        isCorrectNow = quizAnswers[qIdx] === qItem.correctAnswer;
                      } else if (qType === 'multiple') {
                        const correctAnswers = qItem.correctAnswers || [0];
                        const studentAnswers = quizAnswers[qIdx] || [];
                        isCorrectNow = correctAnswers.length === studentAnswers.length &&
                          correctAnswers.every((v: number) => studentAnswers.includes(v)) &&
                          studentAnswers.every((v: number) => correctAnswers.includes(v));
                      } else if (qType === 'text') {
                        isCorrectNow = true; // Theological self-evaluation is always counted correct/done once answered
                      } else if (qType === 'pairs') {
                        const pairs = qItem.pairs || [];
                        const studentMatches = quizAnswers[qIdx] || {};
                        isCorrectNow = pairs.every((p: any) => studentMatches[p.left] === p.right);
                      }
                    }

                    return (
                      <div key={qIdx} className={`p-6 md:p-8 rounded-[2.5rem] border transition-all ${
                        quizSubmitted && isCorrectNow ? 'bg-emerald-50/20 border-emerald-200' :
                        quizSubmitted && !isCorrectNow ? 'bg-red-50/20 border-red-200' :
                        'bg-white border-slate-150 shadow-xs'
                      }`}>
                        
                        {/* Question Badge and Header */}
                        <div className="flex items-start gap-3 mb-6">
                          <span className="text-xs font-black bg-slate-100 text-primary border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 mt-0.5">
                            {qIdx + 1}
                          </span>
                          <div className="space-y-1">
                            <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest text-[#008080]/90 bg-[#008080]/10 px-2 py-0.5 rounded-md">
                              {qType === 'single' && '🔘 Opción Única'}
                              {qType === 'multiple' && '☑️ Selección Múltiple'}
                              {qType === 'text' && '✍️ Libre Desarrollo'}
                              {qType === 'pairs' && '🧩 Emparejar Conceptos'}
                            </span>
                            <h4 className="font-bold text-primary text-base leading-relaxed">{qItem.question}</h4>
                          </div>
                        </div>

                        {/* Rendering corresponding controls per type */}

                        {/* SINGLE CHOICE */}
                        {qType === 'single' && (
                          <div className="space-y-3">
                            {(qItem.options || []).map((opt, oIdx) => {
                              const isSelected = quizAnswers[qIdx] === oIdx;
                              const isCorrectOption = quizSubmitted && qItem.correctAnswer === oIdx;
                              const isWrongOption = quizSubmitted && isSelected && qItem.correctAnswer !== oIdx;

                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-start gap-3.5 p-4 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                    isCorrectOption ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold' :
                                    isWrongOption ? 'bg-red-50 text-red-800 border-red-400 font-bold' :
                                    isSelected ? 'bg-secondary/15 text-primary border-primary/50 font-bold shadow-xs' :
                                    'bg-white border-slate-100 hover:bg-slate-50/60'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`options-${qIdx}-${activeStepId}`}
                                    disabled={quizSubmitted}
                                    checked={isSelected}
                                    onChange={() => setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                                    className="w-4.5 h-4.5 text-secondary border-slate-300 focus:ring-secondary mt-0.5 shrink-0"
                                  />
                                  <span className="leading-relaxed">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* MULTIPLE CHOICE / CHECKBOXES */}
                        {qType === 'multiple' && (
                          <div className="space-y-3">
                            {(qItem.options || []).map((opt, oIdx) => {
                              const selectedList = quizAnswers[qIdx] || [];
                              const isSelected = selectedList.includes(oIdx);
                              const isCorrectOption = quizSubmitted && (qItem.correctAnswers || []).includes(oIdx);
                              const isWrongOption = quizSubmitted && isSelected && !(qItem.correctAnswers || []).includes(oIdx);

                              return (
                                <label
                                  key={oIdx}
                                  className={`flex items-start gap-3.5 p-4 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                    isCorrectOption ? 'bg-emerald-50 text-emerald-800 border-emerald-400 font-bold' :
                                    isWrongOption ? 'bg-red-50 text-red-800 border-red-405 font-bold' :
                                    isSelected ? 'bg-secondary/15 text-primary border-primary/50 font-bold shadow-xs' :
                                    'bg-white border-slate-100 hover:bg-slate-50/60'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    disabled={quizSubmitted}
                                    checked={isSelected}
                                    onChange={() => {
                                      const nextList = isSelected 
                                        ? selectedList.filter((x: number) => x !== oIdx) 
                                        : [...selectedList, oIdx];
                                      setQuizAnswers(prev => ({ ...prev, [qIdx]: nextList }));
                                    }}
                                    className="w-4.5 h-4.5 rounded text-secondary border-slate-300 focus:ring-secondary mt-0.5 shrink-0"
                                  />
                                  <span className="leading-relaxed">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* FREE RESPONSE WRITING */}
                        {qType === 'text' && (
                          <div className="space-y-4">
                            {!quizSubmitted ? (
                              <textarea
                                value={quizAnswers[qIdx] || ''}
                                onChange={(e) => setQuizAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                                rows={5}
                                placeholder="Escribe aquí tu ensayo, respuesta o reflexión teológica detallada..."
                                className="w-full bg-slate-50/50 p-4.5 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-[#008080] text-xs leading-relaxed font-semibold text-slate-700 shadow-inner"
                              />
                            ) : (
                              <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/40 block mb-1">
                                    Tu Respuesta redactada:
                                  </span>
                                  <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                                    {quizAnswers[qIdx] || 'No se ingresó respuesta.'}
                                  </p>
                                </div>

                                <div className="bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-300/80 space-y-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">🗣️</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#008080]">
                                      Respuesta Teológica Ideal de Comparación
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                                    {qItem.guidelineAnswer || 'No hay autoevaluación cargada para esta pregunta.'}
                                  </p>
                                  <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest pt-2">
                                    💡 Autoevalúa tu ensayo en base al modelo teológico expuesto arriba.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* MATCHING PAIRS BOARD */}
                        {qType === 'pairs' && (
                          <div className="space-y-4">
                            <span className="block text-[10px] font-extrabold text-slate-500/80 uppercase tracking-widest mb-1">
                              {quizSubmitted ? 'Resultados del Acoplamiento:' : 'Relaciona cada concepto con su significado correspondiente:'}
                            </span>
                            
                            <div className="space-y-3">
                              {(qItem.pairs || []).map((pair: any, pIdx: number) => {
                                const leftVal = pair.left;
                                const studentMatch = quizAnswers[qIdx]?.[leftVal] || '';
                                const isMatchCorrect = studentMatch === pair.right;

                                // Extract right options and sort them alphabetically so they are consistently mixed up
                                const shuffledRightOptions = [...(qItem.pairs || [])].map((p: any) => p.right).sort();

                                return (
                                  <div key={pIdx} className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-2xl border ${
                                    quizSubmitted && isMatchCorrect ? 'bg-emerald-500/5 border-emerald-200' :
                                    quizSubmitted ? 'bg-red-500/5 border-red-200' :
                                    'bg-slate-50/50 border-slate-150'
                                  }`}>
                                    {/* Left concept fixed */}
                                    <div className="flex-1 bg-white px-4 py-2.5 rounded-xl border border-slate-100 text-xs font-bold text-[#008080]">
                                      {leftVal}
                                    </div>

                                    <div className="text-center self-center shrink-0 hidden sm:block">
                                      {quizSubmitted ? (
                                        isMatchCorrect ? '✅' : '❌'
                                      ) : '➡️'}
                                    </div>

                                    {/* Right definition select list */}
                                    <div className="flex-1">
                                      <select
                                        disabled={quizSubmitted}
                                        value={studentMatch}
                                        onChange={(e) => {
                                          const prevMatches = quizAnswers[qIdx] || {};
                                          setQuizAnswers(prev => ({
                                            ...prev,
                                            [qIdx]: { ...prevMatches, [leftVal]: e.target.value }
                                          }));
                                        }}
                                        className="w-full bg-white px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-1 focus:ring-secondary"
                                      >
                                        <option value="">-- Selecciona el significado --</option>
                                        {shuffledRightOptions.map((optRight: string, rIdx: number) => (
                                          <option key={rIdx} value={optRight}>
                                            {optRight}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Evaluation error feedback */}
                                    {quizSubmitted && !isMatchCorrect && (
                                      <div className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest self-center sm:ml-2">
                                        Debió ser: <span className="text-[#008080] lowercase hover:underline font-bold block sm:inline">{pair.right}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

                {/* Submitting CTAs block */}
                <div className="pt-8 border-t border-slate-150 flex items-center justify-between">
                  <div>
                    {!quizSubmitted && (
                      <span className="text-[10px] font-black text-[#008080] uppercase tracking-widest block bg-[#008080]/10 px-3 py-1.5 rounded-xl">
                        Estado: Listo para enviar cuando asocies todas las respuestas
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {quizSubmitted && !quizPassed && (
                      <button
                        onClick={() => {
                          setQuizAnswers({});
                          setQuizSubmitted(false);
                          setQuizPassed(false);
                        }}
                        className="bg-white border border-slate-150 hover:bg-slate-50 font-black text-xs uppercase tracking-widest px-6 py-4.5 rounded-2xl transition-all cursor-pointer text-slate-500"
                      >
                        Intentar de nuevo
                      </button>
                    )}

                    {!quizSubmitted ? (
                      <button
                        onClick={handleSubmitQuiz}
                        disabled={isQuizIncomplete()}
                        className="bg-primary hover:bg-[#008080] hover:text-white text-white disabled:opacity-40 disabled:cursor-not-allowed font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl transition-all shadow-md cursor-pointer"
                      >
                        Enviar Respuestas
                      </button>
                    ) : (
                      quizPassed && (
                        <button
                          onClick={handleCompleteStep}
                          className="bg-emerald-500 text-white hover:bg-emerald-600 font-black text-xs uppercase tracking-widest px-8 py-4.5 rounded-2xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        >
                          Continuar lección
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Completed Course celebration badge */}
            {enrollment.progress === 100 && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-emerald-500/10 border-2 border-emerald-400 p-8 rounded-[3rem] text-center max-w-xl mx-auto mt-12 space-y-4"
              >
                <Award className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
                <h3 className="text-3xl font-kenao text-emerald-950">¡Felicitaciones Académicas!</h3>
                <p className="text-sm text-emerald-900/80 leading-relaxed font-semibold">
                  Has completado de forma oficial el 100% de las clases teóricas y superado todos los cuestionarios exigidos en esta capacitación teológica. Tu certificado ha sido enviado para verificación por el cuerpo directivo.
                </p>
                <div>
                  <Link
                    to="/mis-cursos"
                    className="inline-block bg-emerald-500 text-white hover:bg-emerald-600 font-bold text-xs uppercase tracking-wider px-8 py-3.5 rounded-xl transition-all shadow-sm"
                  >
                    Volver a Mis Cursos
                  </Link>
                </div>
              </motion.div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}
