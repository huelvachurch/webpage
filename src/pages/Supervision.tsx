import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, BookOpen, AlertCircle, RefreshCw, Send, Trash2, Edit3, Calendar } from 'lucide-react';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, setDoc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function Supervision() {
  const { user, roles, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState<'lideres' | 'estadisticas' | 'notificaciones'>('lideres');
  const [loading, setLoading] = useState(true);

  // States
  const [lideres, setLideres] = useState<any[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [newNotice, setNewNotice] = useState({ title: '', message: '', expiry: '' });
  
  const isSupervisor = roles.includes('supervisor');

  useEffect(() => {
    if (!isAuthReady || !user || !isSupervisor) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load leaders who chose this supervisor
        const usersQ = query(collection(db, 'users'), where('supervisorId', '==', user.uid));
        const usersSnap = await getDocs(usersQ);
        const lList = [];
        for (const u of usersSnap.docs) {
          const uData = u.data();
          if (uData.roles?.includes('lider')) {
            // Get their cell (either as leader or co-leader)
            const cellQLeader = query(collection(db, 'celulas'), where('leaderId', '==', u.id));
            const cellSnapLeader = await getDocs(cellQLeader);
            
            const cellQCoLeader = query(collection(db, 'celulas'), where('coLeaderId', '==', u.id));
            const cellSnapCoLeader = await getDocs(cellQCoLeader);
            
            let cellData = null;
            if (!cellSnapLeader.empty) {
              cellData = { id: cellSnapLeader.docs[0].id, ...cellSnapLeader.docs[0].data() };
            } else if (!cellSnapCoLeader.empty) {
              cellData = { id: cellSnapCoLeader.docs[0].id, ...cellSnapCoLeader.docs[0].data() };
            }
            
            lList.push({ id: u.id, ...uData, cell: cellData });
          }
        }
        setLideres(lList);
      } catch (err) {
        console.error("Error loading lideres in Supervision:", err);
      }

      try {
        // Load notifications
        const notiQ = query(collection(db, 'supervisor_notifications'), where('supervisorId', '==', user.uid));
        const notiSnap = await getDocs(notiQ);
        const nList: any[] = [];
        notiSnap.forEach(d => nList.push({ id: d.id, ...d.data() }));
        // simple sort
        nList.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotificaciones(nList);
        
      } catch (err) {
        console.error("Error loading notifications in Supervision:", err);
      }
      setLoading(false);
    };
    loadData();
  }, [user, isAuthReady, isSupervisor]);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const id = Date.now().toString();
      await setDoc(doc(db, 'supervisor_notifications', id), {
        supervisorId: user.uid,
        supervisorName: user.displayName || user.email,
        title: newNotice.title,
        message: newNotice.message,
        expiry: newNotice.expiry,
        createdAt: new Date().toISOString()
      });
      setNotificaciones([{
        id, supervisorId: user.uid, title: newNotice.title, message: newNotice.message, expiry: newNotice.expiry, createdAt: new Date().toISOString()
      }, ...notificaciones]);
      setNewNotice({ title: '', message: '', expiry: '' });
      alert("Notificación difundida con éxito.");
    } catch(err) {
      console.error(err);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm("¿Borrar esta notificación?")) return;
    try {
      await deleteDoc(doc(db, 'supervisor_notifications', id));
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } catch(e) {
      console.error(e);
    }
  };

  const handleRemoveLider = async (liderId: string) => {
    if (!window.confirm("¿Seguro que deseas liberar a este líder de tu supervisión? Ya no aparecerá en tu lista.")) return;
    try {
      await updateDoc(doc(db, 'users', liderId), {
        supervisorId: null
      });
      // Removing from local state
      setLideres(prev => prev.filter(l => l.id !== liderId));
      alert('El líder ha sido liberado.');
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error. Verifica tus permisos o intenta de nuevo.');
    }
  };

  if (!isAuthReady || loading) return <div className="pt-32 text-center">Cargando...</div>;
  
  if (!isSupervisor) return (
    <div className="pt-32 pb-20 text-center px-4 max-w-lg mx-auto">
      <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
      <p className="text-slate-600">No tienes rol de Supervisor.</p>
    </div>
  );

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl md:text-5xl font-kenao text-primary mb-4">Supervisión</h1>
        <p className="text-slate-600 text-lg">Área exclusiva para supervisores.</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full mb-10 gap-1">
        <button
          onClick={() => setActiveTab('lideres')}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
            activeTab === 'lideres' 
              ? 'bg-orange-100 text-orange-950 border border-orange-200' 
              : 'text-slate-500 hover:text-primary hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 shrink-0" />
          Líderes y Células
        </button>
        <button
          onClick={() => setActiveTab('estadisticas')}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
            activeTab === 'estadisticas' 
              ? 'bg-orange-100 text-orange-950 border border-orange-200' 
              : 'text-slate-500 hover:text-primary hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Estadísticas
        </button>
        <button
          onClick={() => setActiveTab('notificaciones')}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase ${
            activeTab === 'notificaciones' 
              ? 'bg-orange-100 text-orange-950 border border-orange-200' 
              : 'text-slate-500 hover:text-primary hover:bg-slate-50'
          }`}
        >
          <Send className="w-4 h-4 shrink-0" />
          Difundir Notificación
        </button>
      </div>

      <div className="max-w-4xl mx-auto">
        {activeTab === 'lideres' && (
          <div className="space-y-6">
            {lideres.length === 0 ? (
              <div className="text-center p-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold uppercase">No tienes líderes vinculados.</p>
              </div>
            ) : (
              lideres.map(lider => (
                <div key={lider.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-xl text-primary">{lider.displayName || lider.email}</h3>
                    <p className="text-slate-500 text-sm">Líder</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 items-center">
                    {lider.cell ? (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
                        <strong>Célula:</strong> {lider.cell.lugar}<br/>
                        <strong>Día:</strong> {lider.cell.diaEncuentro} - {lider.cell.horaFormateada}
                      </div>
                    ) : (
                      <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm">
                        Sin célula configurada
                      </div>
                    )}
                    <button
                      onClick={() => handleRemoveLider(lider.id)}
                      className="text-xs text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 font-bold px-4 py-2 rounded-xl transition-colors shrink-0"
                      title="Liberar líder de mi supervisión"
                    >
                      Liberar Supervisión
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'estadisticas' && (
          <div className="bg-white p-10 flex text-center rounded-3xl border border-slate-100 shadow-sm items-center justify-center">
            <div className="text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Funcionalidad de Estadísticas en desarrollo...</p>
            </div>
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-xl font-kenao text-primary mb-6">Crear Notificación a Líderes</h2>
              <form onSubmit={handlePostNotice} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Título</label>
                  <input
                    type="text"
                    required
                    value={newNotice.title}
                    onChange={e => setNewNotice({...newNotice, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Mensaje</label>
                  <textarea
                    required
                    rows={4}
                    value={newNotice.message}
                    onChange={e => setNewNotice({...newNotice, message: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500 mb-2">Fecha Vencimiento (Obligatoria)</label>
                  <input
                    type="date"
                    required
                    value={newNotice.expiry}
                    onChange={e => setNewNotice({...newNotice, expiry: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-secondary hover:text-primary transition-all flex justify-center items-center gap-2">
                  <Send className="w-5 h-5"/> Publicar Notificación
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-700">Notificaciones Difundidas</h3>
              {notificaciones.length === 0 && <p className="text-slate-500">Ninguna notificación reciente.</p>}
              {notificaciones.map(n => (
                <div key={n.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-primary text-lg">{n.title}</h4>
                    <button onClick={() => handleDeleteNotice(n.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-5 h-5"/>
                    </button>
                  </div>
                  <p className="text-slate-600 mb-4 whitespace-pre-wrap">{n.message}</p>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                    <Calendar className="w-4 h-4"/> 
                    <span>Vence: {new Date(n.expiry).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
