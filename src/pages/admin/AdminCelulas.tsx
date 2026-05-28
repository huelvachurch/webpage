import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Edit2, Trash2, MapPin, Map, Check, X } from 'lucide-react';

export interface Celula {
  id: string;
  name: string;
  leader: string;
  schedule: string;
  address: string;
  googleMapsLink: string;
}

export default function AdminCelulas() {
  const [celulas, setCelulas] = useState<Celula[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Celula>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Load from local storage for now (MVP for data management)
  useEffect(() => {
    const saved = localStorage.getItem('celulas-data');
    if (saved) {
      setCelulas(JSON.parse(saved));
    } else {
      // Default data
      const initialData = [
        {
          id: '1',
          name: 'Barriada Huerto Mena',
          leader: 'Fabio',
          schedule: 'Lunes, 19:30h',
          address: 'Calle Ejemplo 123, Huelva',
          googleMapsLink: 'https://maps.app.goo.gl/xxx'
        }
      ];
      setCelulas(initialData);
      localStorage.setItem('celulas-data', JSON.stringify(initialData));
    }
  }, []);

  const saveToStorage = (data: Celula[]) => {
    setCelulas(data);
    localStorage.setItem('celulas-data', JSON.stringify(data));
  };

  const handleAdd = () => {
    setIsAdding(true);
    setEditForm({
      name: '',
      leader: '',
      schedule: '',
      address: '',
      googleMapsLink: ''
    });
  };

  const handleSaveAdd = () => {
    if (!editForm.name || !editForm.leader) return;
    const newCelula: Celula = {
      id: Date.now().toString(),
      name: editForm.name || '',
      leader: editForm.leader || '',
      schedule: editForm.schedule || '',
      address: editForm.address || '',
      googleMapsLink: editForm.googleMapsLink || ''
    };
    saveToStorage([...celulas, newCelula]);
    setIsAdding(false);
  };

  const handleEdit = (celula: Celula) => {
    setIsEditing(celula.id);
    setEditForm(celula);
  };

  const handleSaveEdit = () => {
    const updated = celulas.map(c => 
      c.id === isEditing ? { ...c, ...editForm } as Celula : c
    );
    saveToStorage(updated);
    setIsEditing(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta ubicación de célula?')) {
      const updated = celulas.filter(c => c.id !== id);
      saveToStorage(updated);
    }
  };

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-kenao text-primary mb-4">Gestión de Células</h1>
            <p className="text-lg text-primary/70">Administra las ubicaciones y datos de las células.</p>
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
                  <label className="block text-sm font-bold text-primary/70 mb-2">Nombre / Zona</label>
                  <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Barriada Huerto Mena" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Líder(es)</label>
                  <input type="text" value={editForm.leader || ''} onChange={(e) => setEditForm({...editForm, leader: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Fabio" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Día y Hora</label>
                  <input type="text" value={editForm.schedule || ''} onChange={(e) => setEditForm({...editForm, schedule: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Ej. Jueves, 20:00h" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2">Dirección Completa</label>
                  <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" placeholder="Calle, Número, Localidad" />
                </div>
                <div className="md:col-span-2">
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
              <div key={celula.id} className="p-6 border border-slate-100 rounded-2xl hover:shadow-md transition-all">
                {isEditing === celula.id ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Nombre / Zona</label>
                        <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Líder</label>
                        <input type="text" value={editForm.leader || ''} onChange={(e) => setEditForm({...editForm, leader: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Horario</label>
                        <input type="text" value={editForm.schedule || ''} onChange={(e) => setEditForm({...editForm, schedule: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Dirección</label>
                        <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-primary/70 mb-1">Google Maps URL</label>
                        <input type="url" value={editForm.googleMapsLink || ''} onChange={(e) => setEditForm({...editForm, googleMapsLink: e.target.value})} className="w-full p-2 rounded-lg border border-slate-200" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button onClick={() => setIsEditing(null)} className="p-2 rounded-lg bg-slate-100 text-primary hover:bg-slate-200"><X className="w-5 h-5" /></button>
                      <button onClick={handleSaveEdit} className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600"><Check className="w-5 h-5" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-primary mb-1">{celula.name}</h4>
                      <p className="text-primary/70 text-sm mb-2">Líder: <span className="font-semibold">{celula.leader}</span> • {celula.schedule}</p>
                      <div className="flex items-center gap-2 text-sm text-primary/60">
                        <MapPin className="w-4 h-4 text-secondary" />
                        <span>{celula.address}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      {celula.googleMapsLink && (
                        <a href={celula.googleMapsLink} target="_blank" rel="noopener noreferrer" className="p-3 bg-slate-50 text-primary rounded-xl hover:bg-secondary transition-colors" title="Ver en Maps">
                          <Map className="w-5 h-5" />
                        </a>
                      )}
                      <button onClick={() => handleEdit(celula)} className="p-3 bg-slate-50 text-primary rounded-xl hover:bg-slate-200 transition-colors" title="Editar">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(celula.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors" title="Eliminar">
                        <Trash2 className="w-5 h-5" />
                      </button>
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
