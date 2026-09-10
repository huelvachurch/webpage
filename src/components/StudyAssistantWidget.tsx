import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, Type, Highlighter, StickyNote, X, Plus, Minus, Check, MessageSquare, PenLine, FileText } from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface StudyAssistantWidgetProps {
  enrollmentId: string | null;
  activeStepId: string | null;
  activeClassId: string | null;
  isHighlightMode?: boolean;
  onToggleHighlightMode?: () => void;
  onSaveHighlight?: (text: string) => void;
}

export function StudyAssistantWidget({ 
  enrollmentId, 
  activeStepId, 
  activeClassId,
  isHighlightMode = false,
  onToggleHighlightMode,
  onSaveHighlight
}: StudyAssistantWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(1); // Decimal scale 1 = 100%
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedQuote, setSelectedQuote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Handle font size changes globally for the content
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--study-font-scale', fontSize.toString());
  }, [fontSize]);

  const handleIncreaseFont = () => setFontSize(prev => Math.min(prev + 0.1, 1.5));
  const handleDecreaseFont = () => setFontSize(prev => Math.max(prev - 0.1, 0.8));

  const handleHighlight = async () => {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim() !== '';

    if (hasSelection) {
      const text = selection!.toString().trim();
      if (onSaveHighlight) {
        onSaveHighlight(text);
      } else if (enrollmentId && activeStepId && activeClassId) {
        try {
          const newAnnotation = {
            id: Date.now().toString(),
            stepId: activeStepId,
            classId: activeClassId,
            type: 'highlight',
            content: text,
            createdAt: Date.now(),
          };
          await updateDoc(doc(db, 'enrollments', enrollmentId), {
            annotations: arrayUnion(newAnnotation)
          });
        } catch (e) {
          console.error(e);
        }
      }
      selection!.removeAllRanges();
      
      // Also ensure highlight mode is enabled for continued painting
      if (!isHighlightMode && onToggleHighlightMode) {
        onToggleHighlightMode();
      }
    } else {
      // Toggle highlight mode
      if (onToggleHighlightMode) {
        onToggleHighlightMode();
      }
    }
  };

  const handleOpenNoteModal = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() !== '') {
      setSelectedQuote(selection.toString().trim());
    } else {
      setSelectedQuote("");
    }
    setNoteText("");
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    if (!enrollmentId || !activeStepId || !activeClassId) return;

    setIsSaving(true);
    try {
      const newAnnotation = {
        id: Date.now().toString(),
        stepId: activeStepId,
        classId: activeClassId,
        type: 'note',
        content: noteText.trim(),
        quote: selectedQuote || null,
        createdAt: Date.now(),
      };

      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        annotations: arrayUnion(newAnnotation)
      });

      setIsNoteModalOpen(false);
      setNoteText("");
      setSelectedQuote("");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${enrollmentId}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Only show if there's an active step
  if (!activeStepId) return null;

  return (
    <>
      {/* Floating Menu */}
      <div 
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3"
        onMouseDown={(e) => e.preventDefault()} // Prevents text selection from clearing
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="flex flex-col gap-3 bg-white p-2 rounded-2xl shadow-xl border border-slate-200"
            >
              <div className="flex flex-col items-center gap-1 border-b border-slate-100 pb-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Texto</span>
                <div className="flex gap-2">
                  <button onClick={handleDecreaseFont} onMouseDown={(e) => e.preventDefault()} className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors" title="Disminuir texto">
                    <Minus className="w-4 h-4" />
                  </button>
                  <button onClick={handleIncreaseFont} onMouseDown={(e) => e.preventDefault()} className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors" title="Aumentar texto">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleHighlight} 
                onMouseDown={(e) => e.preventDefault()} 
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  isHighlightMode 
                    ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-xs' 
                    : 'hover:bg-yellow-50 text-slate-700 hover:text-yellow-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform ${
                    isHighlightMode ? 'bg-amber-300 text-amber-950 scale-105' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    <Highlighter className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold block">Subrayar</span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {isHighlightMode ? 'Pintando texto' : 'Activar modo'}
                    </span>
                  </div>
                </div>
                {isHighlightMode && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/80 text-slate-900 px-2 py-0.5 rounded-md">
                    ON
                  </span>
                )}
              </button>
              
              <button onClick={handleOpenNoteModal} onMouseDown={(e) => e.preventDefault()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors group cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <PenLine className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold block">Anotar</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Nueva nota</span>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseDown={(e) => e.preventDefault()}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 hover:scale-105 cursor-pointer relative ${
            isOpen 
              ? 'bg-slate-800' 
              : isHighlightMode 
                ? 'bg-amber-500 ring-4 ring-amber-300 shadow-amber-500/30' 
                : 'bg-primary'
          }`}
          title="Herramientas de estudio"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : isHighlightMode ? (
            <Highlighter className="w-6 h-6 text-slate-950 animate-pulse" />
          ) : (
            <FileText className="w-6 h-6" />
          )}

          {isHighlightMode && !isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
          )}
        </button>
      </div>

      {/* Floating Active Highlight Banner */}
      <AnimatePresence>
        {isHighlightMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-18 md:top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-400 text-slate-900 px-4 md:px-5 py-2.5 rounded-full shadow-xl border-2 border-amber-300 flex items-center gap-3 backdrop-blur-md max-w-[92vw]"
          >
            <div className="w-7 h-7 rounded-full bg-amber-500/60 flex items-center justify-center animate-pulse shrink-0">
              <Highlighter className="w-3.5 h-3.5 text-slate-950" />
            </div>
            <span className="text-xs font-bold tracking-tight select-none truncate">
              Modo Resaltado: Selecciona cualquier texto para pintarlo
            </span>
            <button
              onClick={onToggleHighlightMode}
              className="px-3 py-1 bg-slate-900 text-amber-300 hover:bg-slate-800 text-[11px] font-black uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-xs shrink-0"
            >
              Listo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Note Modal */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-kenao text-primary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                  Nueva Anotación
                </h3>
                <button onClick={() => setIsNoteModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                {selectedQuote && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-xl">
                    <span className="text-[10px] font-black uppercase text-yellow-800 tracking-widest block mb-1">Texto Referencia</span>
                    <p className="text-xs text-yellow-900 italic line-clamp-3">"{selectedQuote}"</p>
                  </div>
                )}
                
                <div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escribe tus apuntes o reflexiones aquí..."
                    rows={4}
                    autoFocus
                    className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-sm text-slate-700 font-medium resize-none"
                  />
                </div>
              </div>

              <div className="p-6 pt-0 flex justify-end gap-3">
                <button
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={isSaving || !noteText.trim()}
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-secondary hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Guardando...' : (
                    <><Check className="w-4 h-4" /> Guardar Anotación</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
