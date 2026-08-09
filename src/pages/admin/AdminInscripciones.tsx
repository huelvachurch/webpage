import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { Check, Clock, AlertCircle, BookOpen, Trash2, Ban, RefreshCw, Search } from 'lucide-react';

interface Enrollment {
  id: string;
  courseId: string;
  courseName?: string;
  courseTitle?: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  status: 'pending' | 'active' | 'completed' | 'dropped';
  progress?: number;
  cellName?: string;
  leaderApproved?: boolean;
  enrolledAt: any;
}

export default function AdminInscripciones() {
  const { roles } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action: 'approve' | 'block' | 'unblock' | 'delete';
    enrollment: Enrollment | null;
  }>({
    isOpen: false,
    action: 'approve',
    enrollment: null
  });

  const isDocenteOrAdmin = roles?.includes('admin') || roles?.includes('superadmin') || roles?.includes('profesor');

  useEffect(() => {
    if (!isDocenteOrAdmin) return;
    
    // Fetch courses to get titles
    const qCourses = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(qCourses, (snapshot) => {
      const coursesMap: Record<string, string> = {};
      snapshot.forEach(docSnap => {
        const title = docSnap.data().title || 'Curso sin nombre';
        coursesMap[docSnap.id] = title;
        coursesMap[title] = title; // Map title to itself as fallback
      });
      setCourses(coursesMap);
    }, (error) => {
      console.error("Error fetching courses:", error);
    });

    const q = query(
      collection(db, 'enrollments')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Enrollment[];
      
      data.sort((a, b) => {
        const timeA = a.enrolledAt?.seconds || 0;
        const timeB = b.enrolledAt?.seconds || 0;
        return timeB - timeA;
      });
      setEnrollments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching enrollments:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubCourses();
    };
  }, [isDocenteOrAdmin]);

  const resolveCourseTitle = (enrollment: Enrollment): string => {
    if (enrollment.courseName) return enrollment.courseName;
    if (enrollment.courseTitle) return enrollment.courseTitle;
    if (enrollment.courseId && courses[enrollment.courseId]) return courses[enrollment.courseId];
    if (enrollment.courseId && courses[enrollment.courseId.trim()]) return courses[enrollment.courseId.trim()];
    return 'Curso sin nombre';
  };

  const handleExecuteAction = async () => {
    const { action, enrollment } = confirmModal;
    if (!enrollment) return;

    setProcessingId(enrollment.id);
    setConfirmModal({ isOpen: false, action: 'approve', enrollment: null });

    try {
      if (action === 'approve' || action === 'unblock') {
        await updateDoc(doc(db, 'enrollments', enrollment.id), {
          status: 'active'
        });
      } else if (action === 'block') {
        await updateDoc(doc(db, 'enrollments', enrollment.id), {
          status: 'dropped'
        });
      } else if (action === 'delete') {
        await deleteDoc(doc(db, 'enrollments', enrollment.id));
      }
    } catch (error) {
      if (action === 'delete') {
        handleFirestoreError(error, OperationType.DELETE, `enrollments/${enrollment.id}`);
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollment.id}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (!isDocenteOrAdmin) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver esta página.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando inscripciones...</div>;
  }

  const filteredEnrollments = enrollments.filter(e => {
    const title = resolveCourseTitle(e).toLowerCase();
    const name = (e.studentName || '').toLowerCase();
    const cell = (e.cellName || '').toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase()) || 
                          name.includes(searchTerm.toLowerCase()) ||
                          cell.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Inscripciones a Cursos</h2>
          <p className="text-sm text-slate-500">Gestiona las solicitudes, desbloqueos y estado de los alumnos.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por alumno, curso o célula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="active">Inscritos / Activos</option>
            <option value="dropped">Bloqueados / Dados de baja</option>
            <option value="completed">Finalizados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Alumno</th>
                <th className="p-4">Curso</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500 italic">
                    No se encontraron inscripciones.
                  </td>
                </tr>
              ) : (
                filteredEnrollments.map((enrollment) => {
                  const courseTitle = resolveCourseTitle(enrollment);
                  const isPending = enrollment.status === 'pending';
                  const isActive = enrollment.status === 'active';
                  const isDropped = enrollment.status === 'dropped';
                  const isCompleted = enrollment.status === 'completed';

                  return (
                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-primary">{enrollment.studentName}</div>
                        {enrollment.cellName && (
                          <div className="text-[11px] text-slate-500 mt-0.5">Célula: {enrollment.cellName}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-700">{courseTitle}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200/50">
                            <Clock className="w-3 h-3" /> Pendiente
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200/50">
                            <Check className="w-3 h-3" /> Finalizado
                          </span>
                        ) : isDropped ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200/50">
                            <Ban className="w-3 h-3" /> Bloqueado / Baja
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <Check className="w-3 h-3" /> Inscrito
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Approve button for pending */}
                          {isPending && (
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, action: 'approve', enrollment })}
                              disabled={processingId === enrollment.id}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Aceptar Inscripción"
                            >
                              <Check className="w-4 h-4" /> Aceptar
                            </button>
                          )}

                          {/* Block button for active */}
                          {isActive && (
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, action: 'block', enrollment })}
                              disabled={processingId === enrollment.id}
                              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Bloquear / Dar de baja"
                            >
                              <Ban className="w-4 h-4" /> Bloquear
                            </button>
                          )}

                          {/* Unblock button for dropped or completed */}
                          {(isDropped || isCompleted) && (
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, action: 'unblock', enrollment })}
                              disabled={processingId === enrollment.id}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Desbloquear / Re-activar"
                            >
                              <RefreshCw className="w-4 h-4" /> Desbloquear
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, action: 'delete', enrollment })}
                            disabled={processingId === enrollment.id}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                            title="Eliminar Inscripción"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && confirmModal.enrollment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <div className={`p-3 rounded-xl ${
                confirmModal.action === 'delete' ? 'bg-rose-50 text-rose-600' :
                confirmModal.action === 'block' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {confirmModal.action === 'delete' ? <Trash2 className="w-6 h-6" /> :
                 confirmModal.action === 'block' ? <AlertCircle className="w-6 h-6" /> :
                 <Check className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-snug">
                  {confirmModal.action === 'approve' && 'Aceptar Inscripción'}
                  {confirmModal.action === 'block' && 'Bloquear Alumno'}
                  {confirmModal.action === 'unblock' && 'Desbloquear Alumno'}
                  {confirmModal.action === 'delete' && 'Eliminar Inscripción'}
                </h3>
                <p className="text-xs text-slate-500">Confirma la acción para este expediente.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {confirmModal.action === 'approve' && (
                <>¿Deseas aceptar e inscribir a <strong className="text-primary">{confirmModal.enrollment.studentName}</strong> en el curso <strong className="text-primary">{resolveCourseTitle(confirmModal.enrollment)}</strong>?</>
              )}
              {confirmModal.action === 'block' && (
                <>¿Deseas bloquear / dar de baja la inscripción de <strong className="text-primary">{confirmModal.enrollment.studentName}</strong> en <strong className="text-primary">{resolveCourseTitle(confirmModal.enrollment)}</strong>?</>
              )}
              {confirmModal.action === 'unblock' && (
                <>¿Deseas desbloquear y re-activar la inscripción de <strong className="text-primary">{confirmModal.enrollment.studentName}</strong> en <strong className="text-primary">{resolveCourseTitle(confirmModal.enrollment)}</strong>?</>
              )}
              {confirmModal.action === 'delete' && (
                <>¿ESTÁS SEGURO? Se eliminará permanentemente la inscripción de <strong className="text-primary">{confirmModal.enrollment.studentName}</strong> del curso <strong className="text-primary">{resolveCourseTitle(confirmModal.enrollment)}</strong>. Esta acción no se puede deshacer.</>
              )}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, action: 'approve', enrollment: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  confirmModal.action === 'delete' ? 'bg-rose-600 hover:bg-rose-700' :
                  confirmModal.action === 'block' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmModal.action === 'delete' ? 'Sí, eliminar' :
                 confirmModal.action === 'block' ? 'Sí, bloquear' :
                 confirmModal.action === 'unblock' ? 'Sí, desbloquear' :
                 'Sí, aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

