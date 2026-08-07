import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Key, ShieldCheck, Search, Check, AlertCircle, Eye, EyeOff, X,
  Landmark, Church, Wallet, Coffee, BookOpen, Receipt, SlidersHorizontal, KeyRound
} from 'lucide-react';
import { collection, doc, updateDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';

export type FinanzasPermissionKey = 'bancarios' | 'celebraciones' | 'caja_chica' | 'cafeteria' | 'libreria' | 'reembolsos';

export interface FinanzasPermissionDef {
  id: FinanzasPermissionKey;
  label: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  badgeBg: string;
  badgeText: string;
}

export const FINANZAS_PERMISSIONS_LIST: FinanzasPermissionDef[] = [
  {
    id: 'bancarios',
    label: 'Movimientos',
    description: 'Visualizar, gestionar y etiquetar los movimientos bancarios de la iglesia.',
    icon: Landmark,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50 border-teal-200',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
  },
  {
    id: 'celebraciones',
    label: 'Celebraciones',
    description: 'Registrar diezmos y ofrendas de cultos y realizar arqueos de caja.',
    icon: Church,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  {
    id: 'caja_chica',
    label: 'Caja Chica',
    description: 'Registrar egresos e ingresos en la caja chica general de la iglesia.',
    icon: Wallet,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
  },
  {
    id: 'cafeteria',
    label: 'Cafetería',
    description: 'Control de caja chica e ingresos/gastos de la cafetería.',
    icon: Coffee,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
  },
  {
    id: 'libreria',
    label: 'Librería',
    description: 'Control de caja chica e ingresos/gastos de la librería.',
    icon: BookOpen,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
  {
    id: 'reembolsos',
    label: 'Reembolsos',
    description: 'Revisión, aprobación y firma de solicitudes de reembolso.',
    icon: Receipt,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
  }
];

interface FinancialUserItem {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  roles: string[];
  status: string;
  finanzasPin?: string;
  finanzasPermissions?: string[];
}

interface MemberPermissionsDraft {
  permissions: string[];
}

export default function AdminFinanzasPermissions() {
  const { user, roles, isAuthReady } = useAuth();
  const isAdmin = roles.includes('admin') || roles.includes('superadmin');

  const [allUsers, setAllUsers] = useState<FinancialUserItem[]>([]);
  const [searchMemberTerm, setSearchMemberTerm] = useState('');

  // Drafts for permission changes: uid -> { permissions: string[] }
  const [drafts, setDrafts] = useState<Record<string, MemberPermissionsDraft>>({});
  const [isApplying, setIsApplying] = useState<Record<string, boolean>>({});

  // PIN Modal State
  const [pinModalMember, setPinModalMember] = useState<FinancialUserItem | null>(null);
  const [pinModalInput, setPinModalInput] = useState('');
  const [savingMemberPin, setSavingMemberPin] = useState(false);
  const [showPinModalInput, setShowPinModalInput] = useState(false);

  // Subscribe to all users
  useEffect(() => {
    if (isAuthReady && user && isAdmin) {
      const q = query(collection(db, 'users'));
      const unsubUsers = onSnapshot(q, (snap) => {
        const usersList = snap.docs.map(docSnap => ({
          uid: docSnap.id,
          ...docSnap.data()
        })) as FinancialUserItem[];

        usersList.sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''));

        setAllUsers(usersList);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'users');
      });
      return () => unsubUsers();
    }
  }, [isAuthReady, user, isAdmin]);

  // Filter users who are financial members (financiero, admin, superadmin)
  const financialMembers = useMemo(() => {
    return allUsers.filter(u => {
      const isFin = (u.roles || []).includes('financiero') || (u.roles || []).includes('admin') || (u.roles || []).includes('superadmin');
      if (!isFin) return false;
      if (!searchMemberTerm.trim()) return true;
      const term = searchMemberTerm.toLowerCase();
      return (u.displayName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
    });
  }, [allUsers, searchMemberTerm]);

  // Helpers for drafts
  const getActivePermissions = (u: FinancialUserItem): string[] => {
    if (drafts[u.uid] && drafts[u.uid].permissions !== undefined) {
      return drafts[u.uid].permissions;
    }
    return u.finanzasPermissions || [];
  };

  const hasDraft = (uid: string) => {
    return drafts[uid] !== undefined;
  };

  const togglePermissionDraft = (uid: string, permId: string, currentPerms: string[]) => {
    const activePerms = drafts[uid] ? [...drafts[uid].permissions] : [...(currentPerms || [])];
    let newPerms: string[];
    if (activePerms.includes(permId)) {
      newPerms = activePerms.filter(p => p !== permId);
    } else {
      newPerms = [...activePerms, permId];
    }

    setDrafts(prev => ({
      ...prev,
      [uid]: {
        permissions: newPerms
      }
    }));
  };

  const applyPermissionChanges = async (u: FinancialUserItem) => {
    const draft = drafts[u.uid];
    if (!draft) return;

    setIsApplying(prev => ({ ...prev, [u.uid]: true }));
    try {
      await updateDoc(doc(db, 'users', u.uid), {
        finanzasPermissions: draft.permissions,
        updatedAt: serverTimestamp()
      });
      setDrafts(prev => {
        const next = { ...prev };
        delete next[u.uid];
        return next;
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${u.uid}`);
    } finally {
      setIsApplying(prev => ({ ...prev, [u.uid]: false }));
    }
  };

  const discardPermissionChanges = (uid: string) => {
    setDrafts(prev => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  // PIN modal handlers
  const handleOpenMemberPinModal = (u: FinancialUserItem) => {
    setPinModalMember(u);
    setPinModalInput(u.finanzasPin || '');
    setShowPinModalInput(false);
  };

  const handleSaveMemberPin = async () => {
    if (!pinModalMember) return;
    if (pinModalInput.trim().length < 4) {
      alert("El código PIN debe tener al menos 4 caracteres o números.");
      return;
    }
    setSavingMemberPin(true);
    try {
      await updateDoc(doc(db, 'users', pinModalMember.uid), {
        finanzasPin: pinModalInput.trim(),
        updatedAt: serverTimestamp()
      });
      alert(`Código PIN guardado correctamente para ${pinModalMember.displayName || pinModalMember.email}.`);
      setPinModalMember(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${pinModalMember.uid}`);
    } finally {
      setSavingMemberPin(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'superadmin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'financiero': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-kenao text-primary">Permisos Financieros y Seguridad</h2>
          <p className="text-xs text-primary/60 max-w-2xl">
            Asigna o quita los permisos de las secciones de tesorería haciendo clic directamente en cada módulo. Aplica o descarta los cambios pendientes cuando termines.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchMemberTerm}
            onChange={(e) => setSearchMemberTerm(e.target.value)}
            placeholder="Buscar miembro financiero..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Financial Members Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-kenao text-lg text-primary">Financieros</h3>
          </div>
          <span className="text-xs text-primary/50">
            Haz clic sobre un permiso para asignarlo o desasignarlo.
          </span>
        </div>

        {financialMembers.length === 0 ? (
          <div className="p-12 text-center text-primary/40 font-medium">
            No se encontraron miembros financieros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                  <th className="py-4 px-6">MIEMBRO</th>
                  <th className="py-4 px-6">PERMISOS FINANCIEROS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {financialMembers.map((m) => {
                  const draftActive = hasDraft(m.uid);
                  const activePerms = getActivePermissions(m);
                  const hasPinConfigured = Boolean(m.finanzasPin && m.finanzasPin.trim().length > 0);

                  return (
                    <tr
                      key={m.uid}
                      className={`transition-colors ${
                        draftActive ? 'bg-amber-50/40 border-l-4 border-amber-400' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Member Info + Badges & PIN Button under display name */}
                      <td className="py-4 px-6 align-top">
                        <div className="flex items-start gap-3">
                          {m.photoURL ? (
                            <img src={m.photoURL} alt={m.displayName} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                              {(m.displayName || m.email || 'U').substring(0, 2)}
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary block text-sm">{m.displayName || 'Usuario sin nombre'}</span>
                              {draftActive && (
                                <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                  Sin guardar
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-primary/60 block font-mono">{m.email}</span>

                            {/* PIN Button under username */}
                            <div className="pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenMemberPinModal(m)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  hasPinConfigured
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                }`}
                                title="Configurar PIN de Ingreso a Finanzas"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-600" />
                                <span>{hasPinConfigured ? '✓ PIN Configurado (Cambiar)' : 'Configurar PIN'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Interactive Permissions Buttons */}
                      <td className="py-4 px-6 align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5 max-w-lg">
                            {FINANZAS_PERMISSIONS_LIST.map((pDef) => {
                              const isGranted = activePerms.includes(pDef.id);
                              const IconComponent = pDef.icon;

                              return (
                                <button
                                  key={pDef.id}
                                  type="button"
                                  onClick={() => togglePermissionDraft(m.uid, pDef.id, m.finanzasPermissions || [])}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isGranted
                                      ? `${pDef.bgColor} ${pDef.badgeText} shadow-2xs font-extrabold ring-1 ring-slate-300`
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600 opacity-60'
                                  }`}
                                  title={`Haz clic para ${isGranted ? 'desasignar' : 'asignar'} ${pDef.label}`}
                                >
                                  <IconComponent className="w-3.5 h-3.5" />
                                  <span>{pDef.label}</span>
                                  {isGranted && <Check className="w-3 h-3 stroke-[3] ml-0.5 text-emerald-600" />}
                                </button>
                              );
                            })}
                          </div>

                          {/* Pending Changes Banner (Aplicar / Descartar) */}
                          {draftActive && (
                            <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 animate-fadeIn">
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                                Cambios pendientes:
                              </span>
                              <button
                                onClick={() => applyPermissionChanges(m)}
                                disabled={isApplying[m.uid]}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-50 transition-all flex items-center gap-1"
                              >
                                {isApplying[m.uid] ? 'Guardando...' : 'Aplicar'}
                              </button>
                              <button
                                onClick={() => discardPermissionChanges(m.uid)}
                                disabled={isApplying[m.uid]}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer transition-all"
                              >
                                Descartar
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PIN Configuration Modal */}
      <AnimatePresence>
        {pinModalMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-600" />
                  <h3 className="text-xl font-kenao text-primary">Configurar PIN Financiero</h3>
                </div>
                <button
                  onClick={() => setPinModalMember(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                  Estás configurando el código PIN para <strong>{pinModalMember.displayName || pinModalMember.email}</strong>. Este PIN es requerido para desbloquear la sesión del portal de Finanzas.
                </div>

                <div>
                  <label className="text-xs font-bold text-primary block mb-1.5">
                    Código PIN (Mínimo 4 caracteres/números)
                  </label>
                  <div className="relative">
                    <input
                      type={showPinModalInput ? 'text' : 'password'}
                      value={pinModalInput}
                      onChange={(e) => setPinModalInput(e.target.value)}
                      placeholder="Ej: 1234"
                      maxLength={8}
                      className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 px-4 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-bold text-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinModalInput(!showPinModalInput)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                    >
                      {showPinModalInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPinModalMember(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMemberPin}
                    disabled={savingMemberPin}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingMemberPin ? 'Guardando...' : 'Guardar PIN'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
