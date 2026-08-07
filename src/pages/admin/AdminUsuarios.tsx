import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, User as UserIcon, Mail, Calendar, Search, MoreVertical, CheckCircle, AlertCircle, Users, UserCheck, MessageSquare, GraduationCap, Key, Lock, Unlock, Eye, EyeOff, X } from 'lucide-react';
import { collection, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  roles: ('admin' | 'comunicador' | 'profesor' | 'alumno' | 'lider' | 'supervisor' | 'maestro' | 'financiero')[];
  status: 'pending' | 'active' | 'blocked';
  createdAt: any;
  requestedAlumnoRole?: boolean;
  finanzasPin?: string;
}

export default function AdminUsuarios() {
  const { user, roles: myRoles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isSuperAdmin = user?.email?.toLowerCase().trim() === 'huelvachurch@gmail.com';
  const isAdmin = isSuperAdmin || myRoles.includes('admin') || myRoles.includes('superadmin');

  // Redirect if not authorized
  useEffect(() => {
    if (isAuthReady && !loading) {
      if (!user || !isAdmin) {
        navigate('/');
      }
    }
  }, [user, isAdmin, loading, isAuthReady, navigate]);

  // Fetch users
  useEffect(() => {
    if (isAuthReady && user && isAdmin) {
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            ...data
          } as UserProfile;
        });

        // Sort in memory by createdAt desc (or displayName if missing)
        usersData.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
          return timeB - timeA;
        });

        setUsers(usersData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, user, isAdmin]);

  // Local drafts for accumulated changes (so we don't spam emails on single button presses)
  interface UserDraft {
    roles?: ('admin' | 'comunicador' | 'profesor' | 'alumno' | 'lider' | 'supervisor' | 'maestro' | 'financiero')[];
    status?: 'pending' | 'active' | 'blocked';
  }
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [isApplying, setIsApplying] = useState<Record<string, boolean>>({});

  // PIN Modal State for Financiero role
  const [pinModalUser, setPinModalUser] = useState<UserProfile | null>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinSaving, setPinSaving] = useState<boolean>(false);
  const [showPinInModal, setShowPinInModal] = useState<boolean>(false);

  const openPinModal = (u: UserProfile) => {
    setPinModalUser(u);
    setPinInput(u.finanzasPin || '');
    setShowPinInModal(false);
  };

  const handleSavePin = async () => {
    if (!pinModalUser) return;
    if (pinInput.trim().length < 4) {
      alert("El código PIN debe tener al menos 4 números o caracteres.");
      return;
    }
    setPinSaving(true);
    try {
      await updateDoc(doc(db, 'users', pinModalUser.uid), {
        finanzasPin: pinInput.trim(),
        updatedAt: serverTimestamp()
      });
      alert(`PIN configurado correctamente para ${pinModalUser.displayName || pinModalUser.email}.`);
      setPinModalUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${pinModalUser.uid}`);
    } finally {
      setPinSaving(false);
    }
  };

  const getUserRoles = (u: UserProfile) => {
    if (drafts[u.uid] && drafts[u.uid].roles !== undefined) {
      return drafts[u.uid].roles!;
    }
    return u.roles || [];
  };

  const getUserStatus = (u: UserProfile) => {
    if (drafts[u.uid] && drafts[u.uid].status !== undefined) {
      return drafts[u.uid].status!;
    }
    return u.status;
  };

  const hasDraft = (uid: string) => {
    return drafts[uid] !== undefined;
  };

  const toggleRoleDraft = (uid: string, roleToToggle: UserProfile['roles'][number], currentRoles: UserProfile['roles']) => {
    const userDraft = drafts[uid] || {};
    let draftRoles = userDraft.roles !== undefined ? [...userDraft.roles] : [...currentRoles];
    
    if (draftRoles.includes(roleToToggle)) {
      draftRoles = draftRoles.filter(r => r !== roleToToggle);
    } else {
      draftRoles.push(roleToToggle);
    }
    
    setDrafts(prev => ({
      ...prev,
      [uid]: {
        ...userDraft,
        roles: draftRoles
      }
    }));
  };

  const handleStatusChangeDraft = (uid: string, newStatus: UserProfile['status']) => {
    const userDraft = drafts[uid] || {};
    setDrafts(prev => ({
      ...prev,
      [uid]: {
        ...userDraft,
        status: newStatus
      }
    }));
  };

  const applyChanges = async (u: UserProfile) => {
    const draft = drafts[u.uid];
    if (!draft) return;

    setIsApplying(prev => ({ ...prev, [u.uid]: true }));
    try {
      const finalRoles = draft.roles !== undefined ? draft.roles : (u.roles || []);
      const finalStatus = draft.status !== undefined ? draft.status : u.status;
      const hadLiderRole = (u.roles || []).includes('lider');
      const hasLiderRole = finalRoles.includes('lider');

      const userRef = doc(db, 'users', u.uid);
      const updates: any = {
        roles: finalRoles,
        status: finalStatus,
        updatedAt: serverTimestamp()
      };
      await updateDoc(userRef, updates);

      // --- NEW LIDER ROLE REMOVAL LOGIC ---
      if (hadLiderRole && !hasLiderRole) {
        // 1. Check if they were a Co-Leader in any cell and remove them
        const coLeaderQuery = query(collection(db, 'celulas'), where('coLeaderId', '==', u.uid));
        const coLeaderDocs = await getDocs(coLeaderQuery);
        for (const cellDoc of coLeaderDocs.docs) {
          await updateDoc(doc(db, 'celulas', cellDoc.id), {
            coLeaderId: null,
            coLeaderName: null,
            coLeaderEmail: null,
            coLeaderInvitationStatus: null
          });
        }
        
        // 2. Check if they had pending invitations as Co-Leader and remove them
        const inviteeQuery = query(collection(db, 'celulas'), where('coLeaderInviteeId', '==', u.uid));
        const inviteeDocs = await getDocs(inviteeQuery);
        for (const cellDoc of inviteeDocs.docs) {
          await updateDoc(doc(db, 'celulas', cellDoc.id), {
            coLeaderInviteeId: null,
            coLeaderInviteeName: null,
            coLeaderInviteeEmail: null,
            coLeaderInvitationStatus: null
          });
        }

        // 3. Check if they were the Main Leader of any cell
        const leaderQuery = query(collection(db, 'celulas'), where('leaderId', '==', u.uid));
        const leaderDocs = await getDocs(leaderQuery);
        for (const cellDoc of leaderDocs.docs) {
          const cellData = cellDoc.data();
          if (cellData.coLeaderId) {
            // Promote Co-Leader to Main Leader
            await updateDoc(doc(db, 'celulas', cellDoc.id), {
              leaderId: cellData.coLeaderId,
              leaderName: cellData.coLeaderName,
              coLeaderId: null,
              coLeaderName: null,
              coLeaderEmail: null,
              coLeaderInvitationStatus: null
            });
          } else {
            // No Co-Leader. Delete the cell.
            const cellId = cellDoc.id;
            await deleteDoc(doc(db, 'celulas', cellId));
            
            // Also nullify celulaId for members of this vanished cell
            const usersEnCelulaQuery = query(collection(db, 'users'), where('celulaId', '==', cellId));
            const usersEnCelulaDocs = await getDocs(usersEnCelulaQuery);
            for (const userDoc of usersEnCelulaDocs.docs) {
              await updateDoc(doc(db, 'users', userDoc.id), {
                celulaId: null,
                celulaStatus: null
              });
            }
          }
        }
      }
      // --- END LIDER ROLE REMOVAL LOGIC ---

      // Send a single combined email notification through the endpoint
      await fetch("/api/admin/notify-role-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: u.email,
          displayName: u.displayName,
          roles: finalRoles,
          status: finalStatus
        })
      });

      // Clear draft for this user
      setDrafts(prev => {
        const next = { ...prev };
        delete next[u.uid];
        return next;
      });

    } catch (error) {
      console.error("Error committing role/status changes:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${u.uid}`);
    } finally {
      setIsApplying(prev => ({ ...prev, [u.uid]: false }));
    }
  };

  const discardChanges = (uid: string) => {
    setDrafts(prev => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.roles?.includes(roleFilter as any);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-600 border-red-200';
      case 'comunicador': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'profesor': return 'bg-purple-100 text-purple-600 border-purple-200';
      case 'alumno': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'lider': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'supervisor': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'maestro': return 'bg-pink-100 text-pink-600 border-pink-200';
      case 'financiero': return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-600';
      case 'pending': return 'bg-amber-100 text-amber-600';
      case 'blocked': return 'bg-red-100 text-red-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.roles?.includes('admin')).length,
    comunicadores: users.filter(u => u.roles?.includes('comunicador')).length,
    profesores: users.filter(u => u.roles?.includes('profesor')).length,
    alumnos: users.filter(u => u.roles?.includes('alumno')).length,
    lideres: users.filter(u => u.roles?.includes('lider')).length,
    maestros: users.filter(u => u.roles?.includes('maestro')).length,
    financieros: users.filter(u => u.roles?.includes('financiero')).length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  const availableRoles: UserProfile['roles'][number][] = ['admin', 'comunicador', 'profesor', 'alumno', 'lider', 'supervisor', 'maestro', 'financiero'];

  return (
    <div className="">
      <div className="">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-kenao text-primary mb-2">Usuarios</h2>
            <p className="text-primary/60">Gestiona los miembros, acepta solicitudes y asigna roles independientes</p>
          </div>
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-700 font-medium">
              {stats.pending} solicitudes pendientes de aprobación
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-primary/40 mb-4">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Total</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.admins}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Admins</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.comunicadores}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Comms</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
              <GraduationCap className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.profesores}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Profes</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <UserCheck className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.alumnos}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Alumnos</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 mb-4">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.lideres}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Líderes</p>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-primary/70 mb-4">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.pending}</p>
            <p className="text-xs text-primary/40 uppercase tracking-widest font-bold">Pendientes</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-6 rounded-3xl shadow-sm mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-secondary outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-6 py-3 rounded-xl border border-slate-100 text-primary/60 outline-none focus:ring-2 focus:ring-secondary appearance-none bg-white"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">Cualquier rol</option>
            <option value="admin">Administradores</option>
            <option value="comunicador">Comunicadores</option>
            <option value="profesor">Profesores</option>
            <option value="alumno">Alumnos</option>
            <option value="lider">Líderes</option>
            <option value="supervisor">Supervisores</option>
            <option value="maestro">Maestros</option>
            <option value="financiero">Financieros</option>
          </select>
          <select 
            className="px-6 py-3 rounded-xl border border-slate-100 text-primary/60 outline-none focus:ring-2 focus:ring-secondary appearance-none bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Cualquier estado</option>
            <option value="pending">Pendientes</option>
            <option value="active">Activos</option>
            <option value="blocked">Bloqueados</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl sm:rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed sm:table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-2 sm:px-8 py-3 sm:py-6 text-[11px] sm:text-sm font-bold text-primary/60 uppercase tracking-wider w-[28%] sm:w-auto">Usuario</th>
                  <th className="px-2 sm:px-8 py-3 sm:py-6 text-[11px] sm:text-sm font-bold text-primary/60 uppercase tracking-wider w-[72%] sm:w-auto">Roles y Accesos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const draftActive = hasDraft(u.uid);
                  const activeRoles = getUserRoles(u);
                  const activeStatus = getUserStatus(u);
                  return (
                    <tr key={u.uid} className={`transition-all ${draftActive ? 'bg-amber-50/40 border-l-4 border-amber-400 hover:bg-amber-50/60' : 'hover:bg-slate-50/50'}`}>
                      {/* Column 1: User Info + Status + Status Button + Active Roles */}
                      <td className="px-2 sm:px-8 py-3 sm:py-6 align-top min-w-0">
                        <div className="flex flex-col sm:flex-row items-start gap-1.5 sm:gap-4 min-w-0">
                          <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-primary/20">
                                <UserIcon className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1 w-full">
                            <div className="font-bold text-[11px] sm:text-base text-primary flex flex-wrap items-center gap-1 sm:gap-2 min-w-0 leading-tight">
                              <span className="truncate max-w-[80px] xs:max-w-[120px] sm:max-w-none" title={u.displayName || 'Sin nombre'}>
                                {u.displayName || 'Sin nombre'}
                              </span>
                              {draftActive && (
                                <span className="text-[7px] sm:text-[9px] font-bold bg-amber-100 text-amber-700 px-1 py-0.2 rounded-full uppercase tracking-wider animate-pulse shrink-0">Borrador</span>
                              )}
                              {u.requestedAlumnoRole && !activeRoles.includes('alumno') && (
                                <span className="text-[7px] sm:text-[9px] font-black bg-blue-50 text-blue-700 px-1 py-0.2 rounded-full uppercase tracking-wider animate-pulse border border-blue-200 shrink-0">Solicitó Alumno</span>
                              )}
                            </div>
                            <div className="text-[9px] sm:text-sm text-primary/40 flex items-center gap-0.5 font-mono break-all leading-tight">
                              <Mail className="w-2 h-2 sm:w-3 sm:h-3 shrink-0 hidden xs:inline" />
                              <span className="break-all">{u.email}</span>
                            </div>

                            {/* Status Badge & Status Action Button UNDER Name */}
                            <div className="pt-0.5 flex flex-wrap items-center gap-1 sm:gap-2">
                              <span className={`px-1.5 py-0.5 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-wider ${getStatusBadgeColor(activeStatus)}`}>
                                {activeStatus === 'pending' ? 'Pendiente' : activeStatus === 'active' ? 'Activo' : 'Bloqueado'}
                              </span>

                              {activeStatus === 'pending' && (
                                <button
                                  onClick={() => handleStatusChangeDraft(u.uid, 'active')}
                                  className="px-1 py-0.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Aceptar Miembro (Borrador)"
                                >
                                  <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Aceptar
                                </button>
                              )}
                              {activeStatus === 'active' && u.email !== 'huelvachurch@gmail.com' && (
                                <button
                                  onClick={() => handleStatusChangeDraft(u.uid, 'blocked')}
                                  className="px-1 py-0.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Bloquear Usuario (Borrador)"
                                >
                                  <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Bloquear
                                </button>
                              )}
                              {activeStatus === 'blocked' && (
                                <button
                                  onClick={() => handleStatusChangeDraft(u.uid, 'active')}
                                  className="px-1 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[7px] sm:text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-0.5"
                                  title="Desbloquear Usuario (Borrador)"
                                >
                                  <UserCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Desbloquear
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Interactive Role Toggles, Extra Actions, & Pending Changes Draft Bar */}
                      <td className="px-2 sm:px-8 py-3 sm:py-6 align-top">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex flex-wrap gap-1 sm:gap-1.5 max-w-lg">
                            {availableRoles.map(roleName => {
                              const isAssigned = activeRoles.includes(roleName);
                              const isSuperAdmin = u.email === 'huelvachurch@gmail.com';
                              return (
                                <button
                                  key={roleName}
                                  onClick={() => toggleRoleDraft(u.uid, roleName, u.roles || [])}
                                  disabled={isSuperAdmin && roleName === 'admin'}
                                  className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-bold border transition-all cursor-pointer ${
                                    isAssigned 
                                      ? getRoleBadgeColor(roleName) + ' font-black shadow-2xs'
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {roleName.toUpperCase()}
                                </button>
                              );
                            })}
                          </div>

                          {u.requestedAlumnoRole && !activeRoles.includes('alumno') && (
                            <div>
                              <button 
                                onClick={() => {
                                  if (!activeRoles.includes('alumno')) {
                                    toggleRoleDraft(u.uid, 'alumno', u.roles || []);
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                                title="Aprobar Solicitud de Alumno"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Aprobar Alumno
                              </button>
                            </div>
                          )}

                          {(activeRoles.includes('financiero') || activeRoles.includes('admin')) && (
                            <div>
                              <button
                                onClick={() => openPinModal(u)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                  u.finanzasPin 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 animate-pulse'
                                }`}
                                title="Configurar PIN de Ingreso a Finanzas"
                              >
                                <Key className="w-3.5 h-3.5 text-teal-600" />
                                {u.finanzasPin ? `PIN: ${'•'.repeat(u.finanzasPin.length)} (Configurado)` : 'Configurar PIN Finanzas'}
                              </button>
                            </div>
                          )}

                          {/* Cambios Pendientes Bar (Aplicar / Descartar) */}
                          {draftActive && (
                            <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 animate-fadeIn">
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                                Cambios pendientes:
                              </span>
                              <button
                                onClick={() => applyChanges(u)}
                                disabled={isApplying[u.uid]}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shadow-xs disabled:opacity-50 transition-all flex items-center gap-1"
                              >
                                {isApplying[u.uid] ? 'Guardando...' : 'Aplicar'}
                              </button>
                              <button
                                onClick={() => discardChanges(u.uid)}
                                disabled={isApplying[u.uid]}
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
          {filteredUsers.length === 0 && (
            <div className="text-center py-24">
              <p className="text-primary/30 font-kenao text-2xl">No se encontraron usuarios</p>
            </div>
          )}
        </div>

        {/* Modal Configurar PIN */}
        <AnimatePresence>
          {pinModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-700">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-primary">PIN de Ingreso a Finanzas</h3>
                      <p className="text-xs text-primary/60">{pinModalUser.displayName || pinModalUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPinModalUser(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-primary/70 leading-relaxed">
                  Establece un código PIN personal (4 a 6 dígitos o caracteres) para que este miembro con rol Financiero pueda ingresar al módulo de Finanzas.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-primary/50 tracking-wider">Código PIN</label>
                  <div className="relative">
                    <input
                      type={showPinInModal ? 'text' : 'password'}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Ej: 1234"
                      maxLength={8}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinInModal(!showPinInModal)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPinInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    onClick={() => setPinModalUser(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSavePin}
                    disabled={pinSaving}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {pinSaving ? 'Guardando...' : 'Guardar PIN'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
