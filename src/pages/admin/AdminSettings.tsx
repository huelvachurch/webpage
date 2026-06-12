import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Loader2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  const { user, isAuthReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');

  const handleResetMyCelula = async () => {
    if (!user) return;
    if (!window.confirm("¿Está seguro de que desea restablecer su vinculación de célula? Esto le permitirá volver a seleccionar una célula desde cero en la página Mi Célula.")) return;
    setResetting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        celulaId: null,
        celulaStatus: null
      }, { merge: true });
      alert("¡Se ha restablecido tu vinculación de célula con éxito!");
    } catch (err) {
      console.error("Error resetting celula:", err);
      alert("No se pudo restablecer la célula.");
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
        meetingTime: meetingTime
      }, { merge: true });
      alert('Ajustes guardados correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar los ajustes.');
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
              Como administrador <strong>huelvachurch@gmail.com</strong>, puedes restablecer tu vinculación a "Mi Célula" desde esta sección de Ajustes para simular el estado inicial o realizar capturas de pantalla limpias de la interfaz.
            </p>
            <button
              onClick={handleResetMyCelula}
              disabled={resetting}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Restablecer Mi Célula de esta Cuenta
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
