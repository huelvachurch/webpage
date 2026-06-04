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
import { collection, query, where, getDocs, addDoc, getDoc, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Tag memory tracking states
  const [cellMembers, setCellMembers] = useState<any[]>([]);
  const [newBaptizedName, setNewBaptizedName] = useState('');
  const [newNotBaptizedName, setNewNotBaptizedName] = useState('');
  const [newNonBelieverName, setNewNonBelieverName] = useState('');

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

  // Fetch cell members memory on load
  useEffect(() => {
    if (!leaderId) return;

    const fetchMembers = async () => {
      try {
        const q = query(collection(db, 'cell_members'), where('leaderId', '==', leaderId));
        const querySnap = await getDocs(q);
        const membersList = querySnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isActive: false // Initialized as inactive
        }));
        setCellMembers(membersList);
      } catch (err) {
        console.error("Error fetching cell members:", err);
      }
    };

    fetchMembers();
  }, [leaderId]);

  const toggleMemberActive = (id: string) => {
    setCellMembers(prev => prev.map(member => 
      member.id === id ? { ...member, isActive: !member.isActive } : member
    ));
  };

  const handleAddNewMember = async (name: string, category: 'bautizado' | 'no_bautizado' | 'no_creyente', clearInput: () => void) => {
    const trimmedName = name.trim();
    if (!trimmedName || !leaderId) return;

    // Check if name already exists in memory to prevent duplicate entries
    const exists = cellMembers.some(m => m.name.toLowerCase() === trimmedName.toLowerCase() && m.category === category);
    if (exists) {
      alert("Este nombre ya existe en esta categoría.");
      return;
    }

    try {
      const newMemberRef = doc(collection(db, 'cell_members'));
      const newMemberData = {
        leaderId: leaderId,
        name: trimmedName,
        category: category,
        consecutiveAbsences: 0,
        updatedAt: new Date().toISOString()
      };

      await setDoc(newMemberRef, newMemberData);

      // Append locally with activated state
      setCellMembers(prev => [...prev, {
        id: newMemberRef.id,
        ...newMemberData,
        isActive: true
      }]);

      clearInput();
    } catch (err) {
      console.error("Error adding new cell member:", err);
      alert("Error al añadir miembro a la base de datos.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaderId) {
      alert("Error: No se ha provisto un identificador de líder válido.");
      return;
    }

    setIsSubmitting(true);

    try {
      const leaderName = cellData?.leader || "Líder de Célula";

      // Calculate automated counts and names representing the selected tags
      const activeBaptized = cellMembers.filter(m => m.category === 'bautizado' && m.isActive);
      const activeNotBaptized = cellMembers.filter(m => m.category === 'no_bautizado' && m.isActive);
      const activeNonBelievers = cellMembers.filter(m => m.category === 'no_creyente' && m.isActive);

      const baptizedCount = activeBaptized.length;
      const notBaptizedCount = activeNotBaptized.length;
      const computedNonBelieversCount = activeNonBelievers.length;
      const computedBelieversCount = baptizedCount + notBaptizedCount;

      const baptizedNamesStr = activeBaptized.map(m => m.name).join(', ');
      const notBaptizedNamesStr = activeNotBaptized.map(m => m.name).join(', ');
      const computedBelieversNamesStr = [baptizedNamesStr, notBaptizedNamesStr].filter(Boolean).join(', ');
      const computedNonBelieversNamesStr = activeNonBelievers.map(m => m.name).join(', ') || 'Ninguno';

      const totalPresent = computedBelieversCount + computedNonBelieversCount;

      const reportData = {
        leaderId: leaderId,
        leaderName: leaderName,
        meetingDate: meetingDate,
        believersCount: computedBelieversCount,
        nonBelieversCount: computedNonBelieversCount,
        totalPresent: totalPresent,
        believersNames: computedBelieversNamesStr,
        nonBelieversNames: computedNonBelieversNamesStr,
        believersBaptizedCount: baptizedCount,
        believersNotBaptizedCount: notBaptizedCount,
        believersBaptizedNames: baptizedNamesStr,
        believersNotBaptizedNames: notBaptizedNamesStr,
        comments: comments || '',
        createdAt: new Date().toISOString()
      };

      // Create meeting report
      await addDoc(collection(db, 'meeting_reports'), reportData);

      // Save attendee memory tracking logic:
      // Loop over cellMembers from database, update or prune consecutive absences.
      for (const member of cellMembers) {
        const memberRef = doc(db, 'cell_members', member.id);
        if (member.isActive) {
          // Reset absences
          await updateDoc(memberRef, {
            consecutiveAbsences: 0,
            updatedAt: new Date().toISOString()
          });
        } else {
          const newAbsences = (member.consecutiveAbsences || 0) + 1;
          if (newAbsences >= 10) {
            // Pruning memory tag
            await deleteDoc(memberRef);
          } else {
            await updateDoc(memberRef, {
              consecutiveAbsences: newAbsences,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      // Reset activity status
      setCellMembers(prev => prev.map(m => ({ ...m, isActive: false })));
      
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

                {/* Interactive Sub-Category Attendance Tags */}
                <div className="space-y-6">
                  {/* Category 1: Creyentes Bautizados */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                      <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2 select-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        Creyentes Bautizados
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-bold font-mono">
                        {cellMembers.filter(m => m.category === 'bautizado' && m.isActive).length} Activos
                      </span>
                    </div>

                    {/* List of Tags */}
                    <div className="flex flex-wrap gap-2 py-1 min-h-[40px]">
                      {cellMembers.filter(m => m.category === 'bautizado').length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay etiquetas en esta categoría aún. Añada una escribiendo abajo.</p>
                      ) : (
                        cellMembers
                          .filter(m => m.category === 'bautizado')
                          .map(member => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleMemberActive(member.id)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                member.isActive
                                  ? 'bg-primary text-white border border-primary/20 shadow-sm animate-none'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {member.name}
                              {member.consecutiveAbsences > 0 && (
                                <span className={`text-[9px] px-1 rounded-md ${member.isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                  -{member.consecutiveAbsences}
                                </span>
                              )}
                            </button>
                          ))
                      )}
                    </div>

                    {/* Input Box to add member */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Nombre del creyente bautizado..."
                        value={newBaptizedName}
                        onChange={(e) => setNewBaptizedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewMember(newBaptizedName, 'bautizado', () => setNewBaptizedName(''));
                          }
                        }}
                        className="px-3.5 py-2 w-full bg-white rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-xs text-primary font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewMember(newBaptizedName, 'bautizado', () => setNewBaptizedName(''))}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  </div>

                  {/* Category 2: Creyentes No Bautizados */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                      <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2 select-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        Creyentes No Bautizados
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-bold font-mono">
                        {cellMembers.filter(m => m.category === 'no_bautizado' && m.isActive).length} Activos
                      </span>
                    </div>

                    {/* List of Tags */}
                    <div className="flex flex-wrap gap-2 py-1 min-h-[40px]">
                      {cellMembers.filter(m => m.category === 'no_bautizado').length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay etiquetas en esta categoría aún. Añada una escribiendo abajo.</p>
                      ) : (
                        cellMembers
                          .filter(m => m.category === 'no_bautizado')
                          .map(member => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleMemberActive(member.id)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                member.isActive
                                  ? 'bg-primary text-white border border-primary/20 shadow-sm animate-none'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {member.name}
                              {member.consecutiveAbsences > 0 && (
                                <span className={`text-[9px] px-1 rounded-md ${member.isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                  -{member.consecutiveAbsences}
                                </span>
                              )}
                            </button>
                          ))
                      )}
                    </div>

                    {/* Input Box */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Nombre del creyente no bautizado..."
                        value={newNotBaptizedName}
                        onChange={(e) => setNewNotBaptizedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewMember(newNotBaptizedName, 'no_bautizado', () => setNewNotBaptizedName(''));
                          }
                        }}
                        className="px-3.5 py-2 w-full bg-white rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-xs text-primary font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewMember(newNotBaptizedName, 'no_bautizado', () => setNewNotBaptizedName(''))}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  </div>

                  {/* Category 3: No Creyentes */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-3">
                      <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 flex items-center gap-2 select-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        No Creyentes
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-primary text-xs font-bold font-mono">
                        {cellMembers.filter(m => m.category === 'no_creyente' && m.isActive).length} Activos
                      </span>
                    </div>

                    {/* List of Tags */}
                    <div className="flex flex-wrap gap-2 py-1 min-h-[40px]">
                      {cellMembers.filter(m => m.category === 'no_creyente').length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No hay etiquetas en esta categoría aún. Añada una escribiendo abajo.</p>
                      ) : (
                        cellMembers
                          .filter(m => m.category === 'no_creyente')
                          .map(member => (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => toggleMemberActive(member.id)}
                              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold select-none transition-all flex items-center gap-1.5 cursor-pointer ${
                                member.isActive
                                  ? 'bg-primary text-white border border-primary/20 shadow-sm animate-none'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {member.name}
                              {member.consecutiveAbsences > 0 && (
                                <span className={`text-[9px] px-1 rounded-md ${member.isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 font-bold'}`}>
                                  -{member.consecutiveAbsences}
                                </span>
                              )}
                            </button>
                          ))
                      )}
                    </div>

                    {/* Input Box */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Nombre del invitado no creyente..."
                        value={newNonBelieverName}
                        onChange={(e) => setNewNonBelieverName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewMember(newNonBelieverName, 'no_creyente', () => setNewNonBelieverName(''));
                          }
                        }}
                        className="px-3.5 py-2 w-full bg-white rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary focus:border-transparent outline-none transition-all text-xs text-primary font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewMember(newNonBelieverName, 'no_creyente', () => setNewNonBelieverName(''))}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Añadir
                      </button>
                    </div>
                  </div>
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
