import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, MapPin, Map, Check, X } from 'lucide-react';
import { collection, addDoc, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';

export interface Celula {
  id: string;
  name: string;
  leader: string;
  schedule: string;
  address: string;
  googleMapsLink: string;
  leaderId?: string;
  barriada?: string;
  ciudad?: string;
}

export default function AdminCelulas() {
  const { user, roles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Celula>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAdmin = roles.includes('admin') || roles.includes('superadmin');

  // Redirect if not authorized
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, loading, isAuthReady, navigate]);

  // Load from Firestore
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'celulas'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Celula[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ 
          id: doc.id, 
          name: data.name || '',
          leader: data.leader || '',
          schedule: data.schedule || '',
          address: data.address || '',
          googleMapsLink: data.googleMapsLink || '',
          leaderId: data.leaderId || '',
          barriada: data.barriada || '',
          ciudad: data.ciudad || ''
        });
      });
      setCelulas(list);
    });
    return () => unsubscribe();
  }, []);

  const handleAdd = () => {
    setIsAdding(true);
    setEditForm({
      name: '',
      leader: '',
      schedule: '',
      address: '',
      googleMapsLink: '',
      leaderId: '',
      barriada: '',
      ciudad: 'Huelva'
    });
  };

  const handleSaveAdd = async () => {
    if (!editForm.name || !editForm.leader) return;
    try {
      const celulaData = {
        leaderId: editForm.leaderId || 'admin',
        leader: editForm.leader || '',
        name: editForm.name || '',
        address: editForm.address || '',
        barriada: editForm.barriada || '',
        ciudad: editForm.ciudad || 'Huelva',
        schedule: editForm.schedule || '',
        googleMapsLink: editForm.googleMapsLink || ''
      };
      await addDoc(collection(db, 'celulas'), celulaData);
      setIsAdding(false);
    } catch (err) {
      console.error("Error adding cell destination", err);
      alert("Error al guardar la nueva célula en Firestore.");
    }
  };

  const handleEdit = (celula: Celula) => {
    setIsEditing(celula.id);
    setEditForm(celula);
  };

  const handleSaveEdit = async () => {
    if (!isEditing) return;
    try {
      const celulaDoc = doc(db, 'celulas', isEditing);
      const celulaData = {
        leaderId: editForm.leaderId || 'admin',
        leader: editForm.leader || '',
        name: editForm.name || '',
        address: editForm.address || '',
        barriada: editForm.barriada || '',
        ciudad: editForm.ciudad || 'Huelva',
        schedule: editForm.schedule || '',
        googleMapsLink: editForm.googleMapsLink || ''
      };
      await setDoc(celulaDoc, celulaData);
      setIsEditing(null);
    } catch (err) {
      console.error("Error editing celula in Firestore:", err);
      alert("Error al guardar los cambios de la célula en Firestore.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta ubicación de célula?')) {
      try {
        await deleteDoc(doc(db, 'celulas', id));
      } catch (err) {
        console.error("Error deleting celula from Firestore:", err);
        alert("Error al eliminar la célula.");
      }
    }
  };

  return (
    <div className="">
      <div className="">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-kenao text-primary mb-2 font-bold">Células</h2>
            <p className="text-primary/70">Administra las ubicaciones y datos de las células en tiempo real.</p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="bg-secondary text-primary font-bold py-3 px-6 rounded-xl hover:bg-[#c2a30b] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Nueva Célula
          </button>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
          {(isAdding) && (
            <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
              <h3 className="font-kenao text-2xl text-primary mb-6">Agregar Nueva Célula</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Nombre / Identificador de la Célula</label>
                  <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Célula del Centro / Célula de Juan" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Líder(es)</label>
                  <input type="text" value={editForm.leader || ''} onChange={(e) => setEditForm({...editForm, leader: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Fabio" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Día y Hora (Horario)</label>
                  <input type="text" value={editForm.schedule || ''} onChange={(e) => setEditForm({...editForm, schedule: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Jueves, 20:00h" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Calle Principal (Dirección)</label>
                  <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Calle Concepción 14" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Barriada / Zona</label>
                  <input type="text" value={editForm.barriada || ''} onChange={(e) => setEditForm({...editForm, barriada: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Huerto Mena" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Ciudad</label>
                  <input type="text" value={editForm.ciudad || ''} onChange={(e) => setEditForm({...editForm, ciudad: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Huelva" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">UID Opcional del Líder (para que pueda editarlo)</label>
                  <input type="text" value={editForm.leaderId || ''} onChange={(e) => setEditForm({...editForm, leaderId: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="ID de Usuario de Firebase" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Enlace de Google Maps</label>
                  <input type="url" value={editForm.googleMapsLink || ''} onChange={(e) => setEditForm({...editForm, googleMapsLink: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="https://maps.app.goo.gl/..." />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl bg-slate-200 text-primary font-bold hover:bg-slate-300">Cancelar</button>
                <button onClick={handleSaveAdd} className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90">Guardar</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {celulas.length === 0 && !isAdding && (
              <p className="text-primary/50 text-center py-8">No hay células registradas. Agrega una nueva.</p>
            )}
            
            {celulas.map((celula) => (
              <div key={celula.id} className="p-6 border border-slate-100 rounded-2xl hover:shadow-md transition-all bg-white">
                {isEditing === celula.id ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Nombre de Célula</label>
                        <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Líderes</label>
                        <input type="text" value={editForm.leader || ''} onChange={(e) => setEditForm({...editForm, leader: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Horario / Día y Hora</label>
                        <input type="text" value={editForm.schedule || ''} onChange={(e) => setEditForm({...editForm, schedule: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Calle Principal</label>
                        <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Barriada</label>
                        <input type="text" value={editForm.barriada || ''} onChange={(e) => setEditForm({...editForm, barriada: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Ciudad</label>
                        <input type="text" value={editForm.ciudad || ''} onChange={(e) => setEditForm({...editForm, ciudad: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">UID del Líder</label>
                        <input type="text" value={editForm.leaderId || ''} onChange={(e) => setEditForm({...editForm, leaderId: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Google Maps URL</label>
                        <input type="url" value={editForm.googleMapsLink || ''} onChange={(e) => setEditForm({...editForm, googleMapsLink: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setIsEditing(null)} className="p-2 rounded-lg bg-slate-100 text-primary hover:bg-slate-200 text-sm font-bold flex items-center gap-1 px-4 py-2"><X className="w-5 h-5" /> Cancelar</button>
                      <button onClick={handleSaveEdit} className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm font-bold flex items-center gap-1 px-4 py-2"><Check className="w-5 h-5" /> Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-primary mb-1">{celula.name}</h4>
                      <p className="text-primary/70 text-sm mb-2">Líder: <span className="font-semibold">{celula.leader}</span> • {celula.schedule}</p>
                      <div className="flex items-center gap-2 text-sm text-primary/60">
                        <MapPin className="w-4 h-4 text-secondary" />
                        <span>{celula.address}{celula.barriada ? `, ${celula.barriada}` : ''}{celula.ciudad ? `, ${celula.ciudad}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto items-center">
                      {deleteConfirmId === celula.id ? (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-150 p-2 rounded-xl">
                          <span className="text-[11px] font-bold text-red-600 px-1 animate-pulse">¿Seguro?</span>
                          <button 
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, 'celulas', celula.id));
                                setDeleteConfirmId(null);
                              } catch (err) {
                                console.error("Error deleting celula from Firestore:", err);
                                alert("Error al eliminar la célula.");
                              }
                            }} 
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer shadow-sm transition-colors"
                          >
                            Sí, Borrar
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(null)} 
                            className="bg-white border border-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs cursor-pointer shadow-sm hover:bg-slate-50 transition-all"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          {celula.googleMapsLink && (
                            <a href={celula.googleMapsLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 text-primary rounded-xl hover:bg-secondary transition-colors" title="Ver en Maps">
                              <Map className="w-5 h-5" />
                            </a>
                          )}
                          <button onClick={() => handleEdit(celula)} className="p-3 bg-slate-50 text-primary rounded-xl hover:bg-slate-200 transition-colors" title="Editar">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(celula.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Eliminar">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
