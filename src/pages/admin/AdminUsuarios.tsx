import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, User as UserIcon, Mail, Calendar, Search, MoreVertical, CheckCircle, AlertCircle, Users, UserCheck, MessageSquare, GraduationCap } from 'lucide-react';
import { collection, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  roles: ('admin' | 'comunicador' | 'profesor' | 'alumno' | 'lider')[];
  status: 'pending' | 'active' | 'blocked';
  createdAt: any;
}

export default function AdminUsuarios() {
  const { user, roles: myRoles, loading, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isAdmin = myRoles.includes('admin');

  // Redirect if not authorized (Super Admin only)
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
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          ...doc.data()
        })) as UserProfile[];
        setUsers(usersData);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => unsubscribe();
    }
  }, [isAuthReady, user, isAdmin]);

  const toggleRole = async (uid: string, roleToToggle: UserProfile['roles'][number], currentRoles: UserProfile['roles']) => {
    try {
      let newRoles = [...currentRoles];
      if (newRoles.includes(roleToToggle)) {
        // Don't allow removing 'alumno' if it's the only one, or ensure at least one role?
        // Actually, roles can be multiple.
        newRoles = newRoles.filter(r => r !== roleToToggle);
      } else {
        newRoles.push(roleToToggle);
      }

      // Ensure at least 'alumno' if empty
      if (newRoles.length === 0) newRoles = ['alumno'];

      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        roles: newRoles,
        updatedAt: serverTimestamp()
      });

      // Send email notification via endpoint
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser) {
        fetch("/api/admin/notify-role-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetUser.email,
            displayName: targetUser.displayName,
            roles: newRoles,
            status: targetUser.status
          })
        }).catch(err => console.error("Error notifying role change:", err));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleStatusChange = async (uid: string, newStatus: UserProfile['status']) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Send email notification via endpoint
      const targetUser = users.find(u => u.uid === uid);
      if (targetUser) {
        fetch("/api/admin/notify-role-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetUser.email,
            displayName: targetUser.displayName,
            roles: targetUser.roles,
            status: newStatus
          })
        }).catch(err => console.error("Error notifying status change:", err));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
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
    pending: users.filter(u => u.status === 'pending').length,
  };

  if (loading || !isAuthReady) return <div className="pt-32 text-center">Cargando...</div>;

  const availableRoles: UserProfile['roles'][number][] = ['admin', 'comunicador', 'profesor', 'alumno', 'lider'];

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-kenao text-primary mb-2">Administración de Usuarios</h1>
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
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-8 py-6 text-sm font-bold text-primary/60 uppercase tracking-wider">Usuario</th>
                  <th className="px-8 py-6 text-sm font-bold text-primary/60 uppercase tracking-wider">Estado</th>
                  <th className="px-8 py-6 text-sm font-bold text-primary/60 uppercase tracking-wider">Roles (Múltiples)</th>
                  <th className="px-8 py-6 text-sm font-bold text-primary/60 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary/20">
                              <UserIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-primary">{u.displayName || 'Sin nombre'}</div>
                          <div className="text-sm text-primary/40 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusBadgeColor(u.status)}`}>
                        {u.status === 'pending' ? 'Pendiente' : u.status === 'active' ? 'Activo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-2 max-w-xs">
                        {availableRoles.map(roleName => {
                          const isAssigned = u.roles?.includes(roleName);
                          const isSuperAdmin = u.email === 'huelvachurch@gmail.com';
                          return (
                            <button
                              key={roleName}
                              onClick={() => toggleRole(u.uid, roleName, u.roles || [])}
                              disabled={isSuperAdmin && roleName === 'admin'}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                isAssigned 
                                  ? getRoleBadgeColor(roleName)
                                  : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {roleName.toUpperCase()}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {u.status === 'pending' && (
                          <button 
                            onClick={() => handleStatusChange(u.uid, 'active')}
                            className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all"
                            title="Aceptar Miembro"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}
                        {u.status === 'active' && u.email !== 'huelvachurch@gmail.com' && (
                          <button 
                            onClick={() => handleStatusChange(u.uid, 'blocked')}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"
                            title="Bloquear Usuario"
                          >
                            <AlertCircle className="w-5 h-5" />
                          </button>
                        )}
                        {u.status === 'blocked' && (
                          <button 
                            onClick={() => handleStatusChange(u.uid, 'active')}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                            title="Desbloquear Usuario"
                          >
                            <UserCheck className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="text-center py-24">
              <p className="text-primary/30 font-kenao text-2xl">No se encontraron usuarios</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
