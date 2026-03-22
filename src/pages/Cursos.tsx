import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, GraduationCap, Calendar, Clock, User, ChevronRight, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';

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
  status: 'pending' | 'active' | 'completed' | 'dropped';
}

export default function Cursos() {
  const { user, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);

  // Fetch published courses
  useEffect(() => {
    const q = query(
      collection(db, 'courses'), 
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
    
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
  }, []);

  // Fetch user's enrollments
  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'enrollments'), 
        where('studentId', '==', user.uid)
      );
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
  }, [user]);

  const handleEnroll = async (courseId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setIsEnrolling(courseId);
    try {
      await addDoc(collection(db, 'enrollments'), {
        courseId,
        studentId: user.uid,
        studentName: user.displayName || 'Alumno',
        status: 'pending',
        progress: 0,
        enrolledAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Success will be reflected via onSnapshot
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
    } finally {
      setIsEnrolling(null);
    }
  };

  const getEnrollmentStatus = (courseId: string) => {
    return enrollments.find(e => e.courseId === courseId)?.status;
  };

  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModality = modalityFilter === 'all' || c.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary text-xs font-black uppercase tracking-[0.2em] mb-4"
          >
            <GraduationCap className="w-4 h-4" />
            Academia Huelva Church
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-kenao text-primary mb-6"
          >
            Explora Nuestros Cursos
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-primary/60 max-w-2xl mx-auto"
          >
            Programas diseñados para tu crecimiento espiritual y personal, con modalidades flexibles para tu día a día.
          </motion.p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-12 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
            <input 
              type="text" 
              placeholder="¿Qué quieres aprender hoy?..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['all', 'self-paced', 'scheduled'].map((m) => (
              <button
                key={m}
                onClick={() => setModalityFilter(m)}
                className={`px-6 py-4 rounded-2xl font-bold text-sm transition-all border ${
                  modalityFilter === m 
                    ? 'bg-primary text-white border-primary shadow-lg' 
                    : 'bg-white text-primary/40 border-slate-100 hover:border-primary/20'
                }`}
              >
                {m === 'all' ? 'Todos' : m === 'self-paced' ? 'A ritmo personal' : 'Programados'}
              </button>
            ))}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course, index) => {
            const status = getEnrollmentStatus(course.id);
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col"
              >
                <div className="aspect-[16/10] relative overflow-hidden">
                  <img 
                    src={course.imageUrl || `https://picsum.photos/seed/${course.id}/800/500`} 
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-6 left-6">
                    <span className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md shadow-sm text-primary">
                      {course.modality === 'self-paced' ? 'A ritmo personal' : 'Programado'}
                    </span>
                  </div>
                </div>
                
                <div className="p-8 flex-grow flex flex-col">
                  <div className="flex items-center gap-2 text-primary/40 mb-4">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{course.instructorName}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-primary mb-3 line-clamp-2 group-hover:text-secondary transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-primary/60 text-sm mb-8 line-clamp-3 leading-relaxed">
                    {course.description}
                  </p>
                  
                  <div className="mt-auto pt-8 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest mb-1">Duración</span>
                      <span className="text-sm font-bold text-primary flex items-center gap-2">
                        {course.durationMode === 'unlimited' ? (
                          <>Ilimitado</>
                        ) : course.durationMode === 'limited' ? (
                          <>{course.timeLimitDays} días</>
                        ) : (
                          <>Consultar fechas</>
                        )}
                      </span>
                    </div>
                    
                    {status ? (
                      <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm ${
                        status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                        status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {status === 'pending' ? (
                          <><Clock className="w-4 h-4" /> Pendiente</>
                        ) : status === 'active' ? (
                          <><CheckCircle className="w-4 h-4" /> Inscrito</>
                        ) : (
                          status.toUpperCase()
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEnroll(course.id)}
                        disabled={isEnrolling === course.id}
                        className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg group/btn"
                      >
                        {isEnrolling === course.id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            Inscribirme
                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-primary/10" />
            </div>
            <h3 className="text-2xl font-kenao text-primary mb-2">No encontramos lo que buscas</h3>
            <p className="text-primary/40">Intenta con otros términos de búsqueda o filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}
