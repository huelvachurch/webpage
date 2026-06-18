import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';
import { Save, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  const { user, isAuthReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');
  const [hideHuelvaChurchCell, setHideHuelvaChurchCell] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resetModalType, setResetModalType] = useState<'celula' | 'asistentes' | null>(null);
  const [resetInput, setResetInput] = useState('');

  // Helper to show temporary success message
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => {
      setSuccessMessage(current => current === msg ? null : current);
    }, 5000);
  };

  // Helper to show temporary error message
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => {
      setErrorMessage(current => current === msg ? null : current);
    }, 5000);
  };

  const handleResetMyCelula = async () => {
    if (!user) return;
    setResetting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { 
        celulaId: null,
        celulaStatus: null
      }, { merge: true });
      triggerSuccess("Se restableció Mi Célula con éxito.");
      setResetModalType(null);
      setResetInput('');
    } catch (err) {
      console.error("Error resetting celula:", err);
      triggerError("No se pudo restablecer la célula.");
    } finally {
      setResetting(false);
    }
  };

  const handleResetAsistentes = async () => {
    if (!user) return;
    setResetting(true);
    try {
      const qCell = query(collection(db, 'celulas'), where('leaderId', '==', user.uid));
      const cellSnap = await getDocs(qCell);
      if (cellSnap.empty) {
        triggerError("No se encontró tu célula.");
        return;
      }
      const cellId = cellSnap.docs[0].id;
      
      // Unlink users
      const qUsers = query(collection(db, 'users'), where('celulaId', '==', cellId));
      const usersSnap = await getDocs(qUsers);
      
      const batch = writeBatch(db);
      usersSnap.forEach(uDoc => {
         batch.update(uDoc.ref, { celulaId: null, celulaStatus: null });
      });

      // Delete cell_members
      const qMembers = query(collection(db, 'cell_members'), where('cellId', '==', cellId));
      const membersSnap = await getDocs(qMembers);
      membersSnap.forEach(mDoc => {
        batch.delete(mDoc.ref);
      });

      await batch.commit();
      
      triggerSuccess("Se restablecieron los asistentes con éxito.");
      setResetModalType(null);
      setResetInput('');
    } catch (err) {
      console.error("Error resetting asistentes:", err);
      triggerError("No se pudo restablecer los asistentes.");
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.meetingTime) setMeetingTime(data.meetingTime);
          if (data.hideHuelvaChurchCell !== undefined) setHideHuelvaChurchCell(data.hideHuelvaChurchCell);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user, isAuthReady]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        meetingTime: meetingTime,
        hideHuelvaChurchCell: hideHuelvaChurchCell
      }, { merge: true });
      triggerSuccess('Ajustes guardados correctamente.');
    } catch (err) {
      console.error(err);
      triggerError('Error al guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pt-32 pb-24 text-center">Cargando ajustes...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-kenao text-primary mb-2">Ajustes Generales</h1>
        <p className="text-primary/60 mb-8">Configura horarios e información general que se refleja en toda la aplicación web.</p>
        
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-medium flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 text-xs font-bold font-mono p-1">✕</button>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-850 rounded-2xl text-sm font-medium flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-rose-500">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 text-xs font-bold font-mono p-1">✕</button>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm"
        >
          <form onSubmit={handleSave} className="space-y-8">
            <div>
              <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-secondary" />
                Horarios de Reunión
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2 uppercase tracking-wide">
                    Horario de Reunión General Familiar (Ej. Verano/Invierno)
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-primary"
                    placeholder="Ej. Domingos a las 18:30h"
                  />
                  <p className="text-xs text-primary/40 mt-2">Este horario aparecerá en la página de Inicio y en las plantillas de los boletines semanales.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
                Opciones Adicionales
              </h2>
              <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={hideHuelvaChurchCell}
                  onChange={e => setHideHuelvaChurchCell(e.target.checked)}
                  className="mt-1 w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"
                />
                <div>
                  <span className="block text-sm font-bold text-primary">Ocultar Célula Pastoral</span>
                  <span className="block text-xs text-primary/60 mt-1 leading-relaxed">
                    Si se activa, la célula "Huelva Church" (o la célula pastoral predeterminada) no aparecerá en las listas de selección del formulario "Unirme a una Célula" ni en la configuración de "Mi Célula".
                  </span>
                </div>
              </label>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-secondary hover:text-primary transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Ajustes
              </button>
            </div>
          </form>
        </motion.div>

        {user?.email === 'huelvachurch@gmail.com' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white rounded-3xl p-8 border border-amber-200 shadow-sm text-left"
          >
            <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
              <span className="text-xl">🛠️</span>
              Modo Demo / Captura de Pantalla
            </h2>
            <p className="text-sm text-primary/70 mb-6">
              Como administrador <strong>huelvachurch@gmail.com</strong>, puedes restablecer tu vinculación a "Mi Célula" o limpiar todos los asistentes de tu célula desde esta sección de Ajustes para simular el estado inicial o realizar capturas de pantalla limpias de la interfaz.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setResetInput('');
                  setResetModalType('celula');
                }}
                disabled={resetting}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Restablecer Mi Célula de esta Cuenta
              </button>
              <button
                onClick={() => {
                  setResetInput('');
                  setResetModalType('asistentes');
                }}
                disabled={resetting}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Restablecer Asistentes de mi Célula
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {resetModalType && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
            <h3 className="text-lg font-bold font-kenao text-primary mb-2">Confirmar Restablecimiento</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {resetModalType === 'celula' 
                ? '¿Estás seguro de que deseas restablecer tu vinculación de célula? Esto le permitirá volver a seleccionar una célula desde cero en la página Mi Célula.'
                : '¿Estás seguro de que deseas eliminar todos los asistentes vinculados a tu célula? Esto los desvinculará a todos.'}
            </p>
            
            <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
              Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">RESET</span> en mayúsculas para confirmar.
            </div>
            
            <input
              type="text"
              placeholder="Escribe RESET aquí..."
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
            />
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setResetModalType(null);
                  setResetInput('');
                }}
                className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={resetInput !== 'RESET' || resetting}
                onClick={resetModalType === 'celula' ? handleResetMyCelula : handleResetAsistentes}
                className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none flex items-center justify-center gap-2"
              >
                {resetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
