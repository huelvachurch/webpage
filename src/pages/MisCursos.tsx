import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, BookOpen, Clock, CheckCircle, AlertCircle, ChevronRight, Play, Layout, User, Calendar } from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';

interface Course {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  imageUrl: string;
  modality: string;
  requiresCellSupervision?: boolean;
}

interface Enrollment {
  id: string;
  courseId: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  progress: number;
  grade?: number;
  enrolledAt: any;
  leaderApproved?: boolean;
  course?: Course;
}

export default function MisCursos() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user) {
        navigate('/login');
      } else {
        const isStudent = true; // anyone can have courses
        if (!isStudent) {
          navigate('/cursos');
        }
      }
    }
  }, [user, roles, loading, isAuthReady, navigate]);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'enrollments'), 
        where('studentId', '==', user.uid),
        orderBy('enrolledAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const enrollmentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Enrollment[];

        // Fetch course details for each enrollment
        const enrichedEnrollments = await Promise.all(
          enrollmentsData.map(async (enrollment) => {
            const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
            return {
              ...enrollment,
              course: courseDoc.exists() ? { id: courseDoc.id, ...courseDoc.data() } as Course : undefined
            };
          })
        );

        setEnrollments(enrichedEnrollments);
        setIsDataLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'enrollments');
        setIsDataLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  if (loading || isDataLoading) return <div className="pt-32 text-center">Cargando tus cursos...</div>;

  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-kenao text-primary mb-2">Mis Cursos</h1>
          <p className="text-primary/60">Sigue tu progreso y accede a tus programas de formación</p>
        </div>

        {enrollments.length === 0 ? (
          <div className="bg-white p-12 rounded-[3rem] shadow-sm text-center border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-primary/10" />
            </div>
            <h2 className="text-2xl font-kenao text-primary mb-4">Aún no estás inscrito en ningún curso</h2>
            <p className="text-primary/40 mb-8 max-w-md mx-auto">
              Explora nuestra academia y comienza tu viaje de aprendizaje hoy mismo.
            </p>
            <Link 
              to="/cursos"
              className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
            >
              Ver Cursos Disponibles
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Courses */}
            {activeEnrollments.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary/30 mb-6 flex items-center gap-3">
                  <Play className="w-4 h-4 fill-current" />
                  En curso ({activeEnrollments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {activeEnrollments.map((enrollment) => (
                    <CourseCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </section>
            )}

            {/* Pending Courses */}
            {pendingEnrollments.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary/30 mb-6 flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  Pendientes de aprobación ({pendingEnrollments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-60">
                  {pendingEnrollments.map((enrollment) => (
                    <CourseCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed Courses */}
            {completedEnrollments.length > 0 && (
              <section>
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary/30 mb-6 flex items-center gap-3">
                  <CheckCircle className="w-4 h-4" />
                  Completados ({completedEnrollments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {completedEnrollments.map((enrollment) => (
                    <CourseCard key={enrollment.id} enrollment={enrollment} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CourseCard({ enrollment }: { enrollment: Enrollment }) {
  if (!enrollment.course) return null;

  const isPendingLeaderApproval = (
    enrollment.status === 'active' &&
    Boolean(enrollment.course?.requiresCellSupervision) &&
    enrollment.leaderApproved !== true
  );

  const canAccess = (enrollment.status === 'active' && !isPendingLeaderApproval) || enrollment.status === 'completed';

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col justify-between">
      {canAccess ? (
        <Link to={`/cursos/${enrollment.courseId}`} className="aspect-video relative overflow-hidden block cursor-pointer">
          <img 
            src={enrollment.course.imageUrl || `https://picsum.photos/seed/${enrollment.courseId}/800/500`} 
            alt={enrollment.course.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="bg-white text-primary px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl">
              <Play className="w-3.5 h-3.5 fill-current text-emerald-600" />
              Ingresar al Curso
              <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </Link>
      ) : (
        <div className="aspect-video relative overflow-hidden">
          <img 
            src={enrollment.course.imageUrl || `https://picsum.photos/seed/${enrollment.courseId}/800/500`} 
            alt={enrollment.course.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      
      <div className="p-8 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">
            {enrollment.course.modality === 'self-paced' ? <Clock className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
            {enrollment.course.modality === 'self-paced' ? 'A ritmo personal' : 'Programado'}
          </div>
          
          <h3 className="text-xl font-bold text-primary mb-2 line-clamp-1">
            {canAccess ? (
              <Link to={`/cursos/${enrollment.courseId}`} className="hover:text-secondary transition-colors">
                {enrollment.course.title}
              </Link>
            ) : (
              enrollment.course.title
            )}
          </h3>
          <div className="flex items-center gap-2 text-primary/40 text-xs mb-6">
            <User className="w-3 h-3" />
            {enrollment.course.instructorName}
          </div>
        </div>

        <div>
          {enrollment.status === 'active' && (
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-primary/40 uppercase tracking-widest">
                <span>Progreso</span>
                <span>{enrollment.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${enrollment.progress}%` }}
                  className="h-full bg-secondary"
                />
              </div>
              {isPendingLeaderApproval ? (
                <div className="w-full mt-3 flex items-center justify-center gap-2 bg-amber-50 text-amber-800 py-3.5 px-4 rounded-2xl font-bold text-xs border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pendiente aceptación de supervisión</span>
                </div>
              ) : (
                <Link
                  to={`/cursos/${enrollment.courseId}`}
                  className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 px-4 rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md group/btn"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Ingresar al Curso</span>
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>
          )}

          {enrollment.status === 'pending' && (
            <div className="flex items-center gap-2 text-amber-800 bg-amber-50 px-4 py-3 rounded-2xl text-xs font-bold border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pendiente aceptación de inscripción</span>
            </div>
          )}

          {enrollment.status === 'completed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold">
                  <CheckCircle className="w-4 h-4" />
                  Completado
                </div>
                {enrollment.grade !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest block">Nota</span>
                    <span className="text-lg font-bold text-primary">{enrollment.grade}</span>
                  </div>
                )}
              </div>
              <Link
                to={`/cursos/${enrollment.courseId}`}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 px-4 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
              >
                <span>Repasar Contenidos</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
