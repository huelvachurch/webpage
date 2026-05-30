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
  
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');

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
      </div>
    </div>
  );
}
