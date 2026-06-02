import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Users, 
  User, 
  MessageSquare, 
  Plus, 
  Minus, 
  Send, 
  CheckCircle, 
  Info, 
  Smile,
  Heart,
  Home
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function AsistenciaCompartida() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const leaderId = searchParams.get('leaderId');

  // Cell and Leader detail state
  const [cellData, setCellData] = useState<any>(null);
  const [isCellLoading, setIsCellLoading] = useState(true);

  // Form states
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [believersCount, setBelieversCount] = useState(0);
  const [nonBelieversCount, setNonBelieversCount] = useState(0);
  const [believersNames, setBelieversNames] = useState('');
  const [nonBelieversNames, setNonBelieversNames] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load parent cell information
  useEffect(() => {
    if (!leaderId) {
      setIsCellLoading(false);
      return;
    }

    const fetchCell = async () => {
      try {
        // Try getting by document ID directly (e.g. user.uid)
        const docRef = doc(db, 'celulas', leaderId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCellData(docSnap.data());
        } else {
          // Fallback, query by leaderId field
          const q = query(collection(db, 'celulas'), where('leaderId', '==', leaderId));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            setCellData(querySnap.docs[0].data());
          }
        }
      } catch (err) {
        console.error("Error fetching cell info:", err);
      } finally {
        setIsCellLoading(false);
      }
    };

    fetchCell();
  }, [leaderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderId) {
      alert("Error: No se ha provisto un identificador de líder válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const leaderName = cellData?.leader || "Líder de Célula";
      const totalPresent = (Number(believersCount) || 0) + (Number(nonBelieversCount) || 0);

      const reportData = {
        leaderId: leaderId,
        leaderName: leaderName,
        meetingDate: meetingDate,
        believersCount: Number(believersCount) || 0,
        nonBelieversCount: Number(nonBelieversCount) || 0,
        totalPresent: totalPresent,
        believersNames: believersNames || '',
        nonBelieversNames: nonBelieversNames || '',
        comments: comments || '', // Include comments if defined
        createdAt: new Date().toISOString()
      };

      // Create meeting report
      await addDoc(collection(db, 'meeting_reports'), reportData);
      
      setShowSuccess(true);
    } catch (err) {
      console.error("Error submitting attendance report:", err);
      alert("Error al registrar la asistencia de la reunión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!leaderId) {
    return (
      <div className="pt-32 pb-24 bg-slate-50 min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] border border-slate-200 p-8 text-center shadow-md">
          <Info className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-2xl font-kenao text-primary font-bold mb-3">Enlace Inválido</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Este enlace de formulario compartido no contiene un identificador de líder de célula válido. Solicite un nuevo enlace al líder de su célula.
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-3.5 bg-primary text-white font-bold rounded-xl hover:bg-secondary hover:text-primary transition-all uppercase tracking-wider text-xs"
          >
            Volver a la Página Principal
          </button>
        </div>
      </div>
    );
  }

  if (isCellLoading) {
    return (
      <div className="pt-24 bg-slate-50 min-h-screen flex items-center justify-center font-bold text-primary/60">
        Cargando formulario de asistencia de célula...
      </div>
    );
  }

  const leaderDisplayName = cellData?.leader || "Líder de Célula";
  const cellTitle = cellData?.name || `Célula de ${leaderDisplayName}`;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      
      {/* Visual background decorations conforming directly to premium design directives */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-100/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-100/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-xl w-full">
        <AnimatePresence mode="wait">
          {!showSuccess ? (
            <motion.div
              key="attendance-form-box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden"
            >
              {/* Header card with amber brand details */}
              <div className="bg-primary text-white px-8 py-10 text-left relative">
                <div className="absolute top-8 right-8 text-secondary">
                  <Heart className="w-8 h-8 fill-current text-secondary animate-pulse" />
                </div>
                <span className="inline-block bg-white/10 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">
                  Reporte Colaborativo
                </span>
                <h1 className="text-3xl font-kenao font-bold leading-tight mb-2 tracking-tight">
                  Formulario de Asistencia de la Célula de {leaderDisplayName}
                </h1>
                <p className="text-xs text-white/70 leading-relaxed max-w-sm">
                  Gracias por colaborar en completar el registro de asistencia del grupo {cellTitle} el día de hoy.
                </p>
              </div>

              {/* Form container */}
              <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
                {/* Meeting Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-secondary" />
                    Fecha de la Reunión
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm"
                  />
                </div>

                {/* Counter Stats Section */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Believers Count */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Creyentes
                    </label>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setBelieversCount(prev => Math.max(0, prev - 1))}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-bold"
                      >
                        <Minus className="w-4 h-4 text-primary" />
                      </button>
                      <span className="text-xl font-bold font-mono text-primary">
                        {believersCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBelieversCount(prev => prev + 1)}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-bold"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>

                  {/* Non Believers Count */}
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      No Creyentes
                    </label>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setNonBelieversCount(prev => Math.max(0, prev - 1))}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-bold"
                      >
                        <Minus className="w-4 h-4 text-primary" />
                      </button>
                      <span className="text-xl font-bold font-mono text-primary">
                        {nonBelieversCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setNonBelieversCount(prev => prev + 1)}
                        className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer font-bold"
                      >
                        <Plus className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Names of Believers */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-primary" />
                    Nombre de Creyentes
                  </label>
                  <textarea
                    required
                    value={believersNames}
                    onChange={(e) => setBelieversNames(e.target.value)}
                    rows={2}
                    placeholder="Escriba los nombres de los creyentes presentes separados por comas..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm leading-relaxed"
                  />
                </div>

                {/* Names of Non-Believers */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-secondary" />
                    Nombre de No Creyentes
                  </label>
                  <textarea
                    value={nonBelieversNames}
                    onChange={(e) => setNonBelieversNames(e.target.value)}
                    rows={2}
                    placeholder="Escriba los nombres de los no creyentes presentes separdos por comas..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm leading-relaxed"
                  />
                </div>

                {/* Remarks/Highlights */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Comentarios / Motivos de Oración / Logros
                  </label>
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={2}
                    placeholder="Peticiones de oración, milagros constatados o anecdotario de la reunión..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm leading-relaxed"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-primary hover:bg-secondary hover:text-primary text-white font-bold rounded-xl transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Registrando Asistencia...' : 'Enviar Reporte de Reunión'}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="attendance-success-box"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-2xl text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-kenao text-primary font-bold mb-3">¡Reporte Registrado!</h2>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">
                El formulario de asistencia ha sido exitosamente enviado. Los datos han sido guardados para la célula de <span className="font-bold text-primary">{leaderDisplayName}</span> en Huelva Church.
              </p>

              <button 
                onClick={() => navigate('/')} 
                className="py-3.5 px-8 bg-amber-400 text-primary font-bold rounded-xl hover:bg-amber-500 transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 mx-auto cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Ir a la Página Principal
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
