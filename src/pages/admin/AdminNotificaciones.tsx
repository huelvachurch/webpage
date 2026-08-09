import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { Bell, Clock, User, Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Enrollment {
  id: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  status: 'pending' | 'active' | 'completed';
  enrolledAt: any;
}

export default function AdminNotificaciones() {
  const { roles } = useAuth();
  const [pendingEnrollments, setPendingEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const isDocenteOrAdmin = roles?.includes('admin') || roles?.includes('superadmin') || roles?.includes('profesor');

  useEffect(() => {
    if (!isDocenteOrAdmin) return;
    
    // Fetch courses to get titles
    const qCourses = query(collection(db, 'courses'));
    const unsubCourses = onSnapshot(qCourses, (snapshot) => {
      const coursesMap: Record<string, string> = {};
      snapshot.forEach(doc => {
        coursesMap[doc.id] = doc.data().title || 'Curso sin nombre';
      });
      setCourses(coursesMap);
    }, (error) => {
      console.error("Error fetching courses:", error);
    });

    const q = query(
      collection(db, 'enrollments'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Enrollment[];
      data.sort((a, b) => {
        const timeA = a.enrolledAt?.seconds || 0;
        const timeB = b.enrolledAt?.seconds || 0;
        return timeB - timeA;
      });
      setPendingEnrollments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      unsubCourses();
    };
  }, [isDocenteOrAdmin]);

  if (!isDocenteOrAdmin) {
    return <div className="p-8 text-center text-slate-500">No tienes permisos para ver esta página.</div>;
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando notificaciones...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/5 text-primary rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">Notificaciones</h2>
            <p className="text-sm text-slate-500">Solicitudes pendientes de inscripción.</p>
          </div>
        </div>
        {pendingEnrollments.length > 0 && (
          <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
            {pendingEnrollments.length} nuevas solicitudes
          </div>
        )}
      </div>

      <div className="space-y-4">
        {pendingEnrollments.length === 0 ? (
          <div className="bg-slate-50 rounded-2xl p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">Todo al día</h3>
            <p className="text-slate-500 text-sm">No hay solicitudes de inscripción pendientes.</p>
          </div>
        ) : (
          pendingEnrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-all">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-amber-600" />
              </div>
              
              <div className="flex-grow">
                <div className="text-sm text-slate-500 mb-1">
                  <span className="font-bold text-primary">{enrollment.studentName}</span> ha solicitado inscribirse en:
                </div>
                <h4 className="font-bold text-primary">{enrollment.courseName || (enrollment as any).courseTitle || courses[enrollment.courseId] || courses[enrollment.courseId?.trim()] || 'Curso sin nombre'}</h4>
                {enrollment.enrolledAt && (
                  <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(enrollment.enrolledAt.toDate()).toLocaleString()}
                  </div>
                )}
              </div>
              
              <div className="shrink-0 mt-4 sm:mt-0">
                <Link
                  to="/admin/docencia/inscripciones"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm group/btn"
                >
                  Ir a Inscripciones
                  <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
