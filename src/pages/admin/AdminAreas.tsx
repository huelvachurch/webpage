import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Edit2, Shield, Tag, Building2, Check, X, RefreshCw } from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';

export interface ChurchArea {
  id?: string;
  name: string;
  type: 'Servicios' | 'Ministeriales';
  initials: string;
  createdAt?: any;
}

export const DEFAULT_CHURCH_AREAS: Omit<ChurchArea, 'id'>[] = [
  { name: 'Alabanza y Adoración', type: 'Servicios', initials: 'AL' },
  { name: 'Acción Social & Caridad', type: 'Servicios', initials: 'AS' },
  { name: 'Sonido y Medios Audiovisuales', type: 'Servicios', initials: 'SM' },
  { name: 'Ujieres & Bienvenida', type: 'Servicios', initials: 'UJ' },
  { name: 'Mantenimiento e Infraestructura', type: 'Servicios', initials: 'MT' },
  { name: 'Jóvenes & Adolescentes', type: 'Ministeriales', initials: 'JV' },
  { name: 'Ministerio Infantil (Kids)', type: 'Ministeriales', initials: 'IN' },
  { name: 'Misiones & Evangelismo', type: 'Ministeriales', initials: 'MS' },
  { name: 'Docencia & Cursos', type: 'Ministeriales', initials: 'DC' },
  { name: 'Liderazgo & Redes de Células', type: 'Ministeriales', initials: 'LD' },
];

export default function AdminAreas() {
  const { user, roles, isAuthReady } = useAuth();
  const isAdmin = roles.includes('admin') || roles.includes('superadmin') || roles.includes('financiero');

  const [areas, setAreas] = useState<ChurchArea[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<'Servicios' | 'Ministeriales'>('Servicios');
  const [initials, setInitials] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter tab
  const [filterType, setFilterType] = useState<'Todos' | 'Servicios' | 'Ministeriales'>('Todos');

  useEffect(() => {
    if (!isAuthReady) return;

    const q = query(collection(db, 'areas'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, async (snap) => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ChurchArea[];
      setAreas(loaded);

      // Seed default areas if collection is completely empty
      if (loaded.length === 0 && snap.metadata.hasPendingWrites === false && isAdmin) {
        try {
          for (const area of DEFAULT_CHURCH_AREAS) {
            await addDoc(collection(db, 'areas'), {
              ...area,
              createdAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error("Error seeding default areas:", e);
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'areas');
    });

    return () => unsubscribe();
  }, [isAuthReady, isAdmin]);

  // Auto-generate initials when typing name if initials field wasn't manually edited
  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      const words = val.trim().split(/\s+/).filter(w => w.length > 0 && !['y', '&', 'de', 'e', 'el', 'la', 'los', 'las'].includes(w.toLowerCase()));
      if (words.length >= 2) {
        setInitials((words[0][0] + words[1][0]).toUpperCase());
      } else if (words.length === 1 && words[0].length >= 2) {
        setInitials(words[0].substring(0, 2).toUpperCase());
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !initials.trim()) {
      alert("Por favor completa el nombre de la área y sus iniciales.");
      return;
    }

    const cleanInitials = initials.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (!cleanInitials) {
      alert("Proporciona unas iniciales válidas de 2 o 3 caracteres.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'areas', editingId), {
          name: name.trim(),
          type: type,
          initials: cleanInitials,
          updatedAt: serverTimestamp()
        });
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'areas'), {
          name: name.trim(),
          type: type,
          initials: cleanInitials,
          createdAt: serverTimestamp()
        });
      }

      setName('');
      setInitials('');
      setType('Servicios');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'areas');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (area: ChurchArea) => {
    setEditingId(area.id || null);
    setName(area.name);
    setType(area.type);
    setInitials(area.initials);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setType('Servicios');
    setInitials('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta Área de la iglesia?")) return;
    try {
      await deleteDoc(doc(db, 'areas', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `areas/${id}`);
    }
  };

  const filteredAreas = areas.filter(a => filterType === 'Todos' || a.type === filterType);

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
        Cargando áreas de la iglesia...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-kenao text-primary">Configuración de Áreas de la Iglesia</h2>
        </div>
        <p className="text-xs text-primary/60">
          Gestiona las áreas <strong>Servicios</strong> y <strong>Ministeriales</strong> con sus iniciales. Serán utilizadas en las categorías de Finanzas, Reembolsos y Caja Chica.
        </p>
      </div>

      {/* Form Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4"
      >
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary flex items-center gap-2">
          {editingId ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-emerald-600" />}
          {editingId ? 'Editar Área' : 'Agregar Nueva Área'}
        </h3>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-primary/70 mb-1">Nombre del Área *</label>
            <input
              type="text"
              required
              placeholder="Ej: Alabanza y Adoración"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-primary/70 mb-1">Tipo de Área *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary cursor-pointer"
            >
              <option value="Servicios">Servicios</option>
              <option value="Ministeriales">Ministeriales</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-primary/70 mb-1">Iniciales (2-3 Letras) *</label>
            <input
              type="text"
              required
              maxLength={3}
              placeholder="Ej: AL"
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-center text-primary outline-none focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div className="md:col-span-2 flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Cancelar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {editingId ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Filter tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(['Todos', 'Servicios', 'Ministeriales'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterType === f ? 'bg-primary text-white shadow-sm' : 'text-primary/60 hover:text-primary'
              }`}
            >
              {f} ({areas.filter(a => f === 'Todos' || a.type === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* Table of Areas */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {filteredAreas.length === 0 ? (
          <div className="p-8 text-center text-primary/40 text-xs">
            No se encontraron áreas de la iglesia para esta categoría.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                  <th className="py-3.5 px-6">Iniciales</th>
                  <th className="py-3.5 px-6">Nombre del Área</th>
                  <th className="py-3.5 px-6">Tipo</th>
                  <th className="py-3.5 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAreas.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-black text-primary">
                      <span className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs inline-block">
                        {a.initials}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-primary">
                      {a.name}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        a.type === 'Servicios' ? 'bg-teal-100 text-teal-800' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {a.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(a)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all mr-1 cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id!)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
