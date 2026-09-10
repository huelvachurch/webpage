import React, { useState } from 'react';
import { MessageSquare, Highlighter, Clock, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Annotation {
  id: string;
  stepId: string;
  classId: string;
  type: 'highlight' | 'note';
  content: string;
  quote?: string | null;
  createdAt: number;
}

interface AnnotationsSectionProps {
  annotations: Annotation[];
  activeStepId: string | null;
  enrollmentId: string | null;
}

export function AnnotationsSection({ annotations, activeStepId, enrollmentId }: AnnotationsSectionProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!activeStepId) return null;

  // Filter only notes for the current step (highlights live directly on the lesson text)
  const stepAnnotations = annotations
    .filter(a => a.stepId === activeStepId && a.type === 'note')
    .sort((a, b) => b.createdAt - a.createdAt);

  if (stepAnnotations.length === 0) {
    return null;
  }

  const handleDeleteConfirm = async (annotationId: string) => {
    if (!enrollmentId) return;
    
    setIsDeleting(annotationId);
    try {
      const updatedAnnotations = annotations.filter(a => String(a.id) !== String(annotationId));
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        annotations: updatedAnnotations
      });
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200 prose-scale-container">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
          <MessageSquare className="w-4 h-4" />
        </div>
        <h3 className="font-kenao text-primary m-0" style={{ fontSize: '1.25em' }}>Tus Notas Personales</h3>
      </div>

      <div className="space-y-4">
        {stepAnnotations.map((annotation) => (
          <div key={annotation.id} className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative group">
            
            {/* Delete button */}
            {confirmDeleteId === annotation.id ? (
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100">
                <span className="text-[9px] font-bold text-red-800 uppercase px-1">¿Eliminar?</span>
                <button
                  onClick={() => handleDeleteConfirm(annotation.id)}
                  disabled={isDeleting === annotation.id}
                  className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={isDeleting === annotation.id}
                  className="px-2 py-1 bg-white text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setConfirmDeleteId(annotation.id)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="Eliminar nota"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-2 mb-3 pr-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 font-black uppercase tracking-widest rounded-md" style={{ fontSize: '0.65em' }}>
                <MessageSquare className="w-3 h-3" /> Nota
              </span>
              
              <span className="flex items-center gap-1 text-slate-400 font-semibold ml-auto" style={{ fontSize: '0.7em' }}>
                <Clock className="w-3 h-3" />
                {new Date(annotation.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-3">
              {annotation.quote && (
                <div className="bg-slate-50 border-l-4 border-primary/40 p-3 rounded-r-xl">
                  <p className="text-slate-500 italic m-0" style={{ fontSize: '0.85em' }}>"{annotation.quote}"</p>
                </div>
              )}
              <p className="text-slate-800 leading-relaxed font-medium m-0" style={{ fontSize: '1em' }}>
                {annotation.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
