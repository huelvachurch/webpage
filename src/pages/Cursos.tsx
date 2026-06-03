import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, GraduationCap, Calendar, Clock, User, ChevronRight, CheckCircle, AlertCircle, LogIn } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  title_en?: string;
  description_en?: string;
  title_pt?: string;
  description_pt?: string;
}

interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
}

export default function Cursos() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [requestedAlumno, setRequestedAlumno] = useState(false);
  const [requestingAlumno, setRequestingAlumno] = useState(false);

  // Fetch whether user has requested Alumno role
  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setRequestedAlumno(data.requestedAlumnoRole === true);
        }
      }, (error) => {
        console.error("Error reading user profile changes:", error);
      });
      return () => unsubscribe();
    }
  }, [user]);

  // Redirect guest users to login
  useEffect(() => {
    if (isAuthReady && !loading && !user) {
      navigate('/login');
    }
  }, [user, loading, isAuthReady, navigate]);

  const handleRequestAlumno = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setRequestingAlumno(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        requestedAlumnoRole: true,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error requesting Alumno role:", error);
    } finally {
      setRequestingAlumno(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [modalityFilter, setModalityFilter] = useState<string>('all');
  const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2);

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

  const getCourseTitle = (course: Course) => {
    if (currentLang === 'en' && course.title_en) return course.title_en;
    if (currentLang === 'pt' && course.title_pt) return course.title_pt;
    return course.title;
  };

  const getCourseDesc = (course: Course) => {
    if (currentLang === 'en' && course.description_en) return course.description_en;
    if (currentLang === 'pt' && course.description_pt) return course.description_pt;
    return course.description;
  };

  const filteredCourses = courses.filter(c => {
    const title = getCourseTitle(c);
    const desc = getCourseDesc(c);
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModality = modalityFilter === 'all' || c.modality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  const isStudent = roles?.includes('alumno') || roles?.includes('admin') || roles?.includes('profesor');

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
            {t('courses.tag')}
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-kenao text-primary mb-6"
          >
            {t('courses.title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-primary/60 max-w-2xl mx-auto"
          >
            {t('courses.desc')}
          </motion.p>
        </div>

        {isStudent ? (
          <>
            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm mb-12 flex flex-col md:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder={t('courses.searchPh')} 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalityFilter('all')}
                  className={`px-6 py-4 rounded-2xl font-bold text-sm transition-all border ${
                    modalityFilter === 'all' 
                      ? 'bg-primary text-white border-primary shadow-lg' 
                      : 'bg-white text-primary/40 border-slate-100 hover:border-primary/20'
                  }`}
                >
                  {t('courses.allCourses')}
                </button>
                <button
                  onClick={() => setModalityFilter('self-paced')}
                  className={`px-6 py-4 rounded-2xl font-bold text-sm transition-all border ${
                    modalityFilter === 'self-paced' 
                      ? 'bg-primary text-white border-primary shadow-lg' 
                      : 'bg-white text-primary/40 border-slate-100 hover:border-primary/20'
                  }`}
                >
                  {t('courses.selfPaced')}
                </button>
                <button
                  onClick={() => setModalityFilter('scheduled')}
                  className={`px-6 py-4 rounded-2xl font-bold text-sm transition-all border ${
                    modalityFilter === 'scheduled' 
                      ? 'bg-primary text-white border-primary shadow-lg' 
                      : 'bg-white text-primary/40 border-slate-100 hover:border-primary/20'
                  }`}
                >
                  {t('courses.scheduled')}
                </button>
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
                        alt={getCourseTitle(course)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-6 left-6">
                        <span className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md shadow-sm text-primary">
                          {course.modality === 'self-paced' ? t('courses.selfPaced') : t('courses.scheduled')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-8 flex-grow flex flex-col">
                      <div className="flex items-center gap-2 text-primary/40 mb-4">
                        <User className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">{course.instructorName}</span>
                      </div>
                      
                      <h3 className="text-2xl font-bold text-primary mb-3 line-clamp-2 group-hover:text-secondary transition-colors">
                        {getCourseTitle(course)}
                      </h3>
                      <p className="text-primary/60 text-sm mb-8 line-clamp-3 leading-relaxed">
                        {getCourseDesc(course)}
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
                                Solicitar Ingreso
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
                <h3 className="text-2xl font-kenao text-primary mb-2">{t('courses.notFound')}</h3>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center max-w-3xl mx-auto mt-6 relative overflow-hidden">
            {/* Background design accents */}
            <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-secondary/5 pointer-events-none" />
            <div className="absolute -left-12 -bottom-12 w-24 h-24 rounded-full bg-primary/5 pointer-events-none" />

            <div className="w-20 h-20 bg-primary/5 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm">
              <GraduationCap className="w-10 h-10" />
            </div>

            <h3 className="text-3xl md:text-4xl font-kenao text-primary mb-4">Plataforma de Capacitación</h3>
            <p className="text-primary/60 mb-10 leading-relaxed max-w-xl mx-auto text-base">
              Para poder visualizar el catálogo completo de nuestros cursos, inscribirte en clases y participar en programas académicos, se requiere tener asignado el Rol de Alumno oficial.
            </p>

            <div className="flex flex-col items-center justify-center">
              {requestedAlumno ? (
                <div className="flex flex-col items-center gap-3 bg-amber-50/70 text-amber-800 border border-amber-200/50 px-8 py-6 rounded-2xl max-w-md w-full">
                  <div className="flex items-center gap-2.5 font-bold text-sm uppercase tracking-wider">
                    <Clock className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                    Esperando asignación de Rol de Alumno
                  </div>
                  <p className="text-xs text-amber-700/80 leading-relaxed font-semibold">
                    Tu solicitud ha sido enviada con éxito. El equipo de secretaría y administración de Huelva Church se encuentra revisándola y te habilitará el acceso académico muy pronto.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRequestAlumno}
                  disabled={requestingAlumno}
                  className="bg-primary text-white hover:bg-secondary hover:text-primary px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg hover:shadow-xl cursor-pointer"
                  style={{ minHeight: "44px" }}
                >
                  {requestingAlumno ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    'Solicitar ser alumno'
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
