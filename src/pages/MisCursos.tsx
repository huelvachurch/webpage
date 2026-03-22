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
}

interface Enrollment {
  id: string;
  courseId: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  progress: number;
  grade?: number;
  enrolledAt: any;
  course?: Course;
}

export default function MisCursos() {
  const { user, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    if (isAuthReady && !loading && !user) {
      navigate('/login');
    }
  }, [user, loading, isAuthReady, navigate]);

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

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-500">
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={enrollment.course.imageUrl || `https://picsum.photos/seed/${enrollment.courseId}/800/500`} 
          alt={enrollment.course.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
          {enrollment.status === 'active' && (
            <Link 
              to={`/cursos/${enrollment.courseId}`}
              className="bg-white text-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
      
      <div className="p-8">
        <div className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">
          {enrollment.course.modality === 'self-paced' ? <Clock className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
          {enrollment.course.modality === 'self-paced' ? 'A ritmo personal' : 'Programado'}
        </div>
        
        <h3 className="text-xl font-bold text-primary mb-2 line-clamp-1">{enrollment.course.title}</h3>
        <div className="flex items-center gap-2 text-primary/40 text-xs mb-6">
          <User className="w-3 h-3" />
          {enrollment.course.instructorName}
        </div>

        {enrollment.status === 'active' && (
          <div className="space-y-2">
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
          </div>
        )}

        {enrollment.status === 'pending' && (
          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-xs font-bold">
            <Clock className="w-4 h-4" />
            Esperando aprobación
          </div>
        )}

        {enrollment.status === 'completed' && (
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
        )}
      </div>
    </div>
  );
}
