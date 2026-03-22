import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, X, Save, Image as ImageIcon, Search, Filter, Eye, GraduationCap, Calendar, Clock, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';

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
  enrolledAt: any;
}

export default function AdminCursos() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEnrollmentsModalOpen, setIsEnrollmentsModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
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
  const isProfesor = roles.includes('profesor') || isAdmin;

  // Redirect if not authorized
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isProfesor) {
        navigate('/');
      }
    }
  }, [user, isProfesor, loading, isAuthReady, navigate]);

  // Fetch courses
  useEffect(() => {
    if (isAuthReady && user && isProfesor) {
      const q = isAdmin 
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
  }, [isAuthReady, user, isProfesor, isAdmin]);

  // Fetch all enrollments for professor's courses
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

  const handleOpenModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title,
        description: course.description,
        modality: course.modality,
        durationMode: course.durationMode,
        startDate: course.startDate ? new Date(course.startDate.seconds * 1000).toISOString().split('T')[0] : '',
        endDate: course.endDate ? new Date(course.endDate.seconds * 1000).toISOString().split('T')[0] : '',
        timeLimitDays: course.timeLimitDays || 0,
        imageUrl: course.imageUrl,
        status: course.status,
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        description: '',
        modality: 'self-paced',
        durationMode: 'unlimited',
        startDate: '',
        endDate: '',
        timeLimitDays: 0,
        imageUrl: '',
        status: 'draft',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const data = {
        ...formData,
        instructorId: editingCourse ? editingCourse.instructorId : user.uid,
        instructorName: editingCourse ? editingCourse.instructorName : (user.displayName || 'Profesor'),
        startDate: formData.startDate ? serverTimestamp() : null, // Simplified for now, should parse date
        endDate: formData.endDate ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), data);
      } else {
        await addDoc(collection(db, 'courses'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingCourse ? OperationType.UPDATE : OperationType.CREATE, 'courses');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este curso?')) {
      try {
        await deleteDoc(doc(db, 'courses', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
      }
    }
  };

  const handleEnrollmentStatus = async (enrollmentId: string, status: Enrollment['status']) => {
    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Gestión de Cursos</h1>
            <p className="text-primary/60">Crea y administra tus programas educativos</p>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-secondary hover:text-primary transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Nuevo Curso
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar cursos..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden group hover:shadow-xl transition-all duration-500">
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={course.imageUrl || 'https://picsum.photos/seed/course/800/600'} 
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/90 backdrop-blur-md shadow-sm ${
                    course.status === 'published' ? 'text-emerald-600' : course.status === 'draft' ? 'text-amber-600' : 'text-slate-600'
                  }`}>
                    {course.status === 'published' ? 'Publicado' : course.status === 'draft' ? 'Borrador' : 'Archivado'}
                  </span>
                </div>
              </div>
              <div className="p-8">
                <div className="flex items-center gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest mb-3">
                  {course.modality === 'self-paced' ? <Clock className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                  {course.modality === 'self-paced' ? 'A ritmo personal' : 'Programado'}
                </div>
                <h3 className="text-xl font-bold text-primary mb-2 line-clamp-1">{course.title}</h3>
                <p className="text-primary/60 text-sm mb-6 line-clamp-2">{course.description}</p>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedCourse(course);
                        setIsEnrollmentsModalOpen(true);
                      }}
                      className="p-2 text-primary/40 hover:text-secondary transition-all relative"
                      title="Ver Inscripciones"
                    >
                      <Users className="w-5 h-5" />
                      {enrollments.filter(e => e.courseId === course.id && e.status === 'pending').length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                          {enrollments.filter(e => e.courseId === course.id && e.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenModal(course)}
                      className="p-2 text-primary/40 hover:text-blue-500 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(course.id)}
                      className="p-2 text-primary/40 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-24">
            <GraduationCap className="w-16 h-16 text-primary/10 mx-auto mb-4" />
            <p className="text-primary/30 font-kenao text-2xl">No se encontraron cursos</p>
          </div>
        )}

        {/* Course Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-2xl font-kenao text-primary">
                    {editingCourse ? 'Editar Curso' : 'Nuevo Curso'}
                  </h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                    <X className="w-6 h-6 text-primary/40" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Título del Curso</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Descripción</label>
                      <textarea 
                        required
                        rows={4}
                        className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Modalidad</label>
                        <select 
                          className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none bg-white"
                          value={formData.modality}
                          onChange={(e) => {
                            const val = e.target.value as 'self-paced' | 'scheduled';
                            setFormData({
                              ...formData, 
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
                        <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Configuración</label>
                        <select 
                          className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none bg-white"
                          value={formData.durationMode}
                          onChange={(e) => setFormData({...formData, durationMode: e.target.value as any})}
                        >
                          {formData.modality === 'self-paced' ? (
                            <>
                              <option value="unlimited">Ilimitado</option>
                              <option value="limited">Con límite de tiempo</option>
                            </>
                          ) : (
                            <>
                              <option value="flexible">Fecha flexible</option>
                              <option value="fixed">Fecha fija</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {formData.durationMode === 'limited' && (
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Límite de tiempo (días)</label>
                        <input 
                          type="number" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
                          value={formData.timeLimitDays}
                          onChange={(e) => setFormData({...formData, timeLimitDays: parseInt(e.target.value)})}
                        />
                      </div>
                    )}

                    {formData.durationMode === 'fixed' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Fecha Inicio</label>
                          <input 
                            type="date" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
                            value={formData.startDate}
                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Fecha Fin</label>
                          <input 
                            type="date" 
                            className="w-full px-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
                            value={formData.endDate}
                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">URL de Imagen</label>
                      <div className="flex gap-2">
                        <div className="flex-grow relative">
                          <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
                          <input 
                            type="url" 
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Estado</label>
                      <div className="flex gap-4">
                        {['draft', 'published', 'archived'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({...formData, status: s as any})}
                            className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border ${
                              formData.status === s 
                                ? 'bg-primary text-white border-primary shadow-lg' 
                                : 'bg-white text-primary/40 border-slate-100 hover:border-primary/20'
                            }`}
                          >
                            {s === 'draft' ? 'Borrador' : s === 'published' ? 'Publicar' : 'Archivar'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-8 py-4 rounded-2xl font-bold text-primary/40 hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 bg-secondary text-primary px-8 py-4 rounded-2xl font-bold hover:shadow-xl transition-all"
                    >
                      <Save className="w-5 h-5" />
                      {editingCourse ? 'Guardar Cambios' : 'Crear Curso'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Enrollments Modal */}
        <AnimatePresence>
          {isEnrollmentsModalOpen && selectedCourse && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsEnrollmentsModalOpen(false)}
                className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h2 className="text-2xl font-kenao text-primary">Inscripciones</h2>
                    <p className="text-sm text-primary/40">{selectedCourse.title}</p>
                  </div>
                  <button onClick={() => setIsEnrollmentsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                    <X className="w-6 h-6 text-primary/40" />
                  </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    {enrollments.filter(e => e.courseId === selectedCourse.id).length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-primary/10 mx-auto mb-4" />
                        <p className="text-primary/30">No hay inscripciones aún</p>
                      </div>
                    ) : (
                      enrollments.filter(e => e.courseId === selectedCourse.id).map((enrollment) => (
                        <div key={enrollment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <p className="font-bold text-primary">{enrollment.studentName}</p>
                            <p className="text-xs text-primary/40 uppercase tracking-widest">
                              {enrollment.status === 'pending' ? 'Pendiente' : enrollment.status === 'active' ? 'Activo' : enrollment.status}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {enrollment.status === 'pending' && (
                              <button 
                                onClick={() => handleEnrollmentStatus(enrollment.id, 'active')}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                                title="Aceptar"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                            {enrollment.status === 'active' && (
                              <button 
                                onClick={() => handleEnrollmentStatus(enrollment.id, 'completed')}
                                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                                title="Marcar como completado"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleEnrollmentStatus(enrollment.id, 'dropped')}
                              className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                              title="Rechazar/Eliminar"
                            >
                              <AlertCircle className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
