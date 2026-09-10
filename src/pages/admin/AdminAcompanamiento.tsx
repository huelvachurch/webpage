import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { BookOpen, User, MessageCircle, Save } from 'lucide-react';

interface Enrollment {
  id: string;
  courseId: string;
  courseName: string;
  studentName: string;
  progress: number;
  grade?: number;
  status: string;
  teacherComments?: string;
}

export default function AdminAcompanamiento() {
  const { user, isAuthReady } = useAuth();
  const [supervisedEnrollments, setSupervisedEnrollments] = useState<Enrollment[]>([]);
  const [commentsForm, setCommentsForm] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthReady && user) {
      const q = query(
        collection(db, 'enrollments'),
        where('accompanyingTeacherId', '==', user.uid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const enrollmentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            courseId: data.courseId,
            courseName: data.courseName || data.courseTitle || 'Curso',
            studentName: data.studentName || 'Alumno',
            progress: data.progress || 0,
            grade: data.grade,
            status: data.status,
            teacherComments: data.teacherComments || '',
          };
        }) as Enrollment[];
        
        setSupervisedEnrollments(enrollmentsData);
        
        // Initialize comments form state
        const commentsState: Record<string, string> = {};
        enrollmentsData.forEach(e => {
          commentsState[e.id] = e.teacherComments || '';
        });
        setCommentsForm(prev => ({ ...commentsState, ...prev }));
      }, (error) => {
        console.error("Error fetching accompanied enrollments:", error);
      });

      return () => unsubscribe();
    }
  }, [isAuthReady, user]);

  const handleSaveComments = async (enrollmentId: string) => {
    setSavingId(enrollmentId);
    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        teacherComments: commentsForm[enrollmentId] || '',
        updatedAt: serverTimestamp()
      });
      alert('Comentarios guardados exitosamente.');
    } catch (error) {
      console.error("Error saving comments:", error);
      alert('Hubo un error al guardar los comentarios.');
    } finally {
      setSavingId(null);
    }
  };

  if (supervisedEnrollments.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-primary mb-2">Sin asignaciones</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Actualmente no tienes ningún alumno asignado para acompañamiento. Cuando un administrador te asigne a un alumno en un curso, aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-kenao text-primary mb-1">Acompañamiento de Alumnos</h2>
        <p className="text-slate-500 text-sm">Realiza el seguimiento y deja comentarios sobre el avance de los alumnos que estás acompañando.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {supervisedEnrollments.map(enrollment => (
          <div key={enrollment.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary leading-tight">{enrollment.studentName}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {enrollment.courseName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progreso del curso</span>
                  <span className="text-sm font-black text-secondary">{enrollment.progress}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-secondary rounded-full transition-all duration-1000"
                    style={{ width: `${enrollment.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex-grow flex flex-col space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" /> Notas y Comentarios del Acompañante
              </label>
              <textarea
                value={commentsForm[enrollment.id] ?? ''}
                onChange={(e) => setCommentsForm(prev => ({ ...prev, [enrollment.id]: e.target.value }))}
                placeholder="Escribe aquí tus observaciones sobre el avance del alumno..."
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-secondary/50 flex-grow min-h-[100px] resize-none"
              />
            </div>

            <div className="pt-4 mt-auto">
              <button
                onClick={() => handleSaveComments(enrollment.id)}
                disabled={savingId === enrollment.id || commentsForm[enrollment.id] === enrollment.teacherComments}
                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  savingId === enrollment.id
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : commentsForm[enrollment.id] !== enrollment.teacherComments
                      ? 'bg-secondary text-white hover:bg-secondary/90 shadow-sm cursor-pointer'
                      : 'bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                {savingId === enrollment.id ? 'Guardando...' : commentsForm[enrollment.id] !== enrollment.teacherComments ? 'Guardar Cambios' : 'Sin Cambios'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
