import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, Filter, 
  Calendar, Edit2, Trash2, Download, FileText, Check, X, 
  ArrowUpRight, ArrowDownRight, ShieldAlert, CreditCard, Tag, 
  RefreshCw, ChevronDown, Lock, Banknote, Coins, Upload, Settings, 
  DollarSign, Landmark, CheckCircle2, AlertCircle, HelpCircle,
  Receipt, PenTool, ExternalLink, Copy, UserCheck, Key, Eye, EyeOff, Sparkles,
  Columns, Bot, Send, MessageSquare, SlidersHorizontal, Church, Coffee, BookOpen, Users, ShieldCheck,
  HardDrive, Paperclip
} from 'lucide-react';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { CajaChicaModule } from '../../components/finanzas/CajaChicaModule';
import { DEFAULT_CHURCH_AREAS } from './AdminAreas';

// Types Definitions
export interface ChurchArea {
  id?: string;
  name: string;
  initials: string;
  type: 'Servicio' | 'Ministerial';
}

export interface Reembolso {
  id?: string;
  code: string;
  createdByUid: string;
  createdByName: string;
  createdByEmail: string;
  createdByPhone?: string;
  date: string;
  areaId: string;
  areaName: string;
  areaInitials: string;
  concept: string;
  amount: number;
  paymentMethod: 'Efectivo' | 'Transferencia Bancaria';
  iban?: string;
  receiptUrl?: string;
  attachments?: { id?: string; fileId?: string; name: string; url: string; webViewLink?: string; mimeType?: string }[];
  notes?: string;
  status: 'pendiente' | 'incompleto' | 'completado';
  signatures: { uid: string; name: string; email: string; signedAt: string }[];
  createdAt?: any;
}
export interface BankMovement {
  id?: string;
  date: string; // YYYY-MM-DD
  concept: string;
  beneficiary?: string; // Beneficiario / Ordenante
  notes?: string;
  amount: number; // positive for ingreso, negative for egreso
  balance?: number;
  categoryId?: string;
  categoryName?: string;
  status: 'pendiente' | 'etiquetado';
  createdAt?: any;
}

export interface TagCategory {
  id?: string;
  name: string;
  type: 'ingreso' | 'egreso';
  createdAt?: any;
}

export interface CelebrationIncome {
  id?: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: 'Efectivo' | 'Datafono' | 'Cheque';
  destination: 'Diezmo' | 'Ofrenda' | 'Misiones' | 'Campaña' | 'Evento' | 'Curso' | 'Otro';
  notes?: string;
  registeredByUid?: string;
  registeredByName?: string;
  createdAt?: any;
}

export interface ArqueoCaja {
  id?: string;
  module?: 'celebraciones' | 'caja_chica' | 'cafeteria' | 'libreria';
  date: string; // YYYY-MM-DD
  totalEfectivo: number;
  expectedBalance?: number;
  diferencia?: number;
  sobreBilletes?: number;
  bolsaMonedas?: number;
  cajaChica?: number;
  notes?: string;
  registeredByUid?: string;
  registeredByName?: string;
  createdAt?: any;
}

export interface CajaChicaMovement {
  id?: string;
  date: string; // YYYY-MM-DD
  type: 'ingreso' | 'egreso';
  category: string;
  concept: string;
  amount: number;
  notes?: string;
  registeredByUid?: string;
  registeredByName?: string;
  createdAt?: any;
}

// Official categories configuration for Ingresos & Egresos
const DEFAULT_CATEGORIES: { name: string; type: 'ingreso' | 'egreso' }[] = [
  // Ingresos
  { name: 'SOBRE', type: 'ingreso' },
  { name: 'DATA', type: 'ingreso' },
  { name: 'DIEZMO', type: 'ingreso' },
  { name: 'OFRENDA', type: 'ingreso' },
  { name: 'MISIONES', type: 'ingreso' },
  { name: 'CAMPAÑA', type: 'ingreso' },
  // Egresos
  { name: 'ALQUILER', type: 'egreso' },
  { name: 'LUZ', type: 'egreso' },
  { name: 'AGUA', type: 'egreso' },
  { name: 'CULLIGAN', type: 'egreso' },
  { name: 'INTERNET', type: 'egreso' },
  { name: 'MOVIL', type: 'egreso' },
  { name: 'COMUNIDAD', type: 'egreso' },
  { name: 'ASCENSOR', type: 'egreso' },
  { name: 'MANTENIMIENTO', type: 'egreso' },
  { name: 'CAFETERIA', type: 'egreso' },
  { name: 'NOMINA', type: 'egreso' },
  { name: 'SEGURIDAD SOCIAL', type: 'egreso' },
  { name: 'SEGUROS', type: 'egreso' },
  { name: 'BANCA', type: 'egreso' },
  { name: 'DATAFONO', type: 'egreso' },
  { name: 'AIBAE', type: 'egreso' },
  { name: 'UEBE', type: 'egreso' },
  { name: 'FEREDE', type: 'egreso' },
  { name: 'LIBRERIA', type: 'egreso' },
];

/**
 * AI Auto-Tagging Rules Engine
 * Evaluates concept, notes, and amount (>0 / <0) against financial patterns.
 */
export function autoTagMovement(concept: string, notes: string = '', amount: number, beneficiary: string = ''): string | null {
  const c = (concept || '').toUpperCase();
  const n = (notes || '').toUpperCase();
  const b = (beneficiary || '').toUpperCase();
  const text = `${c} ${n} ${b}`;

  // INGRESOS (entradas de dinero, amount > 0)
  if (amount > 0) {
    if (n.includes('SOBRE') || c.includes('INGRESO EN EFECTIVO') || c.includes('ABONO POR CHEQUE')) {
      return 'SOBRE';
    }
    if (c.includes('LIQUIDACION REMESA DE COMERCIOS') || c.includes('REMESAS DE COMERCIOS') || text.includes('COMERC') || text.includes('DATAFONO')) {
      return 'DATA';
    }
    if (text.includes('CAMPAÑA') || text.includes('CAMPANA') || (c.includes('BIZUM') && (text.includes('CAMPAÑA') || text.includes('CAMPANA')))) {
      return 'CAMPAÑA';
    }
    if (text.includes('EURO MISIONERO') || text.includes('MISIONES')) {
      return 'MISIONES';
    }
    if (text.includes('OFRENDA') || text.includes('DONACION') || text.includes('FIN DE AÑO') || text.includes('FIN DE ANO')) {
      return 'OFRENDA';
    }
    if (text.includes('DIEZMO')) {
      return 'DIEZMO';
    }
    if (c.includes('TRANSFERENCIA') || c.includes('INGRESO')) {
      if (text.includes('DIEZMO')) return 'DIEZMO';
      if (text.includes('OFRENDA')) return 'OFRENDA';
      if (text.includes('MISIONES')) return 'MISIONES';
      if (text.includes('CAMPAÑA') || text.includes('CAMPANA')) return 'CAMPAÑA';
    }
    if (text.includes('DIEZMO')) return 'DIEZMO';
    if (text.includes('OFRENDA')) return 'OFRENDA';
    if (text.includes('MISIONES')) return 'MISIONES';
    if (text.includes('SOBRE')) return 'SOBRE';
    if (text.includes('DATA')) return 'DATA';
    if (text.includes('CAMPAÑA') || text.includes('CAMPANA')) return 'CAMPAÑA';
    return null;
  }

  // EGRESOS (salidas de dinero, amount < 0)
  if (amount < 0) {
    if (text.includes('CEOIN') || text.includes('ALQUILER')) return 'ALQUILER';
    if (text.includes('REPSOL') || text.includes('ELECTRICIDAD')) return 'LUZ';
    if (text.includes('EMAHSA') || text.includes('AGUAS DE HUELVA')) return 'AGUA';
    if (text.includes('CULLIGAN')) return 'CULLIGAN';
    if (text.includes('VODAFONE') || text.includes('INTERNET') || text.includes('FIBRA')) return 'INTERNET';
    if (text.includes('SIMYO') || text.includes('DIGI') || text.includes('MOVIL') || text.includes('MÓVIL')) return 'MOVIL';
    if (text.includes('COMUNIDAD DE PROPIETARIOS') || text.includes('ADEUDO DE COMUNIDAD') || text.includes('COMUNIDAD')) return 'COMUNIDAD';
    if (text.includes('FAIN') || text.includes('ASCENSOR')) return 'ASCENSOR';
    if (text.includes('OBRA') || text.includes('REPARACION') || text.includes('REPARACIÓN') || text.includes('MANTENIMIENTO') || text.includes('MATERIALES')) return 'MANTENIMIENTO';
    if (text.includes('CAFETERIA') || text.includes('CAFETERÍA')) return 'CAFETERIA';
    if (text.includes('NOMINA') || text.includes('NÓMINA') || text.includes('PAGO DE NOMINAS')) return 'NOMINA';
    if (text.includes('SEGURIDAD SOCIAL') || text.includes('TGSS') || text.includes('CUOTAS DE LA SEGURIDAD')) return 'SEGURIDAD SOCIAL';
    if (text.includes('SANTA LUCIA') || text.includes('SANTALUCIA') || text.includes('SANTA LUCÍA')) return 'SEGUROS';
    if (text.includes('CUOTA BONO') || text.includes('LIQUIDACION REMESAS DE TARJETAS') || text.includes('TPV') || text.includes('DATAFONO')) return 'DATAFONO';
    if (text.includes('COMISION') || text.includes('COMISIÓN') || text.includes('INTERESES') || text.includes('GASTO BANCARIO') || text.includes('MANTENIMIENTO TARJETA') || text.includes('IMPUESTO') || text.includes('TRIBUTO') || text.includes('LIQUIDACION DE INTERESES')) return 'BANCA';
    if (text.includes('ASOCIACION IGLESIAS BAUTISTAS') || text.includes('BAUTISTAS DEL SUR') || text.includes('AIBAE')) return 'AIBAE';
    if (text.includes('UEBE')) return 'UEBE';
    if (text.includes('FEREDE')) return 'FEREDE';
    if (text.includes('LIBRERIA') || text.includes('LIBRERÍA') || text.includes('LIBROS')) return 'LIBRERIA';

    return null;
  }

  return null;
}

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
    label: 'Caja Chica Celebraciones',
    description: 'Control de caja chica, ingresos, egresos y arqueos de Celebraciones.',
    icon: Church,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  {
    id: 'cafeteria',
    label: 'Caja Chica Cafetería',
    description: 'Control de caja chica, ingresos, egresos y arqueos de la Cafetería.',
    icon: Coffee,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
  },
  {
    id: 'libreria',
    label: 'Caja Chica Librería',
    description: 'Control de caja chica, ingresos, egresos y arqueos de la Librería.',
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

export default function AdminFinanzas() {
  const { user, roles, loading, isAuthReady, finanzasPermissions: contextPermissions } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = roles.includes('superadmin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isFinanciero = roles.includes('financiero') || isAdmin;

  // Realtime user permissions
  const [myFinanzasPermissions, setMyFinanzasPermissions] = useState<string[]>(contextPermissions || []);

  const hasPermission = (permId: string): boolean => {
    if (isAdmin) return true;
    return myFinanzasPermissions.includes(permId);
  };

  const allowedTabs = useMemo(() => {
    const allTabs: Array<'bancarios' | 'celebraciones' | 'cafeteria' | 'libreria' | 'reembolsos'> = [
      'bancarios', 'celebraciones', 'cafeteria', 'libreria', 'reembolsos'
    ];
    if (isAdmin) {
      return [...allTabs, 'permisos'] as Array<'bancarios' | 'celebraciones' | 'caja_chica' | 'cafeteria' | 'libreria' | 'reembolsos' | 'permisos'>;
    }
    return allTabs.filter(tab => hasPermission(tab) || hasPermission('caja_chica'));
  }, [isAdmin, myFinanzasPermissions]);

  // Active top tab state
  const [activeTab, setActiveTab] = useState<'bancarios' | 'celebraciones' | 'caja_chica' | 'cafeteria' | 'libreria' | 'reembolsos' | 'permisos'>('bancarios');

  // Auto switch active tab if not allowed
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  // Sub-tab state for Cajas Chicas & Celebraciones
  const [celebracionesSubTab, setCelebracionesSubTab] = useState<'caja_chica' | 'movimientos' | 'ingresos' | 'egresos' | 'arqueos'>('caja_chica');
  const [showArqueosInIngresos, setShowArqueosInIngresos] = useState(false);
  const [celebCajaYearFilter, setCelebCajaYearFilter] = useState<string>('all');
  const [celebCajaMonthFilter, setCelebCajaMonthFilter] = useState<string>('all');
  const [celebMovTypeFilter, setCelebMovTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [celebMovSearch, setCelebMovSearch] = useState<string>('');
  const [cafeteriaSubTab, setCafeteriaSubTab] = useState<'caja_chica' | 'movimientos' | 'ingresos' | 'egresos' | 'arqueos'>('caja_chica');
  const [showCafeteriaArqueosInIngresos, setShowCafeteriaArqueosInIngresos] = useState(false);
  const [cafeteriaCajaYearFilter, setCafeteriaCajaYearFilter] = useState<string>('all');
  const [cafeteriaCajaMonthFilter, setCafeteriaCajaMonthFilter] = useState<string>('all');
  const [cafeteriaMovTypeFilter, setCafeteriaMovTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [cafeteriaMovSearch, setCafeteriaMovSearch] = useState<string>('');

  const [libreriaSubTab, setLibreriaSubTab] = useState<'caja_chica' | 'movimientos' | 'ingresos' | 'egresos' | 'arqueos'>('caja_chica');
  const [showLibreriaArqueosInIngresos, setShowLibreriaArqueosInIngresos] = useState(false);
  const [libreriaCajaYearFilter, setLibreriaCajaYearFilter] = useState<string>('all');
  const [libreriaCajaMonthFilter, setLibreriaCajaMonthFilter] = useState<string>('all');
  const [libreriaMovTypeFilter, setLibreriaMovTypeFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [libreriaMovSearch, setLibreriaMovSearch] = useState<string>('');
  const [cajaChicaSubTab, setCajaChicaSubTab] = useState<'movimientos' | 'arqueos'>('movimientos');

  // Arqueo Form States for Caja Chica
  const [cajaArqueoDate, setCajaArqueoDate] = useState(new Date().toISOString().split('T')[0]);
  const [cajaArqueoBilletes, setCajaArqueoBilletes] = useState('');
  const [cajaArqueoMonedas, setCajaArqueoMonedas] = useState('');
  const [cajaArqueoNotes, setCajaArqueoNotes] = useState('');
  const [savingCajaArqueo, setSavingCajaArqueo] = useState(false);

  // Arqueo Form States for Cafetería
  const [cafeteriaArqueoDate, setCafeteriaArqueoDate] = useState(new Date().toISOString().split('T')[0]);
  const [cafeteriaArqueoBilletes, setCafeteriaArqueoBilletes] = useState('');
  const [cafeteriaArqueoMonedas, setCafeteriaArqueoMonedas] = useState('');
  const [cafeteriaArqueoNotes, setCafeteriaArqueoNotes] = useState('');
  const [savingCafeteriaArqueo, setSavingCafeteriaArqueo] = useState(false);

  // Arqueo Form States for Librería
  const [libreriaArqueoDate, setLibreriaArqueoDate] = useState(new Date().toISOString().split('T')[0]);
  const [libreriaArqueoBilletes, setLibreriaArqueoBilletes] = useState('');
  const [libreriaArqueoMonedas, setLibreriaArqueoMonedas] = useState('');
  const [libreriaArqueoNotes, setLibreriaArqueoNotes] = useState('');
  const [savingLibreriaArqueo, setSavingLibreriaArqueo] = useState(false);

  // Firestore collections states
  const [bankMovements, setBankMovements] = useState<BankMovement[]>([]);
  const [tags, setTags] = useState<TagCategory[]>([]);
  const [celebrationIncomes, setCelebrationIncomes] = useState<CelebrationIncome[]>([]);
  const [arqueos, setArqueos] = useState<ArqueoCaja[]>([]);
  const [cajaChicaMovements, setCajaChicaMovements] = useState<CajaChicaMovement[]>([]);
  const [cafeteriaMovements, setCafeteriaMovements] = useState<CajaChicaMovement[]>([]);
  const [libreriaMovements, setLibreriaMovements] = useState<CajaChicaMovement[]>([]);
  const [reembolsos, setReembolsos] = useState<Reembolso[]>([]);
  const [churchAreas, setChurchAreas] = useState<ChurchArea[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // CSV file import ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingCSV, setImportingCSV] = useState(false);

  // Bank Table Column Visibility
  const [visibleCols, setVisibleCols] = useState<{ [key: string]: boolean }>({
    date: true,
    concept: true,
    beneficiary: true,
    notes: true,
    amount: true,
    balance: true,
    category: true,
    actions: true,
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // AI Chat Correction Modal state
  const [aiChatMovement, setAiChatMovement] = useState<BankMovement | null>(null);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; time?: string }>>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Bank Movement Selection State for Bulk Delete & AI Chat
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [bankMovementToDelete, setBankMovementToDelete] = useState<BankMovement | null>(null);

  // Generic Movement Delete Modal State
  const [genericItemToDelete, setGenericItemToDelete] = useState<{
    id?: string;
    ids?: string[];
    title: string;
    description: string;
    collection: string;
    secondCollection?: string;
  } | null>(null);

  const confirmDeleteGenericItem = async () => {
    if (!genericItemToDelete) return;
    const { id, ids, collection: col1, secondCollection: col2 } = genericItemToDelete;
    try {
      if (ids && ids.length > 0) {
        await Promise.all(ids.map(docId => deleteDoc(doc(db, col1, docId)).catch(() => {})));
        if (col2) {
          await Promise.all(ids.map(docId => deleteDoc(doc(db, col2, docId)).catch(() => {})));
        }
        if (col1 === 'finanzas_bancarios') {
          setSelectedBankIds([]);
        }
      } else if (id) {
        await deleteDoc(doc(db, col1, id)).catch(() => {});
        if (col2) {
          await deleteDoc(doc(db, col2, id)).catch(() => {});
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${col1}/${id || 'bulk'}`);
    } finally {
      setGenericItemToDelete(null);
    }
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredBankMovements.map(m => m.id!).filter(Boolean);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedBankIds.includes(id));

    if (isAllSelected) {
      setSelectedBankIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedBankIds, ...allFilteredIds]));
      setSelectedBankIds(combined);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedBankIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDeleteSelectedBankMovements = async () => {
    if (selectedBankIds.length === 0) return;
    const count = selectedBankIds.length;
    setGenericItemToDelete({
      ids: selectedBankIds,
      title: 'Eliminar Movimientos Seleccionados',
      description: `¿Estás seguro de que deseas eliminar los ${count} movimientos bancarios seleccionados? Esta acción no se puede deshacer.`,
      collection: 'finanzas_bancarios'
    });
  };

  // Helper to determine tag type (ingreso = green, egreso = red)
  const getTagType = (tagName?: string, amount: number = 0): 'ingreso' | 'egreso' => {
    if (!tagName || tagName === 'none') return amount >= 0 ? 'ingreso' : 'egreso';
    const tagObj = tags.find(t => t.name.toUpperCase() === tagName.toUpperCase());
    if (tagObj) return tagObj.type;
    const def = DEFAULT_CATEGORIES.find(d => d.name.toUpperCase() === tagName.toUpperCase());
    if (def) return def.type;
    return amount >= 0 ? 'ingreso' : 'egreso';
  };

  const handleOpenAiChat = (m: BankMovement) => {
    setAiChatMovement(m);
    setAiChatInput('');
    const currentTag = m.categoryName ? `[${m.categoryName}]` : 'Sin Etiquetar';
    setAiChatMessages([
      {
        sender: 'ai',
        text: `¡Hola! Soy tu Asistente de Etiquetado IA.\n\nEste movimiento es de ${m.amount >= 0 ? 'INGRESO (+)' : 'EGRESO (-)'} por ${Math.abs(m.amount).toFixed(2)} €.\n• Concepto: "${m.concept}"\n• Beneficiario/Ordenante: "${m.beneficiary || 'No especificado'}"\n• Estado actual: ${currentTag}.\n\n¿A qué etiqueta oficial deseas asignarlo o qué regla te gustaría aplicar?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleApplyAiTag = async (tagName: string) => {
    if (!aiChatMovement || !aiChatMovement.id) return;
    try {
      await updateDoc(doc(db, 'finanzas_bancarios', aiChatMovement.id), {
        categoryName: tagName,
        status: 'etiquetado'
      });
      setAiChatMovement(prev => prev ? ({ ...prev, categoryName: tagName, status: 'etiquetado' }) : null);
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setAiChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: ` Etiqueta [${tagName}] asignada correctamente al movimiento en la base de datos.`,
          time: timeNow
        }
      ]);
    } catch (err: any) {
      alert(`Error al guardar etiqueta: ${err?.message || err}`);
    }
  };

  const handleSendAiChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiChatInput.trim() || !aiChatMovement || !aiChatMovement.id) return;

    const userText = aiChatInput.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setAiChatMessages(prev => [...prev, { sender: 'user', text: userText, time: timeNow }]);
    setAiChatInput('');
    setIsAiProcessing(true);

    setTimeout(async () => {
      try {
        const upperUserText = userText.toUpperCase();
        let matchedTag: string | null = null;

        for (const cat of DEFAULT_CATEGORIES) {
          if (upperUserText.includes(cat.name.toUpperCase())) {
            matchedTag = cat.name;
            break;
          }
        }

        if (!matchedTag) {
          if (upperUserText.includes('SUELDO') || upperUserText.includes('NOMINA') || upperUserText.includes('SALARIO')) matchedTag = 'NOMINA';
          else if (upperUserText.includes('LUZ') || upperUserText.includes('ELECTRIC') || upperUserText.includes('REPSOL')) matchedTag = 'LUZ';
          else if (upperUserText.includes('AGUA') || upperUserText.includes('EMAHSA')) matchedTag = 'AGUA';
          else if (upperUserText.includes('ALQUILER') || upperUserText.includes('ARRIENDO') || upperUserText.includes('CEOIN')) matchedTag = 'ALQUILER';
          else if (upperUserText.includes('DIEZMO')) matchedTag = 'DIEZMO';
          else if (upperUserText.includes('OFRENDA')) matchedTag = 'OFRENDA';
          else if (upperUserText.includes('MISION') || upperUserText.includes('MISIONES')) matchedTag = 'MISIONES';
          else if (upperUserText.includes('SOBRE') || upperUserText.includes('EFECTIVO')) matchedTag = 'SOBRE';
          else if (upperUserText.includes('DATA') || upperUserText.includes('DATAFONO') || upperUserText.includes('TARJETA') || upperUserText.includes('TPV')) matchedTag = 'DATAFONO';
          else if (upperUserText.includes('SEGURIDAD SOCIAL') || upperUserText.includes('TGSS')) matchedTag = 'SEGURIDAD SOCIAL';
          else if (upperUserText.includes('SEGURO') || upperUserText.includes('SANTA LUCIA')) matchedTag = 'SEGUROS';
          else if (upperUserText.includes('COMISION') || upperUserText.includes('INTERES') || upperUserText.includes('BANCO') || upperUserText.includes('BANCA')) matchedTag = 'BANCA';
          else if (upperUserText.includes('COMUNIDAD')) matchedTag = 'COMUNIDAD';
          else if (upperUserText.includes('ASCENSOR') || upperUserText.includes('FAIN')) matchedTag = 'ASCENSOR';
          else if (upperUserText.includes('MANTENIMIENTO') || upperUserText.includes('OBRA') || upperUserText.includes('REPARACION')) matchedTag = 'MANTENIMIENTO';
          else if (upperUserText.includes('CAFETERIA')) matchedTag = 'CAFETERIA';
          else if (upperUserText.includes('AIBAE')) matchedTag = 'AIBAE';
          else if (upperUserText.includes('UEBE')) matchedTag = 'UEBE';
          else if (upperUserText.includes('FEREDE')) matchedTag = 'FEREDE';
          else if (upperUserText.includes('LIBRERIA') || upperUserText.includes('LIBRO')) matchedTag = 'LIBRERIA';
          else if (upperUserText.includes('CAMPAÑA') || upperUserText.includes('CAMPANA')) matchedTag = 'CAMPAÑA';
          else if (upperUserText.includes('CULLIGAN')) matchedTag = 'CULLIGAN';
          else if (upperUserText.includes('INTERNET') || upperUserText.includes('VODAFONE')) matchedTag = 'INTERNET';
          else if (upperUserText.includes('MOVIL') || upperUserText.includes('MÓVIL') || upperUserText.includes('SIMYO') || upperUserText.includes('DIGI')) matchedTag = 'MOVIL';
        }

        if (matchedTag) {
          await updateDoc(doc(db, 'finanzas_bancarios', aiChatMovement.id!), {
            categoryName: matchedTag,
            status: 'etiquetado'
          });

          setAiChatMovement(prev => prev ? ({ ...prev, categoryName: matchedTag, status: 'etiquetado' }) : null);

          setAiChatMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: ` Entendido. He asignado la etiqueta [${matchedTag}] a este movimiento en la base de datos.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } else {
          setAiChatMessages(prev => [
            ...prev,
            {
              sender: 'ai',
              text: `No logré asociar "${userText}" con una etiqueta oficial.\n\nPuedes escribir una palabra clave (ej: LUZ, NOMINA, DIEZMO) o hacer clic en uno de los botones inferiores.`,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (err: any) {
        setAiChatMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `Ocurrió un error al guardar: ${err?.message || err}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } finally {
        setIsAiProcessing(false);
      }
    }, 300);
  };

  // -------------------------------------------------------------
  // SECURITY PIN & INACTIVITY AUTO-LOCK ENGINE
  // -------------------------------------------------------------
  const [userFinanzasPin, setUserFinanzasPin] = useState<string | null>(null);
  const [isPinUnlocked, setIsPinUnlocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      return sessionStorage.getItem('finanzas_unlocked_' + user.uid) === 'true';
    }
    return false;
  });
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showEnteredPin, setShowEnteredPin] = useState<boolean>(false);
  const [wasLockedDueToInactivity, setWasLockedDueToInactivity] = useState<boolean>(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Listen to user profile for live finanzasPin and finanzasPermissions updates
  useEffect(() => {
    if (user?.uid) {
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserFinanzasPin(data.finanzasPin || null);
          setMyFinanzasPermissions(data.finanzasPermissions || []);
        }
      });
      return () => unsubUser();
    }
  }, [user?.uid]);

  // -------------------------------------------------------------
  // PERMISSIONS & FINANCIAL MEMBERS MANAGEMENT STATE (Admin only)
  // -------------------------------------------------------------
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

  const [allUsers, setAllUsers] = useState<FinancialUserItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<FinancialUserItem | null>(null);
  const [memberDraftPermissions, setMemberDraftPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [searchMemberTerm, setSearchMemberTerm] = useState('');

  // PIN modal state for financial member management
  const [pinModalMember, setPinModalMember] = useState<FinancialUserItem | null>(null);
  const [pinModalInput, setPinModalInput] = useState('');
  const [savingMemberPin, setSavingMemberPin] = useState(false);
  const [showPinModalInput, setShowPinModalInput] = useState(false);

  // Realtime subscription to all users for Admin
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

  // Filter financial members
  const financialMembers = useMemo(() => {
    return allUsers.filter(u => {
      const isFin = (u.roles || []).includes('financiero') || (u.roles || []).includes('admin') || (u.roles || []).includes('superadmin');
      if (!isFin) return false;
      if (!searchMemberTerm.trim()) return true;
      const term = searchMemberTerm.toLowerCase();
      return (u.displayName || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
    });
  }, [allUsers, searchMemberTerm]);

  const handleSelectMemberForPermissions = (u: FinancialUserItem) => {
    setSelectedMember(u);
    setMemberDraftPermissions(u.finanzasPermissions || []);
  };

  const handleToggleMemberPermission = (permId: string) => {
    setMemberDraftPermissions(prev =>
      prev.includes(permId) ? prev.filter(p => p !== permId) : [...prev, permId]
    );
  };

  const handleSaveMemberPermissions = async () => {
    if (!selectedMember) return;
    setSavingPermissions(true);
    try {
      await updateDoc(doc(db, 'users', selectedMember.uid), {
        finanzasPermissions: memberDraftPermissions,
        updatedAt: serverTimestamp()
      });
      alert(`Permisos actualizados correctamente para ${selectedMember.displayName || selectedMember.email}.`);
      setSelectedMember(prev => prev ? ({ ...prev, finanzasPermissions: memberDraftPermissions }) : null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${selectedMember.uid}`);
    } finally {
      setSavingPermissions(false);
    }
  };

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

  // Sync unlock state if user changes
  useEffect(() => {
    if (user?.uid) {
      const isUnlocked = sessionStorage.getItem('finanzas_unlocked_' + user.uid) === 'true';
      setIsPinUnlocked(isUnlocked);
    }
  }, [user?.uid]);

  // Inactivity detection (Auto-lock after 5 minutes of no activity)
  useEffect(() => {
    if (!isPinUnlocked) return;

    const handleUserActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    const interval = setInterval(() => {
      const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        handleLockFinanzas(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(interval);
    };
  }, [isPinUnlocked, lastActivity]);

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const expectedPin = userFinanzasPin || (isAdmin ? '1234' : null);

    if (!expectedPin) {
      setPinError("Tu usuario no tiene un PIN configurado. Solicita a Administración que te configure un PIN en Usuarios.");
      return;
    }

    if (enteredPin.trim() === expectedPin) {
      setIsPinUnlocked(true);
      setWasLockedDueToInactivity(false);
      setEnteredPin('');
      setPinError('');
      if (user?.uid) {
        sessionStorage.setItem('finanzas_unlocked_' + user.uid, 'true');
      }
    } else {
      setPinError("Código PIN incorrecto. Por favor verifícalo.");
    }
  };

  const handleLockFinanzas = (dueToInactivity = false) => {
    setIsPinUnlocked(false);
    setEnteredPin('');
    setPinError('');
    if (dueToInactivity) {
      setWasLockedDueToInactivity(true);
    }
    if (user?.uid) {
      sessionStorage.removeItem('finanzas_unlocked_' + user.uid);
    }
  };

  // -------------------------------------------------------------
  // FIRESTORE REALTIME SUBSCRIPTIONS
  // -------------------------------------------------------------
  useEffect(() => {
    if (isAuthReady && user && isFinanciero) {
      setDataLoading(true);

      // 1. Bank movements
      const qBank = query(collection(db, 'finanzas_bancarios'), orderBy('date', 'desc'));
      const unsubBank = onSnapshot(qBank, (snap) => {
        setBankMovements(snap.docs.map(d => ({ id: d.id, ...d.data() })) as BankMovement[]);
      });

      // 2. Tags & Categories
      const qTags = query(collection(db, 'finanzas_etiquetas'), orderBy('name', 'asc'));
      const unsubTags = onSnapshot(qTags, async (snap) => {
        const loadedTags = snap.docs.map(d => ({ id: d.id, ...d.data() })) as TagCategory[];
        setTags(loadedTags);

        // Seed default categories if empty
        if (loadedTags.length === 0 && snap.metadata.hasPendingWrites === false) {
          for (const cat of DEFAULT_CATEGORIES) {
            await addDoc(collection(db, 'finanzas_etiquetas'), { ...cat, createdAt: serverTimestamp() });
          }
        }
      });

      // 3. Celebration Incomes
      const qCeleb = query(collection(db, 'finanzas_celebraciones'), orderBy('date', 'desc'));
      const unsubCeleb = onSnapshot(qCeleb, (snap) => {
        setCelebrationIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CelebrationIncome[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'finanzas_celebraciones');
      });

      // 4. Arqueos de Caja
      const qArqueo = query(collection(db, 'finanzas_arqueos'), orderBy('date', 'desc'));
      const unsubArqueo = onSnapshot(qArqueo, (snap) => {
        setArqueos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ArqueoCaja[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'finanzas_arqueos');
      });

      // 5. Caja Chica
      const qCaja = query(collection(db, 'finanzas_caja_chica'), orderBy('date', 'desc'));
      const unsubCaja = onSnapshot(qCaja, (snap) => {
        setCajaChicaMovements(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CajaChicaMovement[]);
        setDataLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'finanzas_caja_chica');
      });

      // 5b. Cafetería
      const qCafeteria = query(collection(db, 'finanzas_cafeteria'), orderBy('date', 'desc'));
      const unsubCafeteria = onSnapshot(qCafeteria, (snap) => {
        setCafeteriaMovements(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CajaChicaMovement[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'finanzas_cafeteria');
      });

      // 5c. Librería
      const qLibreria = query(collection(db, 'finanzas_libreria'), orderBy('date', 'desc'));
      const unsubLibreria = onSnapshot(qLibreria, (snap) => {
        setLibreriaMovements(snap.docs.map(d => ({ id: d.id, ...d.data() })) as CajaChicaMovement[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'finanzas_libreria');
      });

      // 6. Reembolsos
      const qReembolsos = query(collection(db, 'reembolsos'), orderBy('createdAt', 'desc'));
      const unsubReembolsos = onSnapshot(qReembolsos, (snap) => {
        setReembolsos(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Reembolso[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'reembolsos');
      });

      // 7. Church Areas
      const qAreas = query(collection(db, 'areas'), orderBy('name', 'asc'));
      const unsubAreas = onSnapshot(qAreas, (snap) => {
        setChurchAreas(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ChurchArea[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, 'areas');
      });

      return () => {
        unsubBank();
        unsubTags();
        unsubCeleb();
        unsubArqueo();
        unsubCaja();
        unsubCafeteria();
        unsubLibreria();
        unsubReembolsos();
        unsubAreas();
      };
    }
  }, [isAuthReady, user, isFinanciero]);

  // =============================================================
  // 1. MOVIMIENTOS BANCARIOS LOGIC
  // =============================================================
  const [bankSearch, setBankSearch] = useState('');
  const [bankStatusFilter, setBankStatusFilter] = useState<'all' | 'pendiente' | 'etiquetado'>('all');
  const [bankMonthFilter, setBankMonthFilter] = useState<string>('all');
  const [bankYearFilter, setBankYearFilter] = useState<string>('all');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<'ingreso' | 'egreso'>('egreso');
  const [tagModalFilter, setTagModalFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');

  // Helper to extract year and month (1-12) from date string
  const getMovementDateParts = (dateStr?: string): { year: number | null; month: number | null } => {
    if (!dateStr) return { year: null, month: null };
    const clean = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
      const parts = clean.split('-');
      return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
      }
      if (parts[2].length === 4) {
        return { year: parseInt(parts[2], 10), month: parseInt(parts[1], 10) };
      }
    }
    return { year: null, month: null };
  };

  // Compute available years from bankMovements
  const availableBankYears = useMemo(() => {
    const yearsSet = new Set<number>();
    bankMovements.forEach(m => {
      const { year } = getMovementDateParts(m.date);
      if (year && year > 2000 && year < 2100) {
        yearsSet.add(year);
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [bankMovements]);

  // Spanish month names mapping
  const MONTH_NAMES: Record<number, string> = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
  };

  // Compute available months present in bankMovements
  const availableBankMonths = useMemo(() => {
    const monthsSet = new Set<number>();
    bankMovements.forEach(m => {
      const { year, month } = getMovementDateParts(m.date);
      if (month && month >= 1 && month <= 12) {
        if (bankYearFilter === 'all' || (year && year === parseInt(bankYearFilter, 10))) {
          monthsSet.add(month);
        }
      }
    });
    return Array.from(monthsSet).sort((a, b) => a - b);
  }, [bankMovements, bankYearFilter]);

  const filteredBankMovements = useMemo(() => {
    return bankMovements.filter(m => {
      if (bankStatusFilter === 'pendiente' && m.status !== 'pendiente') return false;
      if (bankStatusFilter === 'etiquetado' && m.status !== 'etiquetado') return false;

      if (bankMonthFilter !== 'all' || bankYearFilter !== 'all') {
        const { year, month } = getMovementDateParts(m.date);
        if (bankMonthFilter !== 'all' && month !== parseInt(bankMonthFilter, 10)) return false;
        if (bankYearFilter !== 'all' && year !== parseInt(bankYearFilter, 10)) return false;
      }

      if (bankSearch.trim()) {
        const term = bankSearch.toLowerCase();
        const matchConcept = m.concept.toLowerCase().includes(term);
        const matchObs = m.notes?.toLowerCase().includes(term);
        const matchCat = m.categoryName?.toLowerCase().includes(term);
        const matchBen = m.beneficiary?.toLowerCase().includes(term);
        if (!matchConcept && !matchObs && !matchCat && !matchBen) return false;
      }
      return true;
    });
  }, [bankMovements, bankStatusFilter, bankMonthFilter, bankYearFilter, bankSearch]);

  // CSV Bank Import Handler with Smart Parsing & Auto-Column Mapping
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImportingCSV(true);
    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text || !text.trim()) {
          alert("El archivo CSV está vacío.");
          setImportingCSV(false);
          return;
        }

        // Clean lines
        const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
        if (lines.length < 1) {
          alert("El archivo CSV no contiene filas válidas.");
          setImportingCSV(false);
          return;
        }

        // Helper: detect delimiter (; , or tab \t)
        const sampleHeader = lines[0];
        let delimiter = ';';
        if ((sampleHeader.match(/;/g) || []).length >= (sampleHeader.match(/,/g) || []).length) {
          delimiter = ';';
        } else if ((sampleHeader.match(/\t/g) || []).length > (sampleHeader.match(/,/g) || []).length) {
          delimiter = '\t';
        } else if ((sampleHeader.match(/,/g) || []).length > 0) {
          delimiter = ',';
        }

        // Helper: split CSV row safely respecting quotes
        const parseRow = (line: string): string[] => {
          const res: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' || ch === "'") {
              inQuotes = !inQuotes;
            } else if (ch === delimiter && !inQuotes) {
              res.push(current.trim());
              current = '';
            } else {
              current += ch;
            }
          }
          res.push(current.trim());
          return res.map(val => val.replace(/^["']|["']$/g, '').trim());
        };

        // Helper: Parse Spanish & English numbers (e.g. -1.250,50 -> -1250.50 or 150.00 or -150,00)
        const parseNum = (val: string): number => {
          if (!val) return 0;
          let clean = val.replace(/[€$EUR\s]/gi, '').trim();
          if (!clean) return 0;

          if (clean.includes('.') && clean.includes(',')) {
            if (clean.indexOf('.') < clean.indexOf(',')) {
              clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
              clean = clean.replace(/,/g, '');
            }
          } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
          }
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        // Helper: Parse dates (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD)
        const parseDate = (val: string): string | null => {
          if (!val) return null;
          const clean = val.trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

          const parts = clean.split(/[\/\-\.]/);
          if (parts.length === 3) {
            const p0 = parts[0].padStart(2, '0');
            const p1 = parts[1].padStart(2, '0');
            const p2 = parts[2];
            if (p2.length === 4) {
              return `${p2}-${p1}-${p0}`; // DD/MM/YYYY
            }
            if (parts[0].length === 4) {
              return `${parts[0]}-${p1}-${parts[2].padStart(2, '0')}`; // YYYY/MM/DD
            }
          }
          const d = new Date(clean);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
          return null;
        };

        // Inspect header or metadata rows to find column indices
        let headerRowIdx = -1;
        let dateCol = -1;
        let conceptCol = -1;
        let beneficiaryCol = -1;
        let notesCol = -1;
        let amountCol = -1;
        let balanceCol = -1;

        for (let i = 0; i < Math.min(lines.length, 10); i++) {
          const cells = parseRow(lines[i]).map(c => c.toLowerCase());
          const hasDateKey = cells.some(c => c.includes('fecha') || c.includes('date'));
          const hasConceptKey = cells.some(c => c.includes('concepto') || c.includes('descrip') || c.includes('detalle') || c.includes('leyenda') || c.includes('operacion'));
          const hasAmountKey = cells.some(c => c.includes('importe') || c.includes('monto') || c.includes('amount') || c.includes('cantidad') || c.includes('cargo') || c.includes('movimiento'));

          if (hasDateKey || hasConceptKey || hasAmountKey) {
            headerRowIdx = i;
            cells.forEach((cell, colIdx) => {
              if (cell.includes('fecha') || cell.includes('date')) {
                if (dateCol === -1) dateCol = colIdx;
              } else if (cell.includes('concepto') || cell.includes('descrip') || cell.includes('detalle') || cell.includes('operacion') || cell.includes('leyenda')) {
                if (conceptCol === -1) conceptCol = colIdx;
              } else if (cell.includes('beneficiario') || cell.includes('ordenante') || cell.includes('titular') || cell.includes('tercero') || cell.includes('emisor') || cell.includes('remitente') || cell.includes('destino')) {
                if (beneficiaryCol === -1) beneficiaryCol = colIdx;
              } else if (cell.includes('observac') || cell.includes('nota') || cell.includes('referencia') || cell.includes('comentario') || cell.includes('info')) {
                if (notesCol === -1) notesCol = colIdx;
              } else if (cell.includes('importe') || cell.includes('monto') || cell.includes('amount') || cell.includes('cantidad') || cell.includes('cargo') || cell.includes('movimiento')) {
                if (amountCol === -1) amountCol = colIdx;
              } else if (cell.includes('saldo') || cell.includes('balance')) {
                if (balanceCol === -1) balanceCol = colIdx;
              }
            });
            break;
          }
        }

        // Fallbacks if columns were not explicitly named in a header
        const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
        const sampleRow = parseRow(lines[startIdx] || lines[0]);

        if (dateCol === -1) dateCol = 0;
        if (conceptCol === -1) conceptCol = sampleRow.length > 1 ? 1 : 0;

        if (amountCol === -1) {
          if (sampleRow.length === 3) {
            amountCol = 2; // [Fecha, Concepto, Importe]
          } else if (sampleRow.length === 4) {
            amountCol = 3; // [Fecha, Concepto, Observaciones, Importe]
          } else if (sampleRow.length >= 5) {
            amountCol = 3; // [Fecha, Concepto, Observaciones, Importe, Saldo]
          } else {
            amountCol = sampleRow.length - 1;
          }
        }

        if (notesCol === -1 && sampleRow.length >= 4 && amountCol !== 2) {
          notesCol = 2;
        }

        if (balanceCol === -1 && sampleRow.length >= 5 && amountCol !== 4) {
          balanceCol = 4;
        }

        let importedCount = 0;
        let autoTaggedInCSVCount = 0;
        let skippedCount = 0;

        for (let i = startIdx; i < lines.length; i++) {
          const row = parseRow(lines[i]);
          if (row.length < 2) {
            skippedCount++;
            continue;
          }

          const rawDate = row[dateCol] || '';
          const parsedDate = parseDate(rawDate);
          const concept = (row[conceptCol] || '').trim() || 'Movimiento Importado';
          const beneficiary = beneficiaryCol >= 0 ? (row[beneficiaryCol] || '').trim() : '';
          const notes = notesCol >= 0 ? (row[notesCol] || '').trim() : '';
          const rawAmount = row[amountCol] || '';
          const amount = parseNum(rawAmount);
          const rawBalance = balanceCol >= 0 ? row[balanceCol] || '' : '';
          const balance = parseNum(rawBalance);

          if (parsedDate && amount !== 0) {
            const autoCategory = autoTagMovement(concept, notes, amount, beneficiary);
            await addDoc(collection(db, 'finanzas_bancarios'), {
              date: parsedDate,
              concept,
              beneficiary,
              notes,
              amount,
              balance,
              categoryName: autoCategory || '',
              status: autoCategory ? 'etiquetado' : 'pendiente',
              createdAt: serverTimestamp()
            });
            importedCount++;
            if (autoCategory) autoTaggedInCSVCount++;
          } else {
            skippedCount++;
          }
        }

        if (importedCount > 0) {
          alert(`¡Importación completada con éxito!\n\nSe registraron ${importedCount} movimientos bancarios en la base de datos.\nEtiquetados automáticamente por IA: ${autoTaggedInCSVCount} movimiento(s).`);
        } else {
          alert(`No se pudo importar ningún movimiento del archivo CSV.\n\nPor favor verifica que el archivo contenga columnas con la Fecha (ej: DD/MM/YYYY) y el Importe numérico (ej: 150,00 ó -45,50).\n\nColumnas detectadas en la muestra: ${sampleRow.join(' | ')}`);
        }
      } catch (err: any) {
        console.error("Error al importar CSV:", err);
        alert(`Ocurrió un error al procesar el archivo CSV: ${err?.message || 'Error de formato'}`);
      } finally {
        setImportingCSV(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  // AI Auto-Tagging Engine Handler for pending movements
  const [isAutoTagging, setIsAutoTagging] = useState(false);

  const handleAutoTaggingAll = async () => {
    // Only target bank movements that are pending tagging
    const pendingMovements = bankMovements.filter(m => m.status === 'pendiente' || !m.categoryName || m.categoryName === 'none');

    if (pendingMovements.length === 0) {
      alert("No hay movimientos pendientes de etiquetar. Todos los registros actuales cuentan ya con su categoría asignada.");
      return;
    }

    setIsAutoTagging(true);
    let updatedCount = 0;

    try {
      // Analyze pending bank movements against the AI rules
      for (const movement of pendingMovements) {
        if (!movement.id) continue;
        const tagAssigned = autoTagMovement(movement.concept, movement.notes || '', movement.amount, movement.beneficiary || '');

        if (tagAssigned) {
          await updateDoc(doc(db, 'finanzas_bancarios', movement.id), {
            categoryName: tagAssigned,
            status: 'etiquetado'
          });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        alert(`¡Etiquetado IA completado con éxito!\n\nSe asignaron automáticamente las etiquetas oficiales a ${updatedCount} de los ${pendingMovements.length} movimiento(s) pendientes.`);
      } else {
        alert(`Se analizaron los ${pendingMovements.length} movimientos pendientes, pero ninguno coincidió con las reglas de etiquetado automático.`);
      }
    } catch (error: any) {
      console.error("Error en Etiquetado IA:", error);
      alert(`Ocurrió un error durante el etiquetado inteligente: ${error?.message || error}`);
    } finally {
      setIsAutoTagging(false);
    }
  };

  // Sync / Reset default official categories into Firestore
  const handleSyncDefaultTags = async () => {
    try {
      const existingNames = new Set(tags.map(t => t.name.toUpperCase().trim()));
      let addedCount = 0;

      for (const defCat of DEFAULT_CATEGORIES) {
        if (!existingNames.has(defCat.name.toUpperCase().trim())) {
          await addDoc(collection(db, 'finanzas_etiquetas'), {
            name: defCat.name,
            type: defCat.type,
            createdAt: serverTimestamp()
          });
          addedCount++;
        }
      }

      alert(`¡Sincronización completada!\n\nSe verificaron las 25 etiquetas oficiales en el catálogo (${addedCount} nueva(s) agregada(s)).`);
      
      // Auto trigger AI auto-tagging across all bank movements right away
      if (bankMovements.length > 0) {
        await handleAutoTaggingAll();
      }
    } catch (error) {
      console.error("Error al sincronizar etiquetas:", error);
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_etiquetas');
    }
  };

  // Assign category tag to bank movement
  const handleAssignCategory = async (movementId: string, categoryName: string) => {
    try {
      const isClear = !categoryName || categoryName === 'none';
      await updateDoc(doc(db, 'finanzas_bancarios', movementId), {
        categoryName: isClear ? '' : categoryName,
        status: isClear ? 'pendiente' : 'etiquetado'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `finanzas_bancarios/${movementId}`);
    }
  };

  // Delete bank movement
  const handleDeleteBankMovement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'finanzas_bancarios', id));
      setBankMovementToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `finanzas_bancarios/${id}`);
    }
  };

  // Create Tag / Category
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    try {
      await addDoc(collection(db, 'finanzas_etiquetas'), {
        name: newTagName.trim(),
        type: newTagType,
        createdAt: serverTimestamp()
      });
      setNewTagName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_etiquetas');
    }
  };

  // Delete Tag
  const handleDeleteTag = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'finanzas_etiquetas', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `finanzas_etiquetas/${id}`);
    }
  };

  // =============================================================
  // 2. CELEBRACIONES LOGIC
  // =============================================================
  const [showIngresoForm, setShowIngresoForm] = useState(false);
  const [celebForm, setCelebForm] = useState<{
    date: string;
    amount: string;
    paymentMethod: 'Efectivo' | 'Datafono' | 'Cheque';
    destination: 'Diezmo' | 'Ofrenda' | 'Misiones' | 'Campaña' | 'Evento' | 'Curso' | 'Otro';
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'Efectivo',
    destination: 'Ofrenda',
    notes: ''
  });

  const [savingCeleb, setSavingCeleb] = useState(false);

  // Arqueo Form State
  const [arqueoDate, setArqueoDate] = useState(new Date().toISOString().split('T')[0]);
  const [arqueoSobre, setArqueoSobre] = useState('');
  const [arqueoBolsa, setArqueoBolsa] = useState('');
  const [arqueoCajaChica, setArqueoCajaChica] = useState('');
  const [arqueoNotes, setArqueoNotes] = useState('');
  const [savingArqueo, setSavingArqueo] = useState(false);

  // =============================================================
  // 2. CELEBRACIONES CAJA CHICA COMPUTATION & HANDLERS
  // =============================================================
  const celebrationIncomesList = useMemo(() => {
    return (celebrationIncomes as any[]).filter(i => i.type !== 'egreso');
  }, [celebrationIncomes]);

  const celebrationEgresosList = useMemo(() => {
    const fromCeleb = (celebrationIncomes as any[]).filter(i => i.type === 'egreso');
    const fromCajaChica = cajaChicaMovements.filter(m => m.type === 'egreso' && (m.category === 'Celebración / Arqueo' || (m as any).module === 'celebraciones'));
    return [...fromCeleb, ...fromCajaChica].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [celebrationIncomes, cajaChicaMovements]);

  const celebrationArqueosList = useMemo(() => {
    return arqueos.filter(a => !a.module || a.module === 'celebraciones' || a.module === 'caja_chica');
  }, [arqueos]);

  const totalCelebrationRecaudado = useMemo(() => {
    return celebrationIncomesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [celebrationIncomesList]);

  const totalCelebrationEfectivo = useMemo(() => {
    return celebrationIncomesList
      .filter(i => i.paymentMethod === 'Efectivo')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [celebrationIncomesList]);

  const totalCelebrationDatafono = useMemo(() => {
    return celebrationIncomesList
      .filter(i => i.paymentMethod === 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [celebrationIncomesList]);

  const totalCelebrationOtros = useMemo(() => {
    return celebrationIncomesList
      .filter(i => i.paymentMethod !== 'Efectivo' && i.paymentMethod !== 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [celebrationIncomesList]);

  const totalCelebrationEgresos = useMemo(() => {
    return celebrationEgresosList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [celebrationEgresosList]);

  const saldoCajaChicaCelebraciones = useMemo(() => {
    return totalCelebrationEfectivo - totalCelebrationEgresos;
  }, [totalCelebrationEfectivo, totalCelebrationEgresos]);

  // Daily cash income for selected Arqueo date (Celebraciones)
  const totalEfectivoFechaArqueo = useMemo(() => {
    const ingresosDia = celebrationIncomesList
      .filter(i => i.date === arqueoDate && (i.paymentMethod === 'Efectivo' || !i.paymentMethod))
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return ingresosDia;
  }, [celebrationIncomesList, arqueoDate]);

  // Form for Celebraciones Egreso
  const [celebEgresoForm, setCelebEgresoForm] = useState<{
    date: string;
    amount: string;
    destination: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    destination: '',
    notes: ''
  });
  const [showCelebEgresoForm, setShowCelebEgresoForm] = useState(false);
  const [savingCelebEgreso, setSavingCelebEgreso] = useState(false);

  const handleSaveCelebEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(celebEgresoForm.amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Por favor introduce un valor válido para el egreso.");
      return;
    }
    if (!celebEgresoForm.destination.trim()) {
      alert("Por favor selecciona un Destino (Área Ministerial o de Servicios).");
      return;
    }

    setSavingCelebEgreso(true);
    try {
      await addDoc(collection(db, 'finanzas_celebraciones'), {
        date: celebEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: celebEgresoForm.destination.trim(),
        concept: celebEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: celebEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setCelebEgresoForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        destination: '',
        notes: ''
      });
      setShowCelebEgresoForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_celebraciones');
    } finally {
      setSavingCelebEgreso(false);
    }
  };

  const handleDeleteCelebEgreso = async (id: string) => {
    setGenericItemToDelete({
      id,
      title: 'Eliminar Egreso de Celebraciones',
      description: '¿Estás seguro de que deseas eliminar este egreso de Celebraciones?',
      collection: 'finanzas_celebraciones',
      secondCollection: 'finanzas_caja_chica'
    });
  };

  // =============================================================
  // 3. CAFETERÍA CAJA CHICA COMPUTATION & HANDLERS
  // =============================================================
  const [cafeteriaIngresoForm, setCafeteriaIngresoForm] = useState<{
    date: string;
    amount: string;
    paymentMethod: 'Efectivo' | 'Datafono' | 'Transferencia' | 'Bizum';
    category: string;
    concept: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'Efectivo',
    category: 'Venta Cafetería',
    concept: '',
    notes: ''
  });
  const [showCafeteriaIngresoForm, setShowCafeteriaIngresoForm] = useState(false);
  const [savingCafeteriaIngreso, setSavingCafeteriaIngreso] = useState(false);

  const [cafeteriaEgresoForm, setCafeteriaEgresoForm] = useState<{
    date: string;
    amount: string;
    destination: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    destination: '',
    notes: ''
  });
  const [showCafeteriaEgresoForm, setShowCafeteriaEgresoForm] = useState(false);
  const [savingCafeteriaEgreso, setSavingCafeteriaEgreso] = useState(false);

  const handleSaveCafeteriaIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeteriaIngresoForm.amount || parseFloat(cafeteriaIngresoForm.amount) <= 0) {
      alert("Introduce un valor válido para el ingreso.");
      return;
    }

    setSavingCafeteriaIngreso(true);
    try {
      await addDoc(collection(db, 'finanzas_cafeteria'), {
        date: cafeteriaIngresoForm.date,
        type: 'ingreso',
        amount: parseFloat(cafeteriaIngresoForm.amount),
        paymentMethod: cafeteriaIngresoForm.paymentMethod,
        category: cafeteriaIngresoForm.category,
        concept: cafeteriaIngresoForm.concept.trim() || 'Ingreso Cafetería',
        notes: cafeteriaIngresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setCafeteriaIngresoForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'Efectivo',
        category: 'Venta Cafetería',
        concept: '',
        notes: ''
      });
      setShowCafeteriaIngresoForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_cafeteria');
    } finally {
      setSavingCafeteriaIngreso(false);
    }
  };

  const handleSaveCafeteriaEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(cafeteriaEgresoForm.amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Introduce un valor válido para el egreso.");
      return;
    }
    if (!cafeteriaEgresoForm.destination.trim()) {
      alert("Por favor selecciona o introduce un Destino / Categoría.");
      return;
    }

    setSavingCafeteriaEgreso(true);
    try {
      await addDoc(collection(db, 'finanzas_cafeteria'), {
        date: cafeteriaEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: cafeteriaEgresoForm.destination.trim(),
        concept: cafeteriaEgresoForm.destination.trim(),
        category: cafeteriaEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: cafeteriaEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setCafeteriaEgresoForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        destination: '',
        notes: ''
      });
      setShowCafeteriaEgresoForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_cafeteria');
    } finally {
      setSavingCafeteriaEgreso(false);
    }
  };

  const cafeteriaIncomesList = useMemo(() => {
    return cafeteriaMovements.filter(m => m.type === 'ingreso');
  }, [cafeteriaMovements]);

  const cafeteriaEgresosList = useMemo(() => {
    return cafeteriaMovements.filter(m => m.type === 'egreso');
  }, [cafeteriaMovements]);

  const cafeteriaArqueosList = useMemo(() => {
    return arqueos.filter(a => a.module === 'cafeteria');
  }, [arqueos]);

  const totalCafeteriaIngresos = useMemo(() => {
    return cafeteriaIncomesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [cafeteriaIncomesList]);

  const totalCafeteriaEfectivo = useMemo(() => {
    return cafeteriaIncomesList
      .filter(i => (i as any).paymentMethod === 'Efectivo' || !(i as any).paymentMethod)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [cafeteriaIncomesList]);

  const totalCafeteriaDatafono = useMemo(() => {
    return cafeteriaIncomesList
      .filter(i => (i as any).paymentMethod === 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [cafeteriaIncomesList]);

  const totalCafeteriaOtros = useMemo(() => {
    return cafeteriaIncomesList
      .filter(i => (i as any).paymentMethod && (i as any).paymentMethod !== 'Efectivo' && (i as any).paymentMethod !== 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [cafeteriaIncomesList]);

  const totalCafeteriaEgresos = useMemo(() => {
    return cafeteriaEgresosList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [cafeteriaEgresosList]);

  const saldoCajaChicaCafeteria = useMemo(() => {
    return totalCafeteriaEfectivo - totalCafeteriaEgresos;
  }, [totalCafeteriaEfectivo, totalCafeteriaEgresos]);

  const totalEfectivoCafeteriaFechaArqueo = useMemo(() => {
    const ingresosDia = cafeteriaIncomesList
      .filter(i => i.date === cafeteriaArqueoDate && ((i as any).paymentMethod === 'Efectivo' || !(i as any).paymentMethod))
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return ingresosDia;
  }, [cafeteriaIncomesList, cafeteriaArqueoDate]);

  // =============================================================
  // 4. LIBRERÍA CAJA CHICA COMPUTATION & HANDLERS
  // =============================================================
  const [libreriaIngresoForm, setLibreriaIngresoForm] = useState<{
    date: string;
    amount: string;
    paymentMethod: 'Efectivo' | 'Datafono' | 'Transferencia' | 'Bizum';
    category: string;
    concept: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'Efectivo',
    category: 'Venta Libros',
    concept: '',
    notes: ''
  });
  const [showLibreriaIngresoForm, setShowLibreriaIngresoForm] = useState(false);
  const [savingLibreriaIngreso, setSavingLibreriaIngreso] = useState(false);

  const [libreriaEgresoForm, setLibreriaEgresoForm] = useState<{
    date: string;
    amount: string;
    destination: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    destination: '',
    notes: ''
  });
  const [showLibreriaEgresoForm, setShowLibreriaEgresoForm] = useState(false);
  const [savingLibreriaEgreso, setSavingLibreriaEgreso] = useState(false);

  const handleSaveLibreriaIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libreriaIngresoForm.amount || parseFloat(libreriaIngresoForm.amount) <= 0) {
      alert("Introduce un valor válido para el ingreso.");
      return;
    }

    setSavingLibreriaIngreso(true);
    try {
      await addDoc(collection(db, 'finanzas_libreria'), {
        date: libreriaIngresoForm.date,
        type: 'ingreso',
        amount: parseFloat(libreriaIngresoForm.amount),
        paymentMethod: libreriaIngresoForm.paymentMethod,
        category: libreriaIngresoForm.category,
        concept: libreriaIngresoForm.concept.trim() || 'Ingreso Librería',
        notes: libreriaIngresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setLibreriaIngresoForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'Efectivo',
        category: 'Venta Libros',
        concept: '',
        notes: ''
      });
      setShowLibreriaIngresoForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_libreria');
    } finally {
      setSavingLibreriaIngreso(false);
    }
  };

  const handleSaveLibreriaEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(libreriaEgresoForm.amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Introduce un valor válido para el egreso.");
      return;
    }
    if (!libreriaEgresoForm.destination.trim()) {
      alert("Por favor selecciona o introduce un Destino / Categoría.");
      return;
    }

    setSavingLibreriaEgreso(true);
    try {
      await addDoc(collection(db, 'finanzas_libreria'), {
        date: libreriaEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: libreriaEgresoForm.destination.trim(),
        concept: libreriaEgresoForm.destination.trim(),
        category: libreriaEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: libreriaEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setLibreriaEgresoForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        destination: '',
        notes: ''
      });
      setShowLibreriaEgresoForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_libreria');
    } finally {
      setSavingLibreriaEgreso(false);
    }
  };

  const libreriaIncomesList = useMemo(() => {
    return libreriaMovements.filter(m => m.type === 'ingreso');
  }, [libreriaMovements]);

  const libreriaEgresosList = useMemo(() => {
    return libreriaMovements.filter(m => m.type === 'egreso');
  }, [libreriaMovements]);

  const libreriaArqueosList = useMemo(() => {
    return arqueos.filter(a => a.module === 'libreria');
  }, [arqueos]);

  const totalLibreriaIngresos = useMemo(() => {
    return libreriaIncomesList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [libreriaIncomesList]);

  const totalLibreriaEfectivo = useMemo(() => {
    return libreriaIncomesList
      .filter(i => (i as any).paymentMethod === 'Efectivo' || !(i as any).paymentMethod)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [libreriaIncomesList]);

  const totalLibreriaDatafono = useMemo(() => {
    return libreriaIncomesList
      .filter(i => (i as any).paymentMethod === 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [libreriaIncomesList]);

  const totalLibreriaOtros = useMemo(() => {
    return libreriaIncomesList
      .filter(i => (i as any).paymentMethod && (i as any).paymentMethod !== 'Efectivo' && (i as any).paymentMethod !== 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [libreriaIncomesList]);

  const totalLibreriaEgresos = useMemo(() => {
    return libreriaEgresosList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [libreriaEgresosList]);

  const saldoCajaChicaLibreria = useMemo(() => {
    return totalLibreriaEfectivo - totalLibreriaEgresos;
  }, [totalLibreriaEfectivo, totalLibreriaEgresos]);

  const totalEfectivoLibreriaFechaArqueo = useMemo(() => {
    const ingresosDia = libreriaIncomesList
      .filter(i => i.date === libreriaArqueoDate && ((i as any).paymentMethod === 'Efectivo' || !(i as any).paymentMethod))
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    return ingresosDia;
  }, [libreriaIncomesList, libreriaArqueoDate]);

  // Total distributed in Arqueo
  const totalArqueoDistribuido = useMemo(() => {
    const sobre = parseFloat(arqueoSobre) || 0;
    const bolsa = parseFloat(arqueoBolsa) || 0;
    const caja = parseFloat(arqueoCajaChica) || 0;
    return sobre + bolsa + caja;
  }, [arqueoSobre, arqueoBolsa, arqueoCajaChica]);

  // Save Celebration Income
  const handleSaveCelebIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!celebForm.amount || parseFloat(celebForm.amount) <= 0) {
      alert("Introduce un valor válido para el ingreso.");
      return;
    }

    setSavingCeleb(true);
    try {
      await addDoc(collection(db, 'finanzas_celebraciones'), {
        date: celebForm.date,
        amount: parseFloat(celebForm.amount),
        paymentMethod: celebForm.paymentMethod,
        destination: celebForm.destination,
        notes: celebForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      // Reset form
      setCelebForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'Efectivo',
        destination: 'Ofrenda',
        notes: ''
      });
      setShowIngresoForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_celebraciones');
    } finally {
      setSavingCeleb(false);
    }
  };

  // Save Arqueo de Caja
  const handleConfirmArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    const sobre = parseFloat(arqueoSobre) || 0;
    const bolsa = parseFloat(arqueoBolsa) || 0;
    const caja = parseFloat(arqueoCajaChica) || 0;

    if (totalArqueoDistribuido <= 0) {
      alert("Por favor, distribuye el efectivo en al menos un rubro (Sobre, Bolsa o Caja Chica).");
      return;
    }

    setSavingArqueo(true);
    try {
      // 1. Save Arqueo document
      await addDoc(collection(db, 'finanzas_arqueos'), {
        module: 'celebraciones',
        date: arqueoDate,
        totalEfectivo: totalEfectivoFechaArqueo,
        sobreBilletes: sobre,
        bolsaMonedas: bolsa,
        cajaChica: caja,
        notes: arqueoNotes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      // 2. If Caja Chica is selected > 0, register automatic entry in Caja Chica
      if (caja > 0) {
        await addDoc(collection(db, 'finanzas_caja_chica'), {
          date: arqueoDate,
          type: 'ingreso',
          category: 'Celebración / Arqueo',
          concept: `Retención Arqueo Celebración (${arqueoDate})`,
          amount: caja,
          notes: arqueoNotes.trim() || 'Ingreso automático desde Arqueo de Caja',
          registeredByUid: user?.uid,
          registeredByName: user?.displayName || user?.email || 'Financiero',
          createdAt: serverTimestamp()
        });
      }

      alert("¡Arqueo de caja registrado correctamente!");
      setArqueoSobre('');
      setArqueoBolsa('');
      setArqueoCajaChica('');
      setArqueoNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_arqueos');
    } finally {
      setSavingArqueo(false);
    }
  };

  // Generic Save Arqueo for Caja Chica, Cafetería & Librería
  const handleSaveModuleArqueo = async (
    e: React.FormEvent,
    module: 'caja_chica' | 'cafeteria' | 'libreria',
    date: string,
    billetesStr: string,
    monedasStr: string,
    expectedBalance: number,
    notes: string,
    setSaving: (v: boolean) => void,
    resetForm: () => void
  ) => {
    e.preventDefault();
    const billetes = parseFloat(billetesStr) || 0;
    const monedas = parseFloat(monedasStr) || 0;
    const totalEfectivo = billetes + monedas;

    if (totalEfectivo <= 0 && billetesStr === '' && monedasStr === '') {
      alert("Introduce los montos de billetes o monedas contados.");
      return;
    }

    const diferencia = totalEfectivo - expectedBalance;

    setSaving(true);
    try {
      await addDoc(collection(db, 'finanzas_arqueos'), {
        module,
        date,
        totalEfectivo,
        expectedBalance,
        diferencia,
        sobreBilletes: billetes,
        bolsaMonedas: monedas,
        notes: notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      alert("¡Arqueo de caja registrado correctamente!");
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_arqueos');
    } finally {
      setSaving(false);
    }
  };

  // Delete Celebration Income
  const handleDeleteCelebIncome = async (id: string) => {
    setGenericItemToDelete({
      id,
      title: 'Eliminar Ingreso de Celebraciones',
      description: '¿Estás seguro de que deseas eliminar este ingreso de Celebraciones?',
      collection: 'finanzas_celebraciones'
    });
  };

  // Delete Arqueo
  const handleDeleteArqueo = async (id: string) => {
    setGenericItemToDelete({
      id,
      title: 'Eliminar Registro de Arqueo',
      description: '¿Estás seguro de que deseas eliminar este registro de arqueo de caja?',
      collection: 'finanzas_arqueos'
    });
  };

  // =============================================================
  // 3. CAJA CHICA LOGIC
  // =============================================================
  const [showCajaForm, setShowCajaForm] = useState(false);
  const [cajaForm, setCajaForm] = useState<{
    type: 'ingreso' | 'egreso';
    category: string;
    concept: string;
    amount: string;
    date: string;
    notes: string;
  }>({
    type: 'egreso',
    category: 'Mantenimiento',
    concept: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [savingCaja, setSavingCaja] = useState(false);
  const [cajaSort, setCajaSort] = useState<'recientes' | 'antiguos'>('recientes');

  // Compute Petty Cash current balance
  const cajaChicaBalance = useMemo(() => {
    return cajaChicaMovements.reduce((acc, curr) => {
      if (curr.type === 'ingreso') return acc + (curr.amount || 0);
      if (curr.type === 'egreso') return acc - (curr.amount || 0);
      return acc;
    }, 0);
  }, [cajaChicaMovements]);

  // Sorted Petty cash list
  const sortedCajaMovements = useMemo(() => {
    return [...cajaChicaMovements].sort((a, b) => {
      if (cajaSort === 'recientes') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });
  }, [cajaChicaMovements, cajaSort]);

  // Save Caja Chica Movement
  const handleSaveCajaMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaForm.concept.trim() || !cajaForm.amount || parseFloat(cajaForm.amount) <= 0) {
      alert("Ingresa un concepto válido e importe mayor a 0.");
      return;
    }

    setSavingCaja(true);
    try {
      await addDoc(collection(db, 'finanzas_caja_chica'), {
        date: cajaForm.date,
        type: cajaForm.type,
        category: cajaForm.category,
        concept: cajaForm.concept.trim(),
        amount: parseFloat(cajaForm.amount),
        notes: cajaForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setCajaForm({
        type: 'egreso',
        category: 'Mantenimiento',
        concept: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowCajaForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_caja_chica');
    } finally {
      setSavingCaja(false);
    }
  };

  // Delete Caja Chica Movement
  const handleDeleteCajaMovement = async (id: string) => {
    setGenericItemToDelete({
      id,
      title: 'Eliminar Movimiento de Caja Chica',
      description: '¿Estás seguro de que deseas eliminar este movimiento de Caja Chica?',
      collection: 'finanzas_caja_chica'
    });
  };

  // =============================================================
  // 3B. CAFETERÍA LOGIC (CAJA CHICA CAFETERÍA)
  // =============================================================
  const [showCafeteriaForm, setShowCafeteriaForm] = useState(false);
  const [cafeteriaForm, setCafeteriaForm] = useState<{
    type: 'ingreso' | 'egreso';
    category: string;
    concept: string;
    amount: string;
    date: string;
    notes: string;
  }>({
    type: 'egreso',
    category: 'Café e Insumos',
    concept: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [savingCafeteria, setSavingCafeteria] = useState(false);
  const [cafeteriaSort, setCafeteriaSort] = useState<'recientes' | 'antiguos'>('recientes');

  const cafeteriaBalance = useMemo(() => {
    return cafeteriaMovements.reduce((acc, curr) => {
      if (curr.type === 'ingreso') return acc + (curr.amount || 0);
      if (curr.type === 'egreso') return acc - (curr.amount || 0);
      return acc;
    }, 0);
  }, [cafeteriaMovements]);

  const sortedCafeteriaMovements = useMemo(() => {
    return [...cafeteriaMovements].sort((a, b) => {
      if (cafeteriaSort === 'recientes') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });
  }, [cafeteriaMovements, cafeteriaSort]);

  const handleSaveCafeteriaMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeteriaForm.concept.trim() || !cafeteriaForm.amount || parseFloat(cafeteriaForm.amount) <= 0) {
      alert("Ingresa un concepto válido e importe mayor a 0.");
      return;
    }

    setSavingCafeteria(true);
    try {
      await addDoc(collection(db, 'finanzas_cafeteria'), {
        date: cafeteriaForm.date,
        type: cafeteriaForm.type,
        category: cafeteriaForm.category,
        concept: cafeteriaForm.concept.trim(),
        amount: parseFloat(cafeteriaForm.amount),
        notes: cafeteriaForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setCafeteriaForm({
        type: 'egreso',
        category: 'Café e Insumos',
        concept: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowCafeteriaForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_cafeteria');
    } finally {
      setSavingCafeteria(false);
    }
  };

  const handleDeleteCafeteriaMovement = async (id: string) => {
    setGenericItemToDelete({
      id,
      title: 'Eliminar Movimiento de Cafetería',
      description: '¿Estás seguro de que deseas eliminar este movimiento de Cafetería?',
      collection: 'finanzas_cafeteria',
      secondCollection: 'finanzas_caja_chica'
    });
  };

  // =============================================================
  // 3C. LIBRERÍA LOGIC (CAJA CHICA LIBRERÍA)
  // =============================================================
  const [showLibreriaForm, setShowLibreriaForm] = useState(false);
  const [libreriaForm, setLibreriaForm] = useState<{
    type: 'ingreso' | 'egreso';
    category: string;
    concept: string;
    amount: string;
    date: string;
    notes: string;
  }>({
    type: 'egreso',
    category: 'Libros y Materiales',
    concept: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [savingLibreria, setSavingLibreria] = useState(false);
  const [libreriaSort, setLibreriaSort] = useState<'recientes' | 'antiguos'>('recientes');

  const libreriaBalance = useMemo(() => {
    return libreriaMovements.reduce((acc, curr) => {
      if (curr.type === 'ingreso') return acc + (curr.amount || 0);
      if (curr.type === 'egreso') return acc - (curr.amount || 0);
      return acc;
    }, 0);
  }, [libreriaMovements]);

  const sortedLibreriaMovements = useMemo(() => {
    return [...libreriaMovements].sort((a, b) => {
      if (libreriaSort === 'recientes') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
    });
  }, [libreriaMovements, libreriaSort]);

  const handleSaveLibreriaMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libreriaForm.concept.trim() || !libreriaForm.amount || parseFloat(libreriaForm.amount) <= 0) {
      alert("Ingresa un concepto válido e importe mayor a 0.");
      return;
    }

    setSavingLibreria(true);
    try {
      await addDoc(collection(db, 'finanzas_libreria'), {
        date: libreriaForm.date,
        type: libreriaForm.type,
        category: libreriaForm.category,
        concept: libreriaForm.concept.trim(),
        amount: parseFloat(libreriaForm.amount),
        notes: libreriaForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });

      setLibreriaForm({
        type: 'egreso',
        category: 'Libros y Materiales',
        concept: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowLibreriaForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'finanzas_libreria');
    } finally {
      setSavingLibreria(false);
    }
  };

  const handleDeleteLibreriaMovement = async (id: string) => {
    setGenericItemToDelete({
      id,
      title: 'Eliminar Movimiento de Librería',
      description: '¿Estás seguro de que deseas eliminar este movimiento de Librería?',
      collection: 'finanzas_libreria',
      secondCollection: 'finanzas_caja_chica'
    });
  };

  // =============================================================
  // 4. REEMBOLSOS LOGIC & SIGNATURES
  // =============================================================
  const [reembolsosSearch, setReembolsosSearch] = useState('');
  const [reembolsosFilter, setReembolsosFilter] = useState<'todos' | 'pendiente' | 'incompleto' | 'completado'>('todos');
  const [selectedReembolsoDetail, setSelectedReembolsoDetail] = useState<Reembolso | null>(null);
  const [reembolsoToDelete, setReembolsoToDelete] = useState<Reembolso | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<{ url: string; name: string } | null>(null);

  const safeOpenAttachment = (url: string, name: string) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      try {
        const parts = url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (e) {
        console.error("Error creating blob URL:", e);
        setPreviewModalImage({ url, name });
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const filteredReembolsos = useMemo(() => {
    return reembolsos.filter(r => {
      if (reembolsosFilter !== 'todos' && r.status !== reembolsosFilter) return false;
      if (reembolsosSearch.trim()) {
        const term = reembolsosSearch.toLowerCase();
        const matchCode = r.code?.toLowerCase().includes(term);
        const matchName = r.createdByName?.toLowerCase().includes(term);
        const matchConcept = r.concept?.toLowerCase().includes(term);
        const matchArea = r.areaName?.toLowerCase().includes(term);
        if (!matchCode && !matchName && !matchConcept && !matchArea) return false;
      }
      return true;
    });
  }, [reembolsos, reembolsosFilter, reembolsosSearch]);

  const handleSignReembolso = async (r: Reembolso) => {
    if (!user || !r.id) return;
    const existingSigs = r.signatures || [];
    if (existingSigs.some(s => s.uid === user.uid)) return;

    const newSig = {
      uid: user.uid,
      name: user.displayName || user.email || 'Miembro Financiero',
      email: user.email || '',
      signedAt: new Date().toISOString()
    };

    const updatedSigs = [...existingSigs, newSig];
    let newStatus: 'pendiente' | 'incompleto' | 'completado' = 'pendiente';

    if (r.paymentMethod === 'Efectivo') {
      newStatus = updatedSigs.length >= 1 ? 'completado' : 'pendiente';
    } else {
      if (updatedSigs.length === 1) newStatus = 'incompleto';
      else if (updatedSigs.length >= 2) newStatus = 'completado';
      else newStatus = 'pendiente';
    }

    try {
      await updateDoc(doc(db, 'reembolsos', r.id), {
        signatures: updatedSigs,
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reembolsos/${r.id}`);
    }
  };

  const handleUnsignReembolso = async (r: Reembolso) => {
    if (!user || !r.id) return;
    const existingSigs = r.signatures || [];
    const updatedSigs = existingSigs.filter(s => s.uid !== user.uid);

    let newStatus: 'pendiente' | 'incompleto' | 'completado' = 'pendiente';
    if (r.paymentMethod === 'Efectivo') {
      newStatus = updatedSigs.length >= 1 ? 'completado' : 'pendiente';
    } else {
      if (updatedSigs.length === 1) newStatus = 'incompleto';
      else if (updatedSigs.length >= 2) newStatus = 'completado';
      else newStatus = 'pendiente';
    }

    try {
      await updateDoc(doc(db, 'reembolsos', r.id), {
        signatures: updatedSigs,
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reembolsos/${r.id}`);
    }
  };

  const handleDeleteReembolso = (r: Reembolso) => {
    setReembolsoToDelete(r);
  };

  const confirmDeleteReembolso = async () => {
    if (!reembolsoToDelete || !reembolsoToDelete.id) return;
    const id = reembolsoToDelete.id;
    try {
      await deleteDoc(doc(db, 'reembolsos', id));
      if (selectedReembolsoDetail?.id === id) {
        setSelectedReembolsoDetail(null);
      }
      setReembolsoToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reembolsos/${id}`);
    }
  };

  const handleOpenDriveFolder = async () => {
    try {
      const token = sessionStorage.getItem('google_access_token') || '';
      const res = await fetch('/api/drive/attachments-folder', {
        headers: {
          'x-google-access-token': token
        }
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data && data.webViewLink) {
          window.open(data.webViewLink, '_blank');
          return;
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener la URL de la carpeta de Drive:", e);
    }
    window.open('https://drive.google.com/drive', '_blank');
  };

  // Loading or Access restriction view
  if (loading || !isAuthReady) {
    return (
      <div className="pt-32 text-center pb-24 min-h-screen bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-primary/60 font-medium">Cargando módulo de Finanzas...</p>
      </div>
    );
  }

  if (!user || !isFinanciero) {
    return (
      <div className="pt-32 pb-24 bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-kenao text-primary mb-2">Acceso Restringido</h2>
          <p className="text-primary/70 text-sm mb-6">
            El módulo de Finanzas de la iglesia requiere el rol de <strong>Financiero</strong> o <strong>Administrador</strong>.
          </p>
          <button 
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-secondary hover:text-primary transition-all cursor-pointer"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PIN LOCK GATE SCREEN
  // -------------------------------------------------------------
  if (!isPinUnlocked) {
    return (
      <div className="pt-28 pb-24 bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 bg-teal-50 text-teal-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-teal-100">
            <Lock className="w-10 h-10 text-teal-600" />
          </div>

          <div>
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider inline-block mb-3">
              Módulo de Alta Seguridad
            </span>
            <h2 className="text-2xl font-kenao text-primary mb-1">Módulo de Finanzas</h2>
            <p className="text-xs text-primary/60 max-w-xs mx-auto">
              {wasLockedDueToInactivity 
                ? 'Sesión bloqueada por inactividad (5 min). Ingresa tu código PIN para desbloquear.'
                : 'Ingresa tu código PIN de Financiero para acceder a la Tesorería.'}
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4 pt-2">
            <div className="relative max-w-xs mx-auto">
              <input
                type={showEnteredPin ? 'text' : 'password'}
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  if (pinError) setPinError('');
                }}
                placeholder="PIN"
                maxLength={8}
                autoFocus
                className="w-full text-center tracking-[0.5em] font-mono text-2xl py-3.5 px-4 rounded-2xl border-2 border-slate-200 outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-100 transition-all bg-slate-50/50 text-primary font-bold"
              />
              <button
                type="button"
                onClick={() => setShowEnteredPin(!showEnteredPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                {showEnteredPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {pinError && (
              <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100">
                {pinError}
              </motion.p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-xs hover:bg-secondary hover:text-primary transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <Key className="w-4 h-4 text-teal-400" />
              Ingresar al Módulo
            </button>
          </form>

          <div className="pt-2 text-[11px] text-primary/40 flex items-center justify-center gap-1.5 border-t border-slate-100">
            <span>Usuario activo:</span>
            <span className="font-bold text-primary">{user.displayName || user.email}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 bg-slate-50/70 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* If non-admin user has NO permissions */}
        {!isAdmin && allowedTabs.length === 0 ? (
          <div className="bg-white p-10 sm:p-14 rounded-3xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto my-12 space-y-4">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-kenao text-primary">Aún no se le ha concedido permisos</h2>
            <p className="text-sm text-primary/70 leading-relaxed max-w-lg mx-auto">
              Tu usuario cuenta con el rol <strong>Financiero</strong>, pero actualmente no se te han asignado permisos de acceso a ninguna de las secciones de Finanzas.
            </p>
            <div className="pt-2 text-xs text-primary/50 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              Ponte en contacto con un Administrador de la iglesia para que configure tus accesos en la sección de Finanzas.
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-kenao text-primary">Finanzas</h1>
                  <button
                    onClick={() => handleLockFinanzas(false)}
                    className="px-3 py-1 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200"
                    title="Bloquear sesión actual con PIN"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    Bloquear
                  </button>
                </div>
              </div>

              {/* Module Switcher Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm max-w-full">
                {hasPermission('bancarios') && (
                  <button
                    onClick={() => setActiveTab('bancarios')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      activeTab === 'bancarios' ? 'bg-primary text-white shadow-sm' : 'text-primary/70 hover:bg-slate-100'
                    }`}
                  >
                    <Landmark className="w-4 h-4 text-teal-400" />
                    Movimientos
                  </button>
                )}

                {(hasPermission('celebraciones') || hasPermission('caja_chica')) && (
                  <button
                    onClick={() => setActiveTab('celebraciones')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      activeTab === 'celebraciones' ? 'bg-primary text-white shadow-sm' : 'text-primary/70 hover:bg-slate-100'
                    }`}
                  >
                    <Church className="w-4 h-4 text-current" />
                    Celebraciones
                  </button>
                )}

                {(hasPermission('cafeteria') || hasPermission('caja_chica')) && (
                  <button
                    onClick={() => setActiveTab('cafeteria')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      activeTab === 'cafeteria' ? 'bg-primary text-white shadow-sm' : 'text-primary/70 hover:bg-slate-100'
                    }`}
                  >
                    <Coffee className="w-4 h-4 text-current" />
                    Cafetería
                  </button>
                )}

                {(hasPermission('libreria') || hasPermission('caja_chica')) && (
                  <button
                    onClick={() => setActiveTab('libreria')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      activeTab === 'libreria' ? 'bg-primary text-white shadow-sm' : 'text-primary/70 hover:bg-slate-100'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-current" />
                    Librería
                  </button>
                )}

                {hasPermission('reembolsos') && (
                  <button
                    onClick={() => setActiveTab('reembolsos')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap relative ${
                      activeTab === 'reembolsos' ? 'bg-primary text-white shadow-sm' : 'text-primary/70 hover:bg-slate-100'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-purple-400" />
                    Reembolsos
                    {reembolsos.filter(r => r.status === 'pendiente' || r.status === 'incompleto').length > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-extrabold ml-1">
                        {reembolsos.filter(r => r.status === 'pendiente' || r.status === 'incompleto').length}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

        {/* Hidden File Input for CSV Bank Extract Import */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".csv,.txt" 
          onChange={handleCSVUpload} 
          className="hidden" 
        />

        {/* ========================================================================= */}
        {/* TAB 1: MOVIMIENTOS                                                       */}
        {/* ========================================================================= */}
        {activeTab === 'bancarios' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-kenao text-primary">Movimientos</h2>
                <p className="text-xs text-primary/60">Gestiona y etiqueta las transacciones importadas de la cuenta de banco.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {selectedBankIds.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleDeleteSelectedBankMovements}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar ({selectedBankIds.length})</span>
                  </motion.button>
                )}

                <button
                  onClick={() => setIsTagModalOpen(true)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-primary font-bold rounded-xl text-xs hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-teal-600" />
                  Gestionar Etiquetas
                </button>

                <button
                  onClick={handleAutoTaggingAll}
                  disabled={isAutoTagging || bankMovements.length === 0}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                  title="Ejecutar motor inteligente solo en movimientos pendientes de etiquetar"
                >
                  {isAutoTagging ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  )}
                  Etiquetado IA
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importingCSV}
                  className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-secondary hover:text-primary transition-all flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {importingCSV ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Importar CSV
                </button>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar concepto, beneficiario, observaciones..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>

              {/* Month & Year Selectors */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={bankMonthFilter}
                  onChange={(e) => setBankMonthFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-primary font-bold outline-none focus:ring-2 focus:ring-secondary/50 cursor-pointer"
                >
                  <option value="all">Todos los meses</option>
                  {availableBankMonths.map(mNum => (
                    <option key={mNum} value={mNum.toString()}>{MONTH_NAMES[mNum]}</option>
                  ))}
                </select>

                <select
                  value={bankYearFilter}
                  onChange={(e) => setBankYearFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-primary font-bold outline-none focus:ring-2 focus:ring-secondary/50 cursor-pointer"
                >
                  <option value="all">Todos los años</option>
                  {availableBankYears.map(yr => (
                    <option key={yr} value={yr.toString()}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setBankStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bankStatusFilter === 'all' ? 'bg-primary text-white shadow-sm' : 'text-primary/60 hover:text-primary'
                  }`}
                >
                  Todos ({bankMovements.length})
                </button>
                <button
                  onClick={() => setBankStatusFilter('pendiente')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bankStatusFilter === 'pendiente' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-50'
                  }`}
                >
                  Pendientes ({bankMovements.filter(m => m.status === 'pendiente').length})
                </button>
                <button
                  onClick={() => setBankStatusFilter('etiquetado')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    bankStatusFilter === 'etiquetado' ? 'bg-amber-500 text-white shadow-sm font-extrabold' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Etiquetados ({bankMovements.filter(m => m.status === 'etiquetado').length})
                </button>
              </div>
            </div>

            {/* Consolidated Bank Movements Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredBankMovements.length === 0 ? (
                <div className="p-12 text-center text-primary/40">
                  <Landmark className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-primary/60 mb-1">No hay movimientos bancarios</p>
                  <p className="text-xs">Usa el botón "Importar CSV" para subir el extracto bancario de la iglesia.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                        <th className="py-4 px-4 text-center w-16">
                          <input
                            type="checkbox"
                            checked={filteredBankMovements.length > 0 && filteredBankMovements.every(m => m.id && selectedBankIds.includes(m.id))}
                            onChange={handleToggleSelectAll}
                            className="rounded border-slate-300 text-primary focus:ring-secondary cursor-pointer"
                            title="Seleccionar todo"
                          />
                        </th>
                        <th className="py-4 px-4 whitespace-nowrap">Fecha</th>
                        <th className="py-4 px-6">Detalles</th>
                        <th className="py-4 px-6 text-right whitespace-nowrap">Valor</th>
                        <th className="py-4 px-6">Categoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredBankMovements.map(m => {
                        const isSelected = !!(m.id && selectedBankIds.includes(m.id));
                        const tagType = getTagType(m.categoryName, m.amount);
                        const isTagged = m.status === 'etiquetado' && m.categoryName && m.categoryName !== 'none';

                        return (
                          <tr key={m.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-amber-50/40' : ''}`}>
                            {/* Checkbox */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => m.id && handleToggleSelectRow(m.id)}
                                  className="rounded border-slate-300 text-primary focus:ring-secondary cursor-pointer w-4 h-4"
                                />
                              </div>
                            </td>

                            {/* Fecha */}
                            <td className="py-3 px-4 whitespace-nowrap font-bold text-primary align-top">
                              {m.date}
                            </td>

                            {/* Detalles: Line 1 Concepto, Line 2 Beneficiario/Ordenante, Line 3 Observaciones */}
                            <td className="py-3 px-6 align-top max-w-sm">
                              <div className="font-bold text-primary text-xs leading-snug">
                                {m.concept}
                              </div>
                              {m.beneficiary && (
                                <div className="text-[11px] font-semibold text-slate-600 mt-0.5 leading-snug truncate" title={m.beneficiary}>
                                  Beneficiario/Ord: {m.beneficiary}
                                </div>
                              )}
                              {m.notes && (
                                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug truncate" title={m.notes}>
                                  Obs: {m.notes}
                                </div>
                              )}
                            </td>

                            {/* Valor: Line 1 Importe, Line 2 Saldo */}
                            <td className="py-3 px-6 text-right whitespace-nowrap align-top">
                              <div className={`font-extrabold text-xs ${m.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {m.amount >= 0 ? '+' : ''}{m.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </div>
                              {m.balance !== undefined && (
                                <div className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                  Saldo: {m.balance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </div>
                              )}
                            </td>

                            {/* Categoría */}
                            <td className="py-3 px-6 whitespace-nowrap align-top">
                              <div className="flex items-center gap-2">
                                <select
                                  value={m.categoryName || 'none'}
                                  onChange={(e) => handleAssignCategory(m.id!, e.target.value)}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer transition-all shadow-xs ${
                                    !isTagged 
                                      ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                      : tagType === 'ingreso'
                                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-extrabold'
                                      : 'bg-red-100 border-red-300 text-red-900 font-extrabold'
                                  }`}
                                >
                                  <option value="none">Sin Etiquetar</option>
                                  {tags.map(t => (
                                    <option key={t.id} value={t.name}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => handleOpenAiChat(m)}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center"
                                  title="Abrir Asistente de Corrección IA"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                </button>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CELEBRACIONES                                                     */}
        {/* ========================================================================= */}
        {activeTab === 'celebraciones' && (
          <div className="space-y-6">
            {/* Header with Subtabs & Responsive Filters */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                      <Church className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-kenao text-primary">Celebraciones</h2>
                  </div>
                  <p className="text-xs text-primary/60">Gestión de caja chica, ingresos, egresos y arqueos de celebraciones.</p>
                </div>

                {/* Saldo Efectivo Badge */}
                <div className="bg-amber-50 border border-amber-200 px-5 py-3 rounded-2xl text-right self-start sm:self-auto">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                    Saldo Efectivo
                  </span>
                  <span className="text-2xl font-black text-amber-700 tracking-tight block">
                    {saldoCajaChicaCelebraciones.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              </div>

              {/* Subtabs and dynamic filters row */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                {/* Sub-tabs Selector with flex-wrap */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setCelebracionesSubTab('caja_chica')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      celebracionesSubTab === 'caja_chica' ? 'bg-white text-amber-700 shadow-xs' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-amber-600" />
                    Caja Chica
                  </button>
                  <button
                    onClick={() => setCelebracionesSubTab('movimientos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      celebracionesSubTab === 'movimientos' ? 'bg-white text-blue-700 shadow-xs' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Movimientos
                  </button>
                  <button
                    onClick={() => setCelebracionesSubTab('ingresos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      celebracionesSubTab === 'ingresos' || celebracionesSubTab === 'arqueos' ? 'bg-white text-emerald-700 shadow-xs' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Ingresos
                  </button>
                  <button
                    onClick={() => setCelebracionesSubTab('egresos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      celebracionesSubTab === 'egresos' ? 'bg-white text-rose-700 shadow-xs' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    Egresos
                  </button>
                </div>

                {/* Subtab: Caja Chica Filters */}
                {celebracionesSubTab === 'caja_chica' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={celebCajaMonthFilter}
                      onChange={(e) => setCelebCajaMonthFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos los meses</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>

                    <select
                      value={celebCajaYearFilter}
                      onChange={(e) => setCelebCajaYearFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos los años</option>
                      {Array.from(new Set([
                        ...celebrationIncomesList.map(i => new Date(i.date).getFullYear()),
                        ...celebrationEgresosList.map(e => new Date(e.date).getFullYear()),
                        new Date().getFullYear()
                      ]))
                      .filter(y => !isNaN(y))
                      .sort((a, b) => b - a)
                      .map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    {(celebCajaMonthFilter !== 'all' || celebCajaYearFilter !== 'all') && (
                      <button
                        onClick={() => { setCelebCajaMonthFilter('all'); setCelebCajaYearFilter('all'); }}
                        className="px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50 rounded-lg font-bold transition-all cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                )}

                {/* Subtab: Movimientos Filters */}
                {celebracionesSubTab === 'movimientos' && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por destino, notas o usuario..."
                        value={celebMovSearch}
                        onChange={(e) => setCelebMovSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      <button
                        onClick={() => setCelebMovTypeFilter('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          celebMovTypeFilter === 'all' ? 'bg-white text-primary shadow-xs' : 'text-primary/60 hover:text-primary'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setCelebMovTypeFilter('ingreso')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          celebMovTypeFilter === 'ingreso' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-800'
                        }`}
                      >
                        Ingresos (+)
                      </button>
                      <button
                        onClick={() => setCelebMovTypeFilter('egreso')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          celebMovTypeFilter === 'egreso' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:text-rose-800'
                        }`}
                      >
                        Egresos (-)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 1. SUB-TAB: CAJA CHICA (DASHBOARD) */}
            {celebracionesSubTab === 'caja_chica' && (
              <div className="space-y-6">
                {(() => {
                  const filteredIncomes = celebrationIncomesList.filter(i => {
                    if (i.paymentMethod !== 'Efectivo') return false;
                    const d = new Date(i.date);
                    if (celebCajaYearFilter !== 'all' && d.getFullYear() !== parseInt(celebCajaYearFilter, 10)) return false;
                    if (celebCajaMonthFilter !== 'all' && (d.getMonth() + 1) !== parseInt(celebCajaMonthFilter, 10)) return false;
                    return true;
                  });

                  const filteredEgresos = celebrationEgresosList.filter(e => {
                    const d = new Date(e.date);
                    if (celebCajaYearFilter !== 'all' && d.getFullYear() !== parseInt(celebCajaYearFilter, 10)) return false;
                    if (celebCajaMonthFilter !== 'all' && (d.getMonth() + 1) !== parseInt(celebCajaMonthFilter, 10)) return false;
                    return true;
                  });

                  const totalIngresosEfectivoFiltrado = filteredIncomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                  const totalEgresosFiltrado = filteredEgresos.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                  const flujoNetoFiltrado = totalIngresosEfectivoFiltrado - totalEgresosFiltrado;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Ingresos</span>
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-emerald-600">
                            + {totalIngresosEfectivoFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-emerald-700/70">{filteredIncomes.length} movimientos de ingreso</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Egresos</span>
                            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                              <TrendingDown className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-rose-600">
                            - {totalEgresosFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-rose-700/70">{filteredEgresos.length} salidas registradas</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Flujo Neto</span>
                            <div className={`p-2 rounded-xl ${flujoNetoFiltrado >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              <RefreshCw className="w-4 h-4" />
                            </div>
                          </div>
                          <div className={`text-2xl font-black ${flujoNetoFiltrado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {flujoNetoFiltrado >= 0 ? '+' : ''} {flujoNetoFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-primary/50">Diferencia neta en el periodo</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-amber-600" />
                              Comparativa Mensual de Efectivo
                            </h4>
                            <span className="text-[11px] text-primary/50">Ingresos vs Egresos</span>
                          </div>

                          <div className="h-48 flex items-end gap-2 pt-6 border-b border-slate-100">
                            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((monthName, idx) => {
                              const mIncomes = filteredIncomes
                                .filter(i => new Date(i.date).getMonth() === idx)
                                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                              const mEgresos = filteredEgresos
                                .filter(e => new Date(e.date).getMonth() === idx)
                                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                              
                              const maxVal = Math.max(...[100, ...filteredIncomes.map(i => i.amount || 0), ...filteredEgresos.map(e => e.amount || 0)]);
                              const incHeight = maxVal > 0 ? (mIncomes / maxVal) * 100 : 0;
                              const egHeight = maxVal > 0 ? (mEgresos / maxVal) * 100 : 0;

                              return (
                                <div key={monthName} className="flex-1 flex flex-col items-center gap-1 group relative">
                                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                    <div className="text-emerald-400 font-bold">Ing: {mIncomes.toFixed(2)} €</div>
                                    <div className="text-rose-400 font-bold">Egr: {mEgresos.toFixed(2)} €</div>
                                  </div>

                                  <div className="w-full flex items-end justify-center gap-1 h-36">
                                    <div
                                      style={{ height: `${Math.max(incHeight, mIncomes > 0 ? 8 : 0)}%` }}
                                      className="w-1.5 sm:w-2.5 bg-emerald-500 rounded-t-sm transition-all"
                                    />
                                    <div
                                      style={{ height: `${Math.max(egHeight, mEgresos > 0 ? 8 : 0)}%` }}
                                      className="w-1.5 sm:w-2.5 bg-rose-500 rounded-t-sm transition-all"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-primary/60">{monthName}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-center gap-6 text-xs pt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                              <span className="font-semibold text-primary/70">Ingresos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-rose-500 rounded-sm" />
                              <span className="font-semibold text-primary/70">Egresos</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-rose-600" />
                                Distribución de Egresos por Área
                              </h4>
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                                Total: {totalEgresosFiltrado.toFixed(2)} €
                              </span>
                            </div>

                            {filteredEgresos.length === 0 ? (
                              <div className="py-12 text-center text-xs text-primary/40">
                                No hay egresos registrados en el periodo seleccionado.
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {(Object.entries(
                                  filteredEgresos.reduce((acc, curr) => {
                                    const area = (curr as any).destination || (curr as any).concept || (curr as any).category || 'General';
                                    acc[area] = (acc[area] || 0) + (curr.amount || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                                ) as [string, number][])
                                .sort((a, b) => b[1] - a[1])
                                .map(([areaName, sumAmount]) => {
                                  const pct = totalEgresosFiltrado > 0 ? (sumAmount / totalEgresosFiltrado) * 100 : 0;
                                  return (
                                    <div key={areaName} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-primary">{areaName}</span>
                                        <span className="font-black text-rose-600">{sumAmount.toFixed(2)} € ({pct.toFixed(0)}%)</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          style={{ width: `${pct}%` }}
                                          className="h-full bg-rose-500 rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 text-[11px] text-primary/50 flex items-center justify-between">
                            <span>Datos sincronizados en tiempo real</span>
                            <button
                              onClick={() => setCelebracionesSubTab('movimientos')}
                              className="text-blue-600 hover:underline font-bold cursor-pointer"
                            >
                              Ver todos los movimientos →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2. SUB-TAB: MOVIMIENTOS */}
            {celebracionesSubTab === 'movimientos' && (
              <div className="space-y-6">
                {(() => {
                  const incomesFormatted = celebrationIncomesList.map(i => ({
                    id: i.id!,
                    type: 'ingreso' as const,
                    date: i.date,
                    amount: i.amount,
                    paymentMethod: i.paymentMethod || 'Efectivo',
                    destination: i.destination || 'Ofrenda',
                    notes: i.notes || '',
                    registeredByName: i.registeredByName || 'Financiero',
                    source: 'incomes'
                  }));

                  const egresosFormatted = celebrationEgresosList.map(e => ({
                    id: e.id!,
                    type: 'egreso' as const,
                    date: e.date,
                    amount: e.amount,
                    paymentMethod: 'Efectivo',
                    destination: (e as any).destination || (e as any).concept || (e as any).category || 'General',
                    notes: e.notes || '',
                    registeredByName: e.registeredByName || 'Financiero',
                    source: 'egresos'
                  }));

                  const combined = [...incomesFormatted, ...egresosFormatted]
                    .filter(m => {
                      if (celebMovTypeFilter !== 'all' && m.type !== celebMovTypeFilter) return false;
                      if (celebMovSearch.trim()) {
                        const q = celebMovSearch.toLowerCase();
                        return m.destination.toLowerCase().includes(q) ||
                               m.notes.toLowerCase().includes(q) ||
                               m.registeredByName.toLowerCase().includes(q) ||
                               m.date.includes(q);
                      }
                      return true;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-kenao text-primary">Movimientos Registrados</h4>
                      </div>

                      {combined.length === 0 ? (
                        <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                          No se encontraron movimientos con los filtros aplicados.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                                <th className="py-4 px-6">FECHA</th>
                                <th className="py-4 px-6">VALOR</th>
                                <th className="py-4 px-6">FORMA</th>
                                <th className="py-4 px-6">DESTINO</th>
                                <th className="py-4 px-6">OBSERVACIÓN</th>
                                <th className="py-4 px-6">USUARIO</th>
                                <th className="py-4 px-6 text-center">ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {combined.map(mov => (
                                <tr key={`${mov.source}-${mov.id}`} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                    {mov.date}
                                  </td>
                                  <td className="py-4 px-6 font-black whitespace-nowrap">
                                    <span className={mov.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}>
                                      {mov.type === 'ingreso' ? '+' : '-'} {mov.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                    {mov.paymentMethod}
                                  </td>
                                  <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                    {mov.destination}
                                  </td>
                                  <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                    {mov.notes || '-'}
                                  </td>
                                  <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                    {mov.registeredByName}
                                  </td>
                                  <td className="py-4 px-6 text-center whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        if (mov.type === 'egreso' || (mov as any).source === 'egresos') {
                                          handleDeleteCelebEgreso(mov.id);
                                        } else {
                                          handleDeleteCelebIncome(mov.id);
                                        }
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar movimiento"
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
                  );
                })()}
              </div>
            )}

            {/* 3. SUB-TAB: INGRESOS & ARQUEOS */}
            {(celebracionesSubTab === 'ingresos' || celebracionesSubTab === 'arqueos') && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setShowIngresoForm(!showIngresoForm);
                      setShowArqueosInIngresos(false);
                      setCelebracionesSubTab('ingresos');
                    }}
                    className="h-10 px-5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {showIngresoForm ? 'Cerrar Formulario' : 'Nuevo Ingreso'}
                  </button>

                  <button
                    onClick={() => {
                      const nextState = !showArqueosInIngresos;
                      setShowArqueosInIngresos(nextState);
                      if (nextState) {
                        setShowIngresoForm(false);
                        setCelebracionesSubTab('arqueos');
                      } else {
                        setCelebracionesSubTab('ingresos');
                      }
                    }}
                    className={`h-10 px-5 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer border ${
                      showArqueosInIngresos || celebracionesSubTab === 'arqueos'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Arqueos de Caja
                  </button>
                </div>

                {showIngresoForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-lg font-kenao text-primary">Registrar Ingreso</h3>
                      </div>
                      <button
                        onClick={() => setShowIngresoForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-bold"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleSaveCelebIncome} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Fecha</label>
                          <input
                            type="date"
                            required
                            value={celebForm.date}
                            onChange={(e) => setCelebForm({ ...celebForm, date: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Valor (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0,00"
                            value={celebForm.amount}
                            onChange={(e) => setCelebForm({ ...celebForm, amount: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Forma de Entrega</label>
                          <select
                            value={celebForm.paymentMethod}
                            onChange={(e) => setCelebForm({ ...celebForm, paymentMethod: e.target.value as any })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Datafono">Datáfono</option>
                            <option value="Cheque">Cheque</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Destino</label>
                          <select
                            value={celebForm.destination}
                            onChange={(e) => setCelebForm({ ...celebForm, destination: e.target.value as any })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="Ofrenda">Ofrenda</option>
                            <option value="Diezmo">Diezmo</option>
                            <option value="Misiones">Misiones</option>
                            <option value="Campaña">Campaña</option>
                            <option value="Evento">Evento</option>
                            <option value="Curso">Curso</option>
                            <option value="Otro">Otro</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Observación</label>
                        <input
                          type="text"
                          placeholder="Notas o detalles del ingreso (opcional)"
                          value={celebForm.notes}
                          onChange={(e) => setCelebForm({ ...celebForm, notes: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingCeleb}
                          className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {savingCeleb ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Guardar Ingreso
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {celebracionesSubTab === 'ingresos' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-kenao text-primary">Ingresos Registrados</h4>
                    </div>

                    {celebrationIncomesList.length === 0 ? (
                      <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                        No hay ingresos de celebración registrados.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                              <th className="py-4 px-6">FECHA</th>
                              <th className="py-4 px-6">VALOR</th>
                              <th className="py-4 px-6">FORMA</th>
                              <th className="py-4 px-6">DESTINO</th>
                              <th className="py-4 px-6">OBSERVACIÓN</th>
                              <th className="py-4 px-6">USUARIO</th>
                              <th className="py-4 px-6 text-center">ACCIONES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {celebrationIncomesList.map(inc => (
                              <tr key={inc.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                  {inc.date}
                                </td>
                                <td className="py-4 px-6 font-bold text-emerald-600 whitespace-nowrap">
                                  + {inc.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </td>
                                <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                  {inc.paymentMethod}
                                </td>
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                  {inc.destination}
                                </td>
                                <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                  {inc.notes || '-'}
                                </td>
                                <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                  {inc.registeredByName || 'Financiero'}
                                </td>
                                <td className="py-4 px-6 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeleteCelebIncome(inc.id!)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Eliminar ingreso"
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
                )}
              </div>
            )}

            {/* SUB-TAB 2B: ARQUEOS DE CAJA */}
            {celebracionesSubTab === 'arqueos' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Title Bar */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-kenao text-primary">Arqueo de Caja</h3>
                  </div>

                  {/* Date Selector */}
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary/60" />
                      <span className="text-sm font-bold text-primary">Fecha de Cierre:</span>
                    </div>
                    <input
                      type="date"
                      value={arqueoDate}
                      onChange={(e) => setArqueoDate(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                    />
                  </div>

                  {/* Highlight Banner: Total Cash Recaudado for Selected Date */}
                  <div className="bg-primary border border-primary p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-1">
                        TOTAL EFECTIVO RECAUDADO
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        Suma de todos los ingresos registrados en efectivo para la fecha seleccionada
                      </p>
                    </div>
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {totalEfectivoFechaArqueo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>

                  {/* Nuevo Cierre Breakdown Inputs */}
                  <form onSubmit={handleConfirmArqueo} className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-3">Nuevo Cierre</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Card 1: Sobre Billetes */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                            <Banknote className="w-4 h-4" />
                            Sobre (Billetes)
                          </div>
                          <p className="text-[11px] text-slate-500">Dinero en papel para depositar</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={arqueoSobre}
                              onChange={(e) => setArqueoSobre(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                            />
                          </div>
                        </div>

                        {/* Card 2: Bolsa Monedas */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                            <Coins className="w-4 h-4" />
                            Bolsa (Monedas)
                          </div>
                          <p className="text-[11px] text-slate-500">Monedas para cambiar/depositar</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={arqueoBolsa}
                              onChange={(e) => setArqueoBolsa(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                            />
                          </div>
                        </div>

                        {/* Card 3: Caja Chica */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                            <Wallet className="w-4 h-4" />
                            Caja Chica
                          </div>
                          <p className="text-[11px] text-slate-500">Efectivo retenido para gastos</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={arqueoCajaChica}
                              onChange={(e) => setArqueoCajaChica(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                            />
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">Notas del Cierre</label>
                      <textarea
                        rows={3}
                        placeholder="Observaciones sobre el arqueo, incidencias, etc."
                        value={arqueoNotes}
                        onChange={(e) => setArqueoNotes(e.target.value)}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>

                    {/* Total Distributed Bar & Confirm Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-100 px-6 py-3 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                        <span className="text-xs font-bold text-primary/70">Total Distribuido:</span>
                        <span className="text-lg font-black text-primary">
                          {totalArqueoDistribuido.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={savingArqueo}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {savingArqueo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirmar Cierre
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historial de Cierres Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h4 className="text-lg font-kenao text-primary">Historial de Cierres</h4>
                  {arqueos.length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl">
                      No hay cierres registrados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">TOTAL EFECTIVO</th>
                            <th className="py-4 px-6">SOBRE (BILLETES)</th>
                            <th className="py-4 px-6">BOLSA (MONEDAS)</th>
                            <th className="py-4 px-6">CAJA CHICA</th>
                            <th className="py-4 px-6">RESPONSABLE</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {arqueos.filter(a => !a.module || a.module === 'celebraciones').map(arq => (
                            <tr key={arq.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {arq.date}
                              </td>
                              <td className="py-4 px-6 font-bold text-blue-700 whitespace-nowrap">
                                {arq.totalEfectivo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-emerald-700 whitespace-nowrap">
                                {arq.sobreBilletes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-purple-700 whitespace-nowrap">
                                {arq.bolsaMonedas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-amber-700 whitespace-nowrap">
                                {arq.cajaChica.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                {arq.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteArqueo(arq.id!)}
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
            )}

            {/* 4. SUB-TAB: EGRESOS */}
            {celebracionesSubTab === 'egresos' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowCelebEgresoForm(!showCelebEgresoForm)}
                    className="h-10 px-5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {showCelebEgresoForm ? 'Cerrar Formulario' : 'Nuevo Egreso'}
                  </button>
                </div>

                {showCelebEgresoForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-rose-600" />
                        <h3 className="text-lg font-kenao text-primary">Registrar Egreso</h3>
                      </div>
                      <button
                        onClick={() => setShowCelebEgresoForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-bold"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleSaveCelebEgreso} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Fecha *</label>
                          <input
                            type="date"
                            required
                            value={celebEgresoForm.date}
                            onChange={(e) => setCelebEgresoForm({ ...celebEgresoForm, date: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Valor (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0,00"
                            value={celebEgresoForm.amount}
                            onChange={(e) => setCelebEgresoForm({ ...celebEgresoForm, amount: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Destino / Área Ministerial *</label>
                          <select
                            required
                            value={celebEgresoForm.destination}
                            onChange={(e) => setCelebEgresoForm({ ...celebEgresoForm, destination: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                          >
                            <option value="">Selecciona un área...</option>
                            {churchAreas.map(area => (
                              <option key={area.id} value={area.name}>
                                {area.name} ({area.type === 'Ministerial' ? 'Ministerio' : 'Servicio'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Observación</label>
                        <input
                          type="text"
                          placeholder="Notas o motivo del egreso (opcional)"
                          value={celebEgresoForm.notes}
                          onChange={(e) => setCelebEgresoForm({ ...celebEgresoForm, notes: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingCelebEgreso}
                          className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {savingCelebEgreso ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Registrar Egreso
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-kenao text-primary">Egresos Registrados</h4>
                  </div>

                  {celebrationEgresosList.length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                      No hay egresos registrados en Celebraciones.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">VALOR</th>
                            <th className="py-4 px-6">FORMA</th>
                            <th className="py-4 px-6">DESTINO</th>
                            <th className="py-4 px-6">OBSERVACIÓN</th>
                            <th className="py-4 px-6">USUARIO</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {celebrationEgresosList.map(eg => (
                            <tr key={eg.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {eg.date}
                              </td>
                              <td className="py-4 px-6 font-bold text-rose-600 whitespace-nowrap">
                                - {eg.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                Efectivo
                              </td>
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {(eg as any).destination || (eg as any).concept || (eg as any).category || 'General'}
                              </td>
                              <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                {eg.notes || '-'}
                              </td>
                              <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                {eg.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteCelebEgreso(eg.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Eliminar egreso"
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
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CAJA CHICA                                                        */}
        {/* ========================================================================= */}
        {activeTab === 'caja_chica' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div>
                <h2 className="text-2xl font-kenao text-primary">Caja Chica</h2>
                <p className="text-xs text-primary/60">Control de efectivo en mano.</p>

                {/* SubTab Selector */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center max-w-xs mt-3">
                  <button
                    onClick={() => setCajaChicaSubTab('movimientos')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      cajaChicaSubTab === 'movimientos' ? 'bg-white text-primary shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    Movimientos
                  </button>
                  <button
                    onClick={() => setCajaChicaSubTab('arqueos')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      cajaChicaSubTab === 'arqueos' ? 'bg-white text-primary shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    Arqueos de Caja
                  </button>
                </div>
              </div>

              {/* Saldo Actual Card */}
              <div className="bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl text-right sm:min-w-[200px]">
                <span className="text-[11px] font-bold text-primary/50 uppercase tracking-wider block mb-0.5">
                  Saldo Actual
                </span>
                <span className={`text-3xl font-bold tracking-tight block ${
                  cajaChicaBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {cajaChicaBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>

            {cajaChicaSubTab === 'movimientos' ? (
              <>
                {/* Action Bar */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setShowCajaForm(!showCajaForm)}
                    className={`px-5 py-2.5 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                      showCajaForm ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    {showCajaForm ? 'Cancelar' : 'Registrar Movimiento'}
                  </button>

                  <select
                    value={cajaSort}
                    onChange={(e) => setCajaSort(e.target.value as any)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-primary/70 outline-none cursor-pointer"
                  >
                    <option value="recientes">Más Recientes</option>
                    <option value="antiguos">Más Antiguos</option>
                  </select>
                </div>

                {/* Inline Form */}
                {showCajaForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-primary/70 mb-1">Tipo</label>
                        <select
                          value={cajaForm.type}
                          onChange={(e) => setCajaForm({ ...cajaForm, type: e.target.value as any })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                        >
                          <option value="egreso">Egreso (-)</option>
                          <option value="ingreso">Ingreso (+)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-primary/70 mb-1">Área / Categoría</label>
                        <select
                          value={cajaForm.category}
                          onChange={(e) => setCajaForm({ ...cajaForm, category: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-primary outline-none focus:ring-2 focus:ring-secondary"
                        >
                          {tags.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                          <option value="Mantenimiento">Mantenimiento</option>
                          <option value="Limpieza / Insumos">Limpieza / Insumos</option>
                          <option value="Celebración / Arqueo">Celebración / Arqueo</option>
                          <option value="Otros">Otros</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-primary/70 mb-1">Concepto *</label>
                        <input
                          type="text"
                          placeholder="Descripción"
                          value={cajaForm.concept}
                          onChange={(e) => setCajaForm({ ...cajaForm, concept: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-primary outline-none focus:ring-2 focus:ring-secondary"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-primary/70 mb-1">Importe (€) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={cajaForm.amount}
                          onChange={(e) => setCajaForm({ ...cajaForm, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowCajaForm(false)}
                        className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveCajaMovement}
                        disabled={savingCaja}
                        className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {savingCaja ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  {sortedCajaMovements.length === 0 ? (
                    <div className="p-12 text-center text-primary/40">
                      <p className="font-bold text-primary/60 mb-1">No hay movimientos registrados.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">TIPO</th>
                            <th className="py-4 px-6">CATEGORÍA</th>
                            <th className="py-4 px-6">CONCEPTO</th>
                            <th className="py-4 px-6 text-right">IMPORTE</th>
                            <th className="py-4 px-6">REGISTRADO POR</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {sortedCajaMovements.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {m.date}
                              </td>
                              <td className="py-4 px-6 whitespace-nowrap">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                  m.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {m.type}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-medium text-primary/80 whitespace-nowrap">
                                {m.category}
                              </td>
                              <td className="py-4 px-6 font-semibold text-primary max-w-xs truncate">
                                {m.concept}
                              </td>
                              <td className={`py-4 px-6 text-right font-bold whitespace-nowrap ${
                                m.type === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {m.type === 'ingreso' ? '+' : '-'}{m.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 text-primary/60 whitespace-nowrap">
                                {m.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteCajaMovement(m.id!)}
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
              </>
            ) : (
              <div className="space-y-6">
                {/* Formulario Nuevo Arqueo de Caja Chica */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-indigo-600" />
                        Nuevo Arqueo de Caja Chica
                      </h3>
                      <p className="text-xs text-primary/60">Conteo físico de billetes y monedas para verificar el saldo de Caja Chica.</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-2xl text-right self-start sm:self-auto">
                      <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Saldo Teórico</span>
                      <span className="text-lg font-bold text-indigo-700">{cajaChicaBalance.toFixed(2)} €</span>
                    </div>
                  </div>

                  <form onSubmit={(e) => handleSaveModuleArqueo(
                    e,
                    'caja_chica',
                    cajaArqueoDate,
                    cajaArqueoBilletes,
                    cajaArqueoMonedas,
                    cajaChicaBalance,
                    cajaArqueoNotes,
                    setSavingCajaArqueo,
                    () => {
                      setCajaArqueoBilletes('');
                      setCajaArqueoMonedas('');
                      setCajaArqueoNotes('');
                    }
                  )} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Fecha del Arqueo</label>
                        <input
                          type="date"
                          value={cajaArqueoDate}
                          onChange={(e) => setCajaArqueoDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Total Billetes (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cajaArqueoBilletes}
                          onChange={(e) => setCajaArqueoBilletes(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Total Monedas (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cajaArqueoMonedas}
                          onChange={(e) => setCajaArqueoMonedas(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Resumen del Conteo Físico y Cuadre */}
                    {(() => {
                      const totalContado = (parseFloat(cajaArqueoBilletes) || 0) + (parseFloat(cajaArqueoMonedas) || 0);
                      const diff = totalContado - cajaChicaBalance;
                      return (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-4">
                            <div>
                              <span className="text-[10px] font-bold text-primary/50 uppercase block">Total Físico Contado</span>
                              <span className="text-xl font-black text-primary">{totalContado.toFixed(2)} €</span>
                            </div>
                            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                            <div>
                              <span className="text-[10px] font-bold text-primary/50 uppercase block">Diferencia / Cuadre</span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase inline-block ${
                                Math.abs(diff) < 0.01
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : diff > 0
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {Math.abs(diff) < 0.01
                                  ? 'Cuadrado (0,00 €)'
                                  : diff > 0
                                  ? `Sobrante (+${diff.toFixed(2)} €)`
                                  : `Faltante (${diff.toFixed(2)} €)`
                                }
                              </span>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={savingCajaArqueo}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {savingCajaArqueo ? 'Guardando...' : 'Guardar Arqueo'}
                          </button>
                        </div>
                      );
                    })()}

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">Observaciones / Incidencias</label>
                      <input
                        type="text"
                        placeholder="Comentarios adicionales sobre el arqueo..."
                        value={cajaArqueoNotes}
                        onChange={(e) => setCajaArqueoNotes(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </form>
                </div>

                {/* Histórico de Arqueos de Caja Chica */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <h4 className="text-lg font-kenao text-primary">Histórico de Arqueos de Caja Chica</h4>
                  {arqueos.filter(a => a.module === 'caja_chica').length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                      No hay arqueos de caja chica registrados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">TOTAL CONTADO</th>
                            <th className="py-4 px-6">SALDO TEÓRICO</th>
                            <th className="py-4 px-6">DIFERENCIA</th>
                            <th className="py-4 px-6">OBSERVACIONES</th>
                            <th className="py-4 px-6">RESPONSABLE</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {arqueos.filter(a => a.module === 'caja_chica').map(arq => {
                            const diff = arq.diferencia ?? ((arq.totalEfectivo) - (arq.expectedBalance ?? 0));
                            return (
                              <tr key={arq.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">{arq.date}</td>
                                <td className="py-4 px-6 font-bold text-indigo-700 whitespace-nowrap">{arq.totalEfectivo.toFixed(2)} €</td>
                                <td className="py-4 px-6 font-medium text-slate-600 whitespace-nowrap">{(arq.expectedBalance ?? 0).toFixed(2)} €</td>
                                <td className="py-4 px-6 whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                    Math.abs(diff) < 0.01 ? 'bg-emerald-100 text-emerald-800' : diff > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {Math.abs(diff) < 0.01 ? '0,00 €' : diff > 0 ? `+${diff.toFixed(2)} €` : `${diff.toFixed(2)} €`}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-primary/80 max-w-xs truncate">{arq.notes || '-'}</td>
                                <td className="py-4 px-6 text-primary/70 whitespace-nowrap">{arq.registeredByName || 'Financiero'}</td>
                                <td className="py-4 px-6 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeleteArqueo(arq.id!)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3B: CAFETERÍA                                                         */}
        {/* ========================================================================= */}
        {activeTab === 'cafeteria' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                      <Coffee className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-kenao text-primary">Cafetería</h2>
                  </div>
                  <p className="text-xs text-primary/60">Control de caja chica, ingresos, egresos y arqueos de Cafetería.</p>
                </div>

                {/* Saldo Badge */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-amber-50 border border-amber-200 px-5 py-3 rounded-2xl text-right">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-0.5">
                      Saldo Efectivo
                    </span>
                    <span className="text-2xl font-black text-amber-700 tracking-tight block">
                      {saldoCajaChicaCafeteria.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsive Sub-tabs Selector & Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setCafeteriaSubTab('caja_chica')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      cafeteriaSubTab === 'caja_chica' ? 'bg-white text-amber-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-amber-600" />
                    Caja Chica
                  </button>
                  <button
                    onClick={() => setCafeteriaSubTab('movimientos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      cafeteriaSubTab === 'movimientos' ? 'bg-white text-blue-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Movimientos
                  </button>
                  <button
                    onClick={() => setCafeteriaSubTab('ingresos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      cafeteriaSubTab === 'ingresos' || cafeteriaSubTab === 'arqueos' ? 'bg-white text-amber-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    Ingresos
                  </button>
                  <button
                    onClick={() => setCafeteriaSubTab('egresos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      cafeteriaSubTab === 'egresos' ? 'bg-white text-rose-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    Egresos
                  </button>
                </div>

                {cafeteriaSubTab === 'caja_chica' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={cafeteriaCajaMonthFilter}
                      onChange={(e) => setCafeteriaCajaMonthFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos los meses</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>

                    <select
                      value={cafeteriaCajaYearFilter}
                      onChange={(e) => setCafeteriaCajaYearFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos los años</option>
                      {Array.from(new Set([
                        ...cafeteriaIncomesList.map(i => new Date(i.date).getFullYear()),
                        ...cafeteriaEgresosList.map(e => new Date(e.date).getFullYear()),
                        new Date().getFullYear()
                      ]))
                      .filter(y => !isNaN(y))
                      .sort((a, b) => b - a)
                      .map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    {(cafeteriaCajaMonthFilter !== 'all' || cafeteriaCajaYearFilter !== 'all') && (
                      <button
                        onClick={() => { setCafeteriaCajaMonthFilter('all'); setCafeteriaCajaYearFilter('all'); }}
                        className="px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50 rounded-xl font-bold transition-all cursor-pointer"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                )}

                {cafeteriaSubTab === 'movimientos' && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por concepto, notas o usuario..."
                        value={cafeteriaMovSearch}
                        onChange={(e) => setCafeteriaMovSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      <button
                        onClick={() => setCafeteriaMovTypeFilter('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cafeteriaMovTypeFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-primary/60 hover:text-primary'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setCafeteriaMovTypeFilter('ingreso')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cafeteriaMovTypeFilter === 'ingreso' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-800'
                        }`}
                      >
                        Ingresos (+)
                      </button>
                      <button
                        onClick={() => setCafeteriaMovTypeFilter('egreso')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cafeteriaMovTypeFilter === 'egreso' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:text-rose-800'
                        }`}
                      >
                        Egresos (-)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 1. SUB-TAB: CAJA CHICA (DASHBOARD) */}
            {cafeteriaSubTab === 'caja_chica' && (
              <div className="space-y-6">

                {(() => {
                  const filteredIncomes = cafeteriaIncomesList.filter(i => {
                    if ((i as any).paymentMethod && (i as any).paymentMethod !== 'Efectivo') return false;
                    const d = new Date(i.date);
                    if (cafeteriaCajaYearFilter !== 'all' && d.getFullYear() !== parseInt(cafeteriaCajaYearFilter, 10)) return false;
                    if (cafeteriaCajaMonthFilter !== 'all' && (d.getMonth() + 1) !== parseInt(cafeteriaCajaMonthFilter, 10)) return false;
                    return true;
                  });

                  const filteredEgresos = cafeteriaEgresosList.filter(e => {
                    const d = new Date(e.date);
                    if (cafeteriaCajaYearFilter !== 'all' && d.getFullYear() !== parseInt(cafeteriaCajaYearFilter, 10)) return false;
                    if (cafeteriaCajaMonthFilter !== 'all' && (d.getMonth() + 1) !== parseInt(cafeteriaCajaMonthFilter, 10)) return false;
                    return true;
                  });

                  const totalIngresosEfectivoFiltrado = filteredIncomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                  const totalEgresosFiltrado = filteredEgresos.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                  const flujoNetoFiltrado = totalIngresosEfectivoFiltrado - totalEgresosFiltrado;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Ingresos</span>
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-emerald-600">
                            + {totalIngresosEfectivoFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-emerald-700/70">{filteredIncomes.length} ingresos registrados</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Egresos</span>
                            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                              <TrendingDown className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-rose-600">
                            - {totalEgresosFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-rose-700/70">{filteredEgresos.length} salidas registradas</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Flujo Neto</span>
                            <div className={`p-2 rounded-xl ${flujoNetoFiltrado >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              <RefreshCw className="w-4 h-4" />
                            </div>
                          </div>
                          <div className={`text-2xl font-black ${flujoNetoFiltrado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {flujoNetoFiltrado >= 0 ? '+' : ''} {flujoNetoFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-primary/50">Diferencia neta en el periodo</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-amber-600" />
                              Comparativa Mensual de Efectivo
                            </h4>
                            <span className="text-[11px] text-primary/50">Ingresos vs Egresos</span>
                          </div>

                          <div className="h-48 flex items-end gap-2 pt-6 border-b border-slate-100">
                            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((monthName, idx) => {
                              const mIncomes = filteredIncomes
                                .filter(i => new Date(i.date).getMonth() === idx)
                                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                              const mEgresos = filteredEgresos
                                .filter(e => new Date(e.date).getMonth() === idx)
                                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                              
                              const maxVal = Math.max(...[100, ...filteredIncomes.map(i => i.amount || 0), ...filteredEgresos.map(e => e.amount || 0)]);
                              const incHeight = maxVal > 0 ? (mIncomes / maxVal) * 100 : 0;
                              const egHeight = maxVal > 0 ? (mEgresos / maxVal) * 100 : 0;

                              return (
                                <div key={monthName} className="flex-1 flex flex-col items-center gap-1 group relative">
                                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                    <div className="text-emerald-400 font-bold">Ing: {mIncomes.toFixed(2)} €</div>
                                    <div className="text-rose-400 font-bold">Egr: {mEgresos.toFixed(2)} €</div>
                                  </div>

                                  <div className="w-full flex items-end justify-center gap-1 h-36">
                                    <div
                                      style={{ height: `${Math.max(incHeight, mIncomes > 0 ? 8 : 0)}%` }}
                                      className="w-1.5 sm:w-2.5 bg-emerald-500 rounded-t-sm transition-all"
                                    />
                                    <div
                                      style={{ height: `${Math.max(egHeight, mEgresos > 0 ? 8 : 0)}%` }}
                                      className="w-1.5 sm:w-2.5 bg-rose-500 rounded-t-sm transition-all"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-primary/60">{monthName}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-center gap-6 text-xs pt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                              <span className="font-semibold text-primary/70">Ingresos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-rose-500 rounded-sm" />
                              <span className="font-semibold text-primary/70">Egresos</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-rose-600" />
                                Distribución de Egresos
                              </h4>
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                                Total: {totalEgresosFiltrado.toFixed(2)} €
                              </span>
                            </div>

                            {filteredEgresos.length === 0 ? (
                              <div className="py-12 text-center text-xs text-primary/40">
                                No hay egresos registrados en el periodo seleccionado.
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {(Object.entries(
                                  filteredEgresos.reduce((acc, curr) => {
                                    const area = (curr as any).destination || (curr as any).concept || (curr as any).category || 'General';
                                    acc[area] = (acc[area] || 0) + (curr.amount || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                                ) as [string, number][])
                                .sort((a, b) => b[1] - a[1])
                                .map(([areaName, sumAmount]) => {
                                  const pct = totalEgresosFiltrado > 0 ? (sumAmount / totalEgresosFiltrado) * 100 : 0;
                                  return (
                                    <div key={areaName} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-primary">{areaName}</span>
                                        <span className="font-black text-rose-600">{sumAmount.toFixed(2)} € ({pct.toFixed(0)}%)</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          style={{ width: `${pct}%` }}
                                          className="h-full bg-rose-500 rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 text-[11px] text-primary/50 flex items-center justify-between">
                            <span>Datos sincronizados en tiempo real</span>
                            <button
                              onClick={() => setCafeteriaSubTab('movimientos')}
                              className="text-blue-600 hover:underline font-bold cursor-pointer"
                            >
                              Ver todos los movimientos →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2. SUB-TAB: MOVIMIENTOS */}
            {cafeteriaSubTab === 'movimientos' && (
              <div className="space-y-6">
                {(() => {
                  const incomesFormatted = cafeteriaIncomesList.map(i => ({
                    id: i.id!,
                    type: 'ingreso' as const,
                    date: i.date,
                    amount: i.amount,
                    paymentMethod: (i as any).paymentMethod || 'Efectivo',
                    destination: (i as any).category || (i as any).concept || 'Venta Cafetería',
                    notes: i.notes || '',
                    registeredByName: i.registeredByName || 'Financiero',
                    source: 'incomes'
                  }));

                  const egresosFormatted = cafeteriaEgresosList.map(e => ({
                    id: e.id!,
                    type: 'egreso' as const,
                    date: e.date,
                    amount: e.amount,
                    paymentMethod: 'Efectivo',
                    destination: (e as any).destination || (e as any).concept || (e as any).category || 'General',
                    notes: e.notes || '',
                    registeredByName: e.registeredByName || 'Financiero',
                    source: 'egresos'
                  }));

                  const combined = [...incomesFormatted, ...egresosFormatted]
                    .filter(m => {
                      if (cafeteriaMovTypeFilter !== 'all' && m.type !== cafeteriaMovTypeFilter) return false;
                      if (cafeteriaMovSearch.trim()) {
                        const q = cafeteriaMovSearch.toLowerCase();
                        return m.destination.toLowerCase().includes(q) ||
                               m.notes.toLowerCase().includes(q) ||
                               m.registeredByName.toLowerCase().includes(q) ||
                               m.date.includes(q);
                      }
                      return true;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-kenao text-primary">Movimientos Registrados</h4>
                      </div>

                      {combined.length === 0 ? (
                        <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                          No se encontraron movimientos con los filtros aplicados.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                                <th className="py-4 px-6">FECHA</th>
                                <th className="py-4 px-6">VALOR</th>
                                <th className="py-4 px-6">FORMA</th>
                                <th className="py-4 px-6">DESTINO</th>
                                <th className="py-4 px-6">OBSERVACIÓN</th>
                                <th className="py-4 px-6">USUARIO</th>
                                <th className="py-4 px-6 text-center">ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {combined.map(mov => (
                                <tr key={`${mov.source}-${mov.id}`} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                    {mov.date}
                                  </td>
                                  <td className="py-4 px-6 font-black whitespace-nowrap">
                                    <span className={mov.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}>
                                      {mov.type === 'ingreso' ? '+' : '-'} {mov.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                    {mov.paymentMethod}
                                  </td>
                                  <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                    {mov.destination}
                                  </td>
                                  <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                    {mov.notes || '-'}
                                  </td>
                                  <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                    {mov.registeredByName}
                                  </td>
                                  <td className="py-4 px-6 text-center whitespace-nowrap">
                                    <button
                                      onClick={() => handleDeleteCafeteriaMovement(mov.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar movimiento"
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
                  );
                })()}
              </div>
            )}

            {/* 3. SUB-TAB: INGRESOS & ARQUEOS */}
            {(cafeteriaSubTab === 'ingresos' || cafeteriaSubTab === 'arqueos') && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setShowCafeteriaIngresoForm(!showCafeteriaIngresoForm);
                      setShowCafeteriaArqueosInIngresos(false);
                      setCafeteriaSubTab('ingresos');
                    }}
                    className="h-10 px-5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {showCafeteriaIngresoForm ? 'Cerrar Formulario' : 'Nuevo Ingreso'}
                  </button>

                  <button
                    onClick={() => {
                      const nextState = !showCafeteriaArqueosInIngresos;
                      setShowCafeteriaArqueosInIngresos(nextState);
                      if (nextState) {
                        setShowCafeteriaIngresoForm(false);
                        setCafeteriaSubTab('arqueos');
                      } else {
                        setCafeteriaSubTab('ingresos');
                      }
                    }}
                    className={`h-10 px-5 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer border ${
                      showCafeteriaArqueosInIngresos || cafeteriaSubTab === 'arqueos'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Arqueos de Caja
                  </button>
                </div>

                {showCafeteriaIngresoForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                        <h3 className="text-lg font-kenao text-primary">Registrar Ingreso</h3>
                      </div>
                      <button
                        onClick={() => setShowCafeteriaIngresoForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-bold"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleSaveCafeteriaIncome} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Fecha</label>
                          <input
                            type="date"
                            required
                            value={cafeteriaIngresoForm.date}
                            onChange={(e) => setCafeteriaIngresoForm({ ...cafeteriaIngresoForm, date: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Valor (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0,00"
                            value={cafeteriaIngresoForm.amount}
                            onChange={(e) => setCafeteriaIngresoForm({ ...cafeteriaIngresoForm, amount: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Forma de Entrega</label>
                          <select
                            value={cafeteriaIngresoForm.paymentMethod}
                            onChange={(e) => setCafeteriaIngresoForm({ ...cafeteriaIngresoForm, paymentMethod: e.target.value as any })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Datafono">Datáfono</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Bizum">Bizum</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Categoría</label>
                          <input
                            type="text"
                            placeholder="Venta Cafetería..."
                            value={cafeteriaIngresoForm.category}
                            onChange={(e) => setCafeteriaIngresoForm({ ...cafeteriaIngresoForm, category: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Concepto / Descripción</label>
                          <input
                            type="text"
                            placeholder="Ej: Venta de café y desayunos..."
                            value={cafeteriaIngresoForm.concept}
                            onChange={(e) => setCafeteriaIngresoForm({ ...cafeteriaIngresoForm, concept: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Observación</label>
                          <input
                            type="text"
                            placeholder="Notas o detalles del ingreso (opcional)"
                            value={cafeteriaIngresoForm.notes}
                            onChange={(e) => setCafeteriaIngresoForm({ ...cafeteriaIngresoForm, notes: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingCafeteriaIngreso}
                          className="px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl text-xs hover:bg-amber-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {savingCafeteriaIngreso ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Guardar Ingreso
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {cafeteriaSubTab === 'ingresos' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-kenao text-primary">Ingresos Registrados</h4>
                    </div>

                    {cafeteriaIncomesList.length === 0 ? (
                      <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                        No hay ingresos de cafetería registrados.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                              <th className="py-4 px-6">FECHA</th>
                              <th className="py-4 px-6">VALOR</th>
                              <th className="py-4 px-6">FORMA</th>
                              <th className="py-4 px-6">CATEGORÍA</th>
                              <th className="py-4 px-6">CONCEPTO</th>
                              <th className="py-4 px-6">OBSERVACIÓN</th>
                              <th className="py-4 px-6">USUARIO</th>
                              <th className="py-4 px-6 text-center">ACCIONES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {cafeteriaIncomesList.map(inc => (
                              <tr key={inc.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                  {inc.date}
                                </td>
                                <td className="py-4 px-6 font-bold text-emerald-600 whitespace-nowrap">
                                  + {inc.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </td>
                                <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                  {(inc as any).paymentMethod || 'Efectivo'}
                                </td>
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                  {inc.category || 'Venta Cafetería'}
                                </td>
                                <td className="py-4 px-6 text-primary/80 whitespace-nowrap">
                                  {inc.concept || '-'}
                                </td>
                                <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                  {inc.notes || '-'}
                                </td>
                                <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                  {inc.registeredByName || 'Financiero'}
                                </td>
                                <td className="py-4 px-6 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeleteCafeteriaMovement(inc.id!)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Eliminar ingreso"
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
                )}
              </div>
            )}

            {/* SUB-TAB 2B: ARQUEOS DE CAJA CAFETERÍA */}
            {cafeteriaSubTab === 'arqueos' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Title Bar */}
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                      <Lock className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-kenao text-primary">Arqueo de Caja</h3>
                  </div>

                  {/* Date Selector */}
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary/60" />
                      <span className="text-sm font-bold text-primary">Fecha de Cierre:</span>
                    </div>
                    <input
                      type="date"
                      value={cafeteriaArqueoDate}
                      onChange={(e) => setCafeteriaArqueoDate(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Highlight Banner */}
                  <div className="bg-primary border border-primary p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-1">
                        TOTAL EFECTIVO RECAUDADO
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        Suma de todos los ingresos registrados en efectivo para la fecha seleccionada
                      </p>
                    </div>
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {totalEfectivoCafeteriaFechaArqueo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>

                  {/* Nuevo Cierre Inputs */}
                  <form onSubmit={(e) => handleSaveModuleArqueo(
                    e,
                    'cafeteria',
                    cafeteriaArqueoDate,
                    cafeteriaArqueoBilletes,
                    cafeteriaArqueoMonedas,
                    totalEfectivoCafeteriaFechaArqueo,
                    cafeteriaArqueoNotes,
                    setSavingCafeteriaArqueo,
                    () => {
                      setCafeteriaArqueoBilletes('');
                      setCafeteriaArqueoMonedas('');
                      setCafeteriaArqueoNotes('');
                    }
                  )} className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-3">Nuevo Cierre</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                            <Banknote className="w-4 h-4" />
                            Total Billetes (€)
                          </div>
                          <p className="text-[11px] text-slate-500">Dinero en papel contado</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={cafeteriaArqueoBilletes}
                              onChange={(e) => setCafeteriaArqueoBilletes(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                            <Coins className="w-4 h-4" />
                            Total Monedas (€)
                          </div>
                          <p className="text-[11px] text-slate-500">Monedas contadas</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={cafeteriaArqueoMonedas}
                              onChange={(e) => setCafeteriaArqueoMonedas(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">Notas del Cierre</label>
                      <textarea
                        rows={3}
                        placeholder="Observaciones sobre el arqueo, incidencias, etc."
                        value={cafeteriaArqueoNotes}
                        onChange={(e) => setCafeteriaArqueoNotes(e.target.value)}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-primary outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-100 px-6 py-3 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                        <span className="text-xs font-bold text-primary/70">Total Contado:</span>
                        <span className="text-lg font-black text-primary">
                          {((parseFloat(cafeteriaArqueoBilletes) || 0) + (parseFloat(cafeteriaArqueoMonedas) || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={savingCafeteriaArqueo}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {savingCafeteriaArqueo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirmar Cierre
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historial de Cierres Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h4 className="text-lg font-kenao text-primary">Historial de Cierres de Cafetería</h4>
                  {arqueos.filter(a => a.module === 'cafeteria').length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                      No hay cierres de cafetería registrados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">TOTAL CONTADO</th>
                            <th className="py-4 px-6">BILLETES</th>
                            <th className="py-4 px-6">MONEDAS</th>
                            <th className="py-4 px-6">SALDO TEÓRICO</th>
                            <th className="py-4 px-6">RESPONSABLE</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {arqueos.filter(a => a.module === 'cafeteria').map(arq => (
                            <tr key={arq.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {arq.date}
                              </td>
                              <td className="py-4 px-6 font-bold text-amber-700 whitespace-nowrap">
                                {arq.totalEfectivo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-emerald-700 whitespace-nowrap">
                                {arq.sobreBilletes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-purple-700 whitespace-nowrap">
                                {arq.bolsaMonedas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                                {(arq.expectedBalance ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                {arq.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteArqueo(arq.id!)}
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
            )}

            {/* 4. SUB-TAB: EGRESOS */}
            {cafeteriaSubTab === 'egresos' && (
              <div className="space-y-6">
                <button
                  onClick={() => setShowCafeteriaEgresoForm(!showCafeteriaEgresoForm)}
                  className="h-10 px-5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {showCafeteriaEgresoForm ? 'Cerrar Formulario' : 'Nuevo Egreso'}
                </button>

                {showCafeteriaEgresoForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-rose-600" />
                        <h3 className="text-lg font-kenao text-primary">Registrar Egreso</h3>
                      </div>
                      <button
                        onClick={() => setShowCafeteriaEgresoForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-bold"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleSaveCafeteriaEgreso} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Fecha *</label>
                          <input
                            type="date"
                            required
                            value={cafeteriaEgresoForm.date}
                            onChange={(e) => setCafeteriaEgresoForm({ ...cafeteriaEgresoForm, date: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Valor (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0,00"
                            value={cafeteriaEgresoForm.amount}
                            onChange={(e) => setCafeteriaEgresoForm({ ...cafeteriaEgresoForm, amount: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Destino / Categoría *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Café e Insumos, Leche, Servilletas..."
                            value={cafeteriaEgresoForm.destination}
                            onChange={(e) => setCafeteriaEgresoForm({ ...cafeteriaEgresoForm, destination: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Observación</label>
                        <input
                          type="text"
                          placeholder="Notas o motivo del egreso (opcional)"
                          value={cafeteriaEgresoForm.notes}
                          onChange={(e) => setCafeteriaEgresoForm({ ...cafeteriaEgresoForm, notes: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingCafeteriaEgreso}
                          className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {savingCafeteriaEgreso ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Registrar Egreso
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-kenao text-primary">Egresos Registrados</h4>
                  </div>

                  {cafeteriaEgresosList.length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                      No hay egresos registrados en Cafetería.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">VALOR</th>
                            <th className="py-4 px-6">FORMA</th>
                            <th className="py-4 px-6">DESTINO</th>
                            <th className="py-4 px-6">OBSERVACIÓN</th>
                            <th className="py-4 px-6">USUARIO</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {cafeteriaEgresosList.map(eg => (
                            <tr key={eg.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {eg.date}
                              </td>
                              <td className="py-4 px-6 font-bold text-rose-600 whitespace-nowrap">
                                - {eg.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                Efectivo
                              </td>
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {(eg as any).destination || (eg as any).concept || (eg as any).category || 'General'}
                              </td>
                              <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                {eg.notes || '-'}
                              </td>
                              <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                {eg.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteCafeteriaMovement(eg.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Eliminar egreso"
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
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3C: LIBRERÍA                                                          */}
        {/* ========================================================================= */}
        {activeTab === 'libreria' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-2 bg-primary/10 text-primary rounded-xl">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-kenao text-primary">Librería</h2>
                  </div>
                  <p className="text-xs text-primary/60">Control de caja chica, ingresos, egresos y arqueos de Librería.</p>
                </div>

                {/* Saldo Badge */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-2xl text-right">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                      Saldo Efectivo
                    </span>
                    <span className="text-2xl font-black text-emerald-700 tracking-tight block">
                      {saldoCajaChicaLibreria.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsive Sub-tabs Selector & Filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    onClick={() => setLibreriaSubTab('caja_chica')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      libreriaSubTab === 'caja_chica' ? 'bg-white text-emerald-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    Caja Chica
                  </button>
                  <button
                    onClick={() => setLibreriaSubTab('movimientos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      libreriaSubTab === 'movimientos' ? 'bg-white text-blue-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Movimientos
                  </button>
                  <button
                    onClick={() => setLibreriaSubTab('ingresos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      libreriaSubTab === 'ingresos' || libreriaSubTab === 'arqueos' ? 'bg-white text-emerald-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    Ingresos
                  </button>
                  <button
                    onClick={() => setLibreriaSubTab('egresos')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer flex items-center gap-1.5 ${
                      libreriaSubTab === 'egresos' ? 'bg-white text-rose-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    Egresos
                  </button>
                </div>

                {libreriaSubTab === 'caja_chica' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={libreriaCajaMonthFilter}
                      onChange={(e) => setLibreriaCajaMonthFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos los meses</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>

                    <select
                      value={libreriaCajaYearFilter}
                      onChange={(e) => setLibreriaCajaYearFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="all">Todos los años</option>
                      {Array.from(new Set([
                        ...libreriaIncomesList.map(i => new Date(i.date).getFullYear()),
                        ...libreriaEgresosList.map(e => new Date(e.date).getFullYear()),
                        new Date().getFullYear()
                      ]))
                      .filter(y => !isNaN(y))
                      .sort((a, b) => b - a)
                      .map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    {(libreriaCajaMonthFilter !== 'all' || libreriaCajaYearFilter !== 'all') && (
                      <button
                        onClick={() => { setLibreriaCajaMonthFilter('all'); setLibreriaCajaYearFilter('all'); }}
                        className="px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 rounded-xl font-bold transition-all cursor-pointer"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                  </div>
                )}

                {libreriaSubTab === 'movimientos' && (
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Buscar por concepto, notas o usuario..."
                        value={libreriaMovSearch}
                        onChange={(e) => setLibreriaMovSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                      <button
                        onClick={() => setLibreriaMovTypeFilter('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          libreriaMovTypeFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-primary/60 hover:text-primary'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setLibreriaMovTypeFilter('ingreso')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          libreriaMovTypeFilter === 'ingreso' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:text-emerald-800'
                        }`}
                      >
                        Ingresos (+)
                      </button>
                      <button
                        onClick={() => setLibreriaMovTypeFilter('egreso')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          libreriaMovTypeFilter === 'egreso' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:text-rose-800'
                        }`}
                      >
                        Egresos (-)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 1. SUB-TAB: CAJA CHICA (DASHBOARD) */}
            {libreriaSubTab === 'caja_chica' && (
              <div className="space-y-6">

                {(() => {
                  const filteredIncomes = libreriaIncomesList.filter(i => {
                    if ((i as any).paymentMethod && (i as any).paymentMethod !== 'Efectivo') return false;
                    const d = new Date(i.date);
                    if (libreriaCajaYearFilter !== 'all' && d.getFullYear() !== parseInt(libreriaCajaYearFilter, 10)) return false;
                    if (libreriaCajaMonthFilter !== 'all' && (d.getMonth() + 1) !== parseInt(libreriaCajaMonthFilter, 10)) return false;
                    return true;
                  });

                  const filteredEgresos = libreriaEgresosList.filter(e => {
                    const d = new Date(e.date);
                    if (libreriaCajaYearFilter !== 'all' && d.getFullYear() !== parseInt(libreriaCajaYearFilter, 10)) return false;
                    if (libreriaCajaMonthFilter !== 'all' && (d.getMonth() + 1) !== parseInt(libreriaCajaMonthFilter, 10)) return false;
                    return true;
                  });

                  const totalIngresosEfectivoFiltrado = filteredIncomes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                  const totalEgresosFiltrado = filteredEgresos.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                  const flujoNetoFiltrado = totalIngresosEfectivoFiltrado - totalEgresosFiltrado;

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Ingresos</span>
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                              <TrendingUp className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-emerald-600">
                            + {totalIngresosEfectivoFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-emerald-700/70">{filteredIncomes.length} ingresos registrados</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Egresos</span>
                            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                              <TrendingDown className="w-4 h-4" />
                            </div>
                          </div>
                          <div className="text-2xl font-black text-rose-600">
                            - {totalEgresosFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-rose-700/70">{filteredEgresos.length} salidas registradas</p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-primary/60 uppercase tracking-wider">Flujo Neto</span>
                            <div className={`p-2 rounded-xl ${flujoNetoFiltrado >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              <RefreshCw className="w-4 h-4" />
                            </div>
                          </div>
                          <div className={`text-2xl font-black ${flujoNetoFiltrado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {flujoNetoFiltrado >= 0 ? '+' : ''} {flujoNetoFiltrado.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </div>
                          <p className="text-[11px] text-primary/50">Diferencia neta en el periodo</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                              <Wallet className="w-4 h-4 text-emerald-600" />
                              Comparativa Mensual de Efectivo
                            </h4>
                            <span className="text-[11px] text-primary/50">Ingresos vs Egresos</span>
                          </div>

                          <div className="h-48 flex items-end gap-2 pt-6 border-b border-slate-100">
                            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((monthName, idx) => {
                              const mIncomes = filteredIncomes
                                .filter(i => new Date(i.date).getMonth() === idx)
                                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                              const mEgresos = filteredEgresos
                                .filter(e => new Date(e.date).getMonth() === idx)
                                .reduce((acc, curr) => acc + (curr.amount || 0), 0);
                              
                              const maxVal = Math.max(...[100, ...filteredIncomes.map(i => i.amount || 0), ...filteredEgresos.map(e => e.amount || 0)]);
                              const incHeight = maxVal > 0 ? (mIncomes / maxVal) * 100 : 0;
                              const egHeight = maxVal > 0 ? (mEgresos / maxVal) * 100 : 0;

                              return (
                                <div key={monthName} className="flex-1 flex flex-col items-center gap-1 group relative">
                                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] p-2 rounded-lg pointer-events-none z-10 whitespace-nowrap shadow-lg">
                                    <div className="text-emerald-400 font-bold">Ing: {mIncomes.toFixed(2)} €</div>
                                    <div className="text-rose-400 font-bold">Egr: {mEgresos.toFixed(2)} €</div>
                                  </div>

                                  <div className="w-full flex items-end justify-center gap-1 h-36">
                                    <div
                                      style={{ height: `${Math.max(incHeight, mIncomes > 0 ? 8 : 0)}%` }}
                                      className="w-1.5 sm:w-2.5 bg-emerald-500 rounded-t-sm transition-all"
                                    />
                                    <div
                                      style={{ height: `${Math.max(egHeight, mEgresos > 0 ? 8 : 0)}%` }}
                                      className="w-1.5 sm:w-2.5 bg-rose-500 rounded-t-sm transition-all"
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold text-primary/60">{monthName}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-center gap-6 text-xs pt-2">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                              <span className="font-semibold text-primary/70">Ingresos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-rose-500 rounded-sm" />
                              <span className="font-semibold text-primary/70">Egresos</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-rose-600" />
                                Distribución de Egresos
                              </h4>
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                                Total: {totalEgresosFiltrado.toFixed(2)} €
                              </span>
                            </div>

                            {filteredEgresos.length === 0 ? (
                              <div className="py-12 text-center text-xs text-primary/40">
                                No hay egresos registrados en el periodo seleccionado.
                              </div>
                            ) : (
                              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {(Object.entries(
                                  filteredEgresos.reduce((acc, curr) => {
                                    const area = (curr as any).destination || (curr as any).concept || (curr as any).category || 'General';
                                    acc[area] = (acc[area] || 0) + (curr.amount || 0);
                                    return acc;
                                  }, {} as Record<string, number>)
                                ) as [string, number][])
                                .sort((a, b) => b[1] - a[1])
                                .map(([areaName, sumAmount]) => {
                                  const pct = totalEgresosFiltrado > 0 ? (sumAmount / totalEgresosFiltrado) * 100 : 0;
                                  return (
                                    <div key={areaName} className="space-y-1">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-primary">{areaName}</span>
                                        <span className="font-black text-rose-600">{sumAmount.toFixed(2)} € ({pct.toFixed(0)}%)</span>
                                      </div>
                                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          style={{ width: `${pct}%` }}
                                          className="h-full bg-rose-500 rounded-full"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="pt-4 border-t border-slate-100 text-[11px] text-primary/50 flex items-center justify-between">
                            <span>Datos sincronizados en tiempo real</span>
                            <button
                              onClick={() => setLibreriaSubTab('movimientos')}
                              className="text-blue-600 hover:underline font-bold cursor-pointer"
                            >
                              Ver todos los movimientos →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 2. SUB-TAB: MOVIMIENTOS */}
            {libreriaSubTab === 'movimientos' && (
              <div className="space-y-6">
                {(() => {
                  const incomesFormatted = libreriaIncomesList.map(i => ({
                    id: i.id!,
                    type: 'ingreso' as const,
                    date: i.date,
                    amount: i.amount,
                    paymentMethod: (i as any).paymentMethod || 'Efectivo',
                    destination: (i as any).category || (i as any).concept || 'Venta Librería',
                    notes: i.notes || '',
                    registeredByName: i.registeredByName || 'Financiero',
                    source: 'incomes'
                  }));

                  const egresosFormatted = libreriaEgresosList.map(e => ({
                    id: e.id!,
                    type: 'egreso' as const,
                    date: e.date,
                    amount: e.amount,
                    paymentMethod: 'Efectivo',
                    destination: (e as any).destination || (e as any).concept || (e as any).category || 'General',
                    notes: e.notes || '',
                    registeredByName: e.registeredByName || 'Financiero',
                    source: 'egresos'
                  }));

                  const combined = [...incomesFormatted, ...egresosFormatted]
                    .filter(m => {
                      if (libreriaMovTypeFilter !== 'all' && m.type !== libreriaMovTypeFilter) return false;
                      if (libreriaMovSearch.trim()) {
                        const q = libreriaMovSearch.toLowerCase();
                        return m.destination.toLowerCase().includes(q) ||
                               m.notes.toLowerCase().includes(q) ||
                               m.registeredByName.toLowerCase().includes(q) ||
                               m.date.includes(q);
                      }
                      return true;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  return (
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-kenao text-primary">Movimientos Registrados</h4>
                      </div>

                      {combined.length === 0 ? (
                        <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                          No se encontraron movimientos con los filtros aplicados.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                                <th className="py-4 px-6">FECHA</th>
                                <th className="py-4 px-6">VALOR</th>
                                <th className="py-4 px-6">FORMA</th>
                                <th className="py-4 px-6">DESTINO</th>
                                <th className="py-4 px-6">OBSERVACIÓN</th>
                                <th className="py-4 px-6">USUARIO</th>
                                <th className="py-4 px-6 text-center">ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {combined.map(mov => (
                                <tr key={`${mov.source}-${mov.id}`} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                    {mov.date}
                                  </td>
                                  <td className="py-4 px-6 font-black whitespace-nowrap">
                                    <span className={mov.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}>
                                      {mov.type === 'ingreso' ? '+' : '-'} {mov.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                    {mov.paymentMethod}
                                  </td>
                                  <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                    {mov.destination}
                                  </td>
                                  <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                    {mov.notes || '-'}
                                  </td>
                                  <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                    {mov.registeredByName}
                                  </td>
                                  <td className="py-4 px-6 text-center whitespace-nowrap">
                                    <button
                                      onClick={() => handleDeleteLibreriaMovement(mov.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                      title="Eliminar movimiento"
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
                  );
                })()}
              </div>
            )}

            {/* 3. SUB-TAB: INGRESOS & ARQUEOS */}
            {(libreriaSubTab === 'ingresos' || libreriaSubTab === 'arqueos') && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setShowLibreriaIngresoForm(!showLibreriaIngresoForm);
                      setShowLibreriaArqueosInIngresos(false);
                      setLibreriaSubTab('ingresos');
                    }}
                    className="h-10 px-5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {showLibreriaIngresoForm ? 'Cerrar Formulario' : 'Nuevo Ingreso'}
                  </button>

                  <button
                    onClick={() => {
                      const nextState = !showLibreriaArqueosInIngresos;
                      setShowLibreriaArqueosInIngresos(nextState);
                      if (nextState) {
                        setShowLibreriaIngresoForm(false);
                        setLibreriaSubTab('arqueos');
                      } else {
                        setLibreriaSubTab('ingresos');
                      }
                    }}
                    className={`h-10 px-5 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer border ${
                      showLibreriaArqueosInIngresos || libreriaSubTab === 'arqueos'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Arqueos de Caja
                  </button>
                </div>

                {showLibreriaIngresoForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                        <h3 className="text-lg font-kenao text-primary">Registrar Ingreso</h3>
                      </div>
                      <button
                        onClick={() => setShowLibreriaIngresoForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-bold"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleSaveLibreriaIncome} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Fecha</label>
                          <input
                            type="date"
                            required
                            value={libreriaIngresoForm.date}
                            onChange={(e) => setLibreriaIngresoForm({ ...libreriaIngresoForm, date: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Valor (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0,00"
                            value={libreriaIngresoForm.amount}
                            onChange={(e) => setLibreriaIngresoForm({ ...libreriaIngresoForm, amount: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Forma de Entrega</label>
                          <select
                            value={libreriaIngresoForm.paymentMethod}
                            onChange={(e) => setLibreriaIngresoForm({ ...libreriaIngresoForm, paymentMethod: e.target.value as any })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Datafono">Datáfono</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Bizum">Bizum</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Categoría</label>
                          <input
                            type="text"
                            placeholder="Venta Libros, Material..."
                            value={libreriaIngresoForm.category}
                            onChange={(e) => setLibreriaIngresoForm({ ...libreriaIngresoForm, category: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Concepto / Descripción</label>
                          <input
                            type="text"
                            placeholder="Ej: Venta de biblias y devocionales..."
                            value={libreriaIngresoForm.concept}
                            onChange={(e) => setLibreriaIngresoForm({ ...libreriaIngresoForm, concept: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Observación</label>
                          <input
                            type="text"
                            placeholder="Notas o detalles del ingreso (opcional)"
                            value={libreriaIngresoForm.notes}
                            onChange={(e) => setLibreriaIngresoForm({ ...libreriaIngresoForm, notes: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingLibreriaIngreso}
                          className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {savingLibreriaIngreso ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Guardar Ingreso
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {libreriaSubTab === 'ingresos' && (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-kenao text-primary">Ingresos Registrados</h4>
                    </div>

                    {libreriaIncomesList.length === 0 ? (
                      <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                        No hay ingresos de librería registrados.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                              <th className="py-4 px-6">FECHA</th>
                              <th className="py-4 px-6">VALOR</th>
                              <th className="py-4 px-6">FORMA</th>
                              <th className="py-4 px-6">CATEGORÍA</th>
                              <th className="py-4 px-6">CONCEPTO</th>
                              <th className="py-4 px-6">OBSERVACIÓN</th>
                              <th className="py-4 px-6">USUARIO</th>
                              <th className="py-4 px-6 text-center">ACCIONES</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {libreriaIncomesList.map(inc => (
                              <tr key={inc.id} className="hover:bg-slate-50/60 transition-colors">
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                  {inc.date}
                                </td>
                                <td className="py-4 px-6 font-bold text-emerald-600 whitespace-nowrap">
                                  + {inc.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </td>
                                <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                  {(inc as any).paymentMethod || 'Efectivo'}
                                </td>
                                <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                  {inc.category || 'Venta Libros'}
                                </td>
                                <td className="py-4 px-6 text-primary/80 whitespace-nowrap">
                                  {inc.concept || '-'}
                                </td>
                                <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                  {inc.notes || '-'}
                                </td>
                                <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                  {inc.registeredByName || 'Financiero'}
                                </td>
                                <td className="py-4 px-6 text-center whitespace-nowrap">
                                  <button
                                    onClick={() => handleDeleteLibreriaMovement(inc.id!)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    title="Eliminar ingreso"
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
                )}
              </div>
            )}

            {/* SUB-TAB 2B: ARQUEOS DE CAJA LIBRERÍA */}
            {libreriaSubTab === 'arqueos' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Title Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-kenao text-primary">Arqueo de Caja</h3>
                  </div>

                  {/* Date Selector */}
                  <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary/60" />
                      <span className="text-sm font-bold text-primary">Fecha de Cierre:</span>
                    </div>
                    <input
                      type="date"
                      value={libreriaArqueoDate}
                      onChange={(e) => setLibreriaArqueoDate(e.target.value)}
                      className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Highlight Banner */}
                  <div className="bg-primary border border-primary p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200 mb-1">
                        TOTAL EFECTIVO RECAUDADO
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        Suma de todos los ingresos registrados en efectivo para la fecha seleccionada
                      </p>
                    </div>
                    <span className="text-4xl font-extrabold text-white tracking-tight">
                      {totalEfectivoLibreriaFechaArqueo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </span>
                  </div>

                  {/* Nuevo Cierre Inputs */}
                  <form onSubmit={(e) => handleSaveModuleArqueo(
                    e,
                    'libreria',
                    libreriaArqueoDate,
                    libreriaArqueoBilletes,
                    libreriaArqueoMonedas,
                    totalEfectivoLibreriaFechaArqueo,
                    libreriaArqueoNotes,
                    setSavingLibreriaArqueo,
                    () => {
                      setLibreriaArqueoBilletes('');
                      setLibreriaArqueoMonedas('');
                      setLibreriaArqueoNotes('');
                    }
                  )} className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold text-primary mb-3">Nuevo Cierre</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                            <Banknote className="w-4 h-4" />
                            Total Billetes (€)
                          </div>
                          <p className="text-[11px] text-slate-500">Dinero en papel contado</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={libreriaArqueoBilletes}
                              onChange={(e) => setLibreriaArqueoBilletes(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                            <Coins className="w-4 h-4" />
                            Total Monedas (€)
                          </div>
                          <p className="text-[11px] text-slate-500">Monedas contadas</p>
                          <div className="relative pt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">€</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={libreriaArqueoMonedas}
                              onChange={(e) => setLibreriaArqueoMonedas(e.target.value)}
                              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">Notas del Cierre</label>
                      <textarea
                        rows={3}
                        placeholder="Observaciones sobre el arqueo, incidencias, etc."
                        value={libreriaArqueoNotes}
                        onChange={(e) => setLibreriaArqueoNotes(e.target.value)}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-xs text-primary outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-100 px-6 py-3 rounded-xl flex items-center justify-between sm:justify-start gap-4">
                        <span className="text-xs font-bold text-primary/70">Total Contado:</span>
                        <span className="text-lg font-black text-primary">
                          {((parseFloat(libreriaArqueoBilletes) || 0) + (parseFloat(libreriaArqueoMonedas) || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={savingLibreriaArqueo}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                      >
                        {savingLibreriaArqueo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Confirmar Cierre
                      </button>
                    </div>
                  </form>
                </div>

                {/* Historial de Cierres Table */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <h4 className="text-lg font-kenao text-primary">Historial de Cierres de Librería</h4>
                  {arqueos.filter(a => a.module === 'libreria').length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                      No hay cierres de librería registrados.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">TOTAL CONTADO</th>
                            <th className="py-4 px-6">BILLETES</th>
                            <th className="py-4 px-6">MONEDAS</th>
                            <th className="py-4 px-6">SALDO TEÓRICO</th>
                            <th className="py-4 px-6">RESPONSABLE</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {arqueos.filter(a => a.module === 'libreria').map(arq => (
                            <tr key={arq.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {arq.date}
                              </td>
                              <td className="py-4 px-6 font-bold text-emerald-700 whitespace-nowrap">
                                {arq.totalEfectivo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-emerald-700 whitespace-nowrap">
                                {arq.sobreBilletes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-purple-700 whitespace-nowrap">
                                {arq.bolsaMonedas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-slate-700 whitespace-nowrap">
                                {(arq.expectedBalance ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                {arq.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteArqueo(arq.id!)}
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
            )}

            {/* 4. SUB-TAB: EGRESOS */}
            {libreriaSubTab === 'egresos' && (
              <div className="space-y-6">
                <div>
                  <button
                    onClick={() => setShowLibreriaEgresoForm(!showLibreriaEgresoForm)}
                    className="h-10 px-5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {showLibreriaEgresoForm ? 'Cerrar Formulario' : 'Nuevo Egreso'}
                  </button>
                </div>

                {showLibreriaEgresoForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5 text-rose-600" />
                        <h3 className="text-lg font-kenao text-primary">Registrar Egreso</h3>
                      </div>
                      <button
                        onClick={() => setShowLibreriaEgresoForm(false)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer font-bold"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    <form onSubmit={handleSaveLibreriaEgreso} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Fecha *</label>
                          <input
                            type="date"
                            required
                            value={libreriaEgresoForm.date}
                            onChange={(e) => setLibreriaEgresoForm({ ...libreriaEgresoForm, date: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Valor (€) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            placeholder="0,00"
                            value={libreriaEgresoForm.amount}
                            onChange={(e) => setLibreriaEgresoForm({ ...libreriaEgresoForm, amount: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-primary/70 mb-1">Destino / Categoría *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Libros, Biblias, Materiales..."
                            value={libreriaEgresoForm.destination}
                            onChange={(e) => setLibreriaEgresoForm({ ...libreriaEgresoForm, destination: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Observación</label>
                        <input
                          type="text"
                          placeholder="Notas o motivo del egreso (opcional)"
                          value={libreriaEgresoForm.notes}
                          onChange={(e) => setLibreriaEgresoForm({ ...libreriaEgresoForm, notes: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingLibreriaEgreso}
                          className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
                        >
                          {savingLibreriaEgreso ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Registrar Egreso
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-kenao text-primary">Egresos Registrados</h4>
                  </div>

                  {libreriaEgresosList.length === 0 ? (
                    <div className="p-8 text-center text-primary/40 border border-slate-100 rounded-2xl text-xs">
                      No hay egresos registrados en Librería.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                            <th className="py-4 px-6">FECHA</th>
                            <th className="py-4 px-6">VALOR</th>
                            <th className="py-4 px-6">FORMA</th>
                            <th className="py-4 px-6">DESTINO</th>
                            <th className="py-4 px-6">OBSERVACIÓN</th>
                            <th className="py-4 px-6">USUARIO</th>
                            <th className="py-4 px-6 text-center">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {libreriaEgresosList.map(eg => (
                            <tr key={eg.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {eg.date}
                              </td>
                              <td className="py-4 px-6 font-bold text-rose-600 whitespace-nowrap">
                                - {eg.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </td>
                              <td className="py-4 px-6 font-semibold text-primary/80 whitespace-nowrap">
                                Efectivo
                              </td>
                              <td className="py-4 px-6 font-bold text-primary whitespace-nowrap">
                                {(eg as any).destination || (eg as any).concept || (eg as any).category || 'General'}
                              </td>
                              <td className="py-4 px-6 text-primary/70 max-w-xs truncate">
                                {eg.notes || '-'}
                              </td>
                              <td className="py-4 px-6 text-primary/70 whitespace-nowrap">
                                {eg.registeredByName || 'Financiero'}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <button
                                  onClick={() => handleDeleteLibreriaMovement(eg.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Eliminar egreso"
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
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REEMBOLSOS                                                         */}
        {/* ========================================================================= */}
        {activeTab === 'reembolsos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-kenao text-primary">Solicitudes de Reembolso</h2>
                <p className="text-xs text-primary/60">
                  Revisa, firma y administra las solicitudes de reembolso de gastos realizadas por los miembros.
                </p>
              </div>


            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-primary/50 tracking-wider block mb-1">
                  Total Solicitudes
                </span>
                <span className="text-2xl font-kenao text-primary">
                  {reembolsos.length}
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider block mb-1">
                  Pendientes (0 Firmas)
                </span>
                <span className="text-2xl font-kenao text-amber-600">
                  {reembolsos.filter(r => r.status === 'pendiente').length}
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-blue-600 tracking-wider block mb-1">
                  Incompletos (1/2 Firmas)
                </span>
                <span className="text-2xl font-kenao text-blue-600">
                  {reembolsos.filter(r => r.status === 'incompleto').length}
                </span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 tracking-wider block mb-1">
                  Completados
                </span>
                <span className="text-2xl font-kenao text-emerald-600">
                  {reembolsos.filter(r => r.status === 'completado').length}
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por código, solicitante, concepto o área..."
                  value={reembolsosSearch}
                  onChange={(e) => setReembolsosSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(['todos', 'pendiente', 'incompleto', 'completado'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setReembolsosFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                      reembolsosFilter === s 
                        ? s === 'completado' ? 'bg-emerald-600 text-white shadow-sm'
                          : s === 'incompleto' ? 'bg-blue-600 text-white shadow-sm'
                          : s === 'pendiente' ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-primary text-white shadow-sm'
                        : 'text-primary/60 hover:text-primary'
                    }`}
                  >
                    {s} ({reembolsos.filter(r => s === 'todos' || r.status === s).length})
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredReembolsos.length === 0 ? (
                <div className="p-12 text-center text-primary/40">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="font-bold text-primary/60 mb-1">No hay solicitudes de reembolso</p>
                  <p className="text-xs">Usa el botón "Nueva Solicitud" para generar un formulario de gastos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase text-primary/50 tracking-wider">
                        <th className="py-4 px-6">CÓDIGO / FECHA</th>
                        <th className="py-4 px-6">SOLICITANTE</th>
                        <th className="py-4 px-6">ÁREA & CONCEPTO</th>
                        <th className="py-4 px-6">IMPORTE / FORMA PAGO</th>
                        <th className="py-4 px-6">ESTADO & FIRMAS</th>
                        <th className="py-4 px-6 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredReembolsos.map(r => {
                        const hasUserSigned = r.signatures?.some(s => s.uid === user?.uid);
                        const requiredSigs = r.paymentMethod === 'Efectivo' ? 1 : 2;
                        const sigsCount = r.signatures?.length || 0;

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            
                            {/* Code & Date */}
                            <td className="py-4 px-6 font-mono font-bold text-primary whitespace-nowrap">
                              <span className="block text-xs font-black text-primary bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block mb-1">
                                {r.code}
                              </span>
                              <span className="block text-[11px] text-primary/50 font-normal">
                                {r.date}
                              </span>
                            </td>

                            {/* Solicitante */}
                            <td className="py-4 px-6">
                              <span className="font-bold text-primary block">{r.createdByName}</span>
                              <span className="text-[11px] text-primary/60 block">{r.createdByEmail}</span>
                              {r.createdByPhone && (
                                <span className="text-[10px] text-primary/40 block font-mono">{r.createdByPhone}</span>
                              )}
                            </td>

                            {/* Area & Concept */}
                            <td className="py-4 px-6 max-w-xs">
                              <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-bold text-[10px] mb-1">
                                [{r.areaInitials}] {r.areaName}
                              </span>
                              <p className="font-semibold text-primary/90 truncate" title={r.concept}>
                                {r.concept}
                              </p>
                              {r.attachments && r.attachments.length > 0 ? (
                                <button
                                  onClick={() => setSelectedReembolsoDetail(r)}
                                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Ver adjuntos de esta solicitud en Drive"
                                >
                                  <HardDrive className="w-3 h-3 text-emerald-600" />
                                  {r.attachments.length} adjunto(s) Drive
                                </button>
                              ) : r.receiptUrl ? (
                                <a
                                  href={r.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[10px] font-bold hover:bg-slate-200 transition-colors"
                                >
                                  <Paperclip className="w-3 h-3 text-slate-500" />
                                  Ver Comprobante
                                </a>
                              ) : null}
                            </td>

                            {/* Amount & Payment Method */}
                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className="text-sm font-black text-primary block">
                                {r.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase mt-1 ${
                                r.paymentMethod === 'Efectivo' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {r.paymentMethod}
                              </span>
                              {r.iban && (
                                <span className="block text-[10px] font-mono text-primary/50 mt-0.5 truncate max-w-[150px]" title={r.iban}>
                                  IBAN: {r.iban}
                                </span>
                              )}
                            </td>

                            {/* Status & Signatures */}
                            <td className="py-4 px-6">
                              {/* Status Badge */}
                              <div className="mb-1.5">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 ${
                                  r.status === 'completado' 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : r.status === 'incompleto' 
                                      ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {r.status === 'completado' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                  {r.status === 'incompleto' && <PenTool className="w-3 h-3 text-blue-600" />}
                                  {r.status === 'pendiente' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                                  {r.status} ({sigsCount}/{requiredSigs} firmas)
                                </span>
                              </div>

                              {/* Registered Signatures list */}
                              {r.signatures && r.signatures.length > 0 ? (
                                <div className="space-y-1">
                                  {r.signatures.map((s, idx) => (
                                    <div key={idx} className="text-[10px] text-primary/70 flex items-center gap-1">
                                      <UserCheck className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                      <span className="font-semibold">{s.name}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-primary/40 italic">Sin firmas aún</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {!hasUserSigned && r.status !== 'completado' && (
                                  <button
                                    onClick={() => handleSignReembolso(r)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                    title="Firmar Reembolso"
                                  >
                                    <PenTool className="w-3.5 h-3.5" />
                                    Firmar
                                  </button>
                                )}

                                {hasUserSigned && (
                                  <button
                                    onClick={() => handleUnsignReembolso(r)}
                                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                    title="Retirar mi Firma"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Retirar Firma
                                  </button>
                                )}

                                <button
                                  onClick={() => setSelectedReembolsoDetail(r)}
                                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                                  title="Ver Detalles Completos"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteReembolso(r);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                  title="Eliminar Solicitud de Reembolso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: DETALLES DE REEMBOLSO                                             */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {selectedReembolsoDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
              >
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-purple-600" />
                    <div>
                      <h3 className="text-lg font-kenao text-primary">Detalle de Solicitud de Reembolso</h3>
                      <p className="text-xs font-mono font-bold text-primary/60">{selectedReembolsoDetail.code}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedReembolsoDetail(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-primary/50 block">Solicitante</span>
                      <span className="font-extrabold text-primary block text-sm">{selectedReembolsoDetail.createdByName}</span>
                      <span className="text-primary/60 block">{selectedReembolsoDetail.createdByEmail}</span>
                      {selectedReembolsoDetail.createdByPhone && (
                        <span className="text-primary/40 block font-mono">{selectedReembolsoDetail.createdByPhone}</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-primary/50 block">Fecha & Importe</span>
                      <span className="font-mono text-primary block">{selectedReembolsoDetail.date}</span>
                      <span className="text-xl font-extrabold text-primary block mt-1">
                        {selectedReembolsoDetail.amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-primary/50 block mb-1">Área Destinataria</span>
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary font-extrabold rounded-lg">
                      [{selectedReembolsoDetail.areaInitials}] {selectedReembolsoDetail.areaName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-primary/50 block mb-1">Concepto / Motivo</span>
                    <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-primary leading-relaxed">
                      {selectedReembolsoDetail.concept}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-primary/50 block mb-1">Forma de Devolución</span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-primary">
                      {selectedReembolsoDetail.paymentMethod}
                      {selectedReembolsoDetail.iban && (
                        <div className="mt-1 font-mono text-xs text-blue-700 bg-white p-2 rounded border border-blue-200 flex items-center justify-between">
                          <span>{selectedReembolsoDetail.iban}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedReembolsoDetail.iban || '');
                              alert("IBAN copiado al portapapeles.");
                            }}
                            className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                            title="Copiar IBAN"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Google Drive & Local Attachments Section */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase text-primary/60 flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                        Comprobantes y Archivos Adjuntos
                      </span>
                      {selectedReembolsoDetail.attachments && selectedReembolsoDetail.attachments.length > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {selectedReembolsoDetail.attachments.length} Archivo(s)
                        </span>
                      )}
                    </div>

                    {selectedReembolsoDetail.attachments && selectedReembolsoDetail.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {selectedReembolsoDetail.attachments.map((att, idx) => {
                          const fileUrl = att.url || att.webViewLink || '';
                          const isImage = (att.mimeType && att.mimeType.startsWith('image/')) ||
                                          fileUrl.startsWith('data:image/') ||
                                          Boolean(fileUrl.match(/\.(jpg|jpeg|png|webp|gif|bmp)/i));

                          return (
                            <div
                              key={idx}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                                    <Paperclip className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="truncate">
                                    <p className="font-bold text-primary truncate text-xs">{att.name}</p>
                                    <span className="text-[10px] text-emerald-700 font-medium block truncate">
                                      {att.webViewLink && att.webViewLink.startsWith('http') ? 'Guardado en Drive (Finanzas/Reembolsos/Adjuntos)' : 'Adjunto de solicitud'}
                                    </span>
                                  </div>
                                </div>
                                {att.webViewLink && att.webViewLink.startsWith('http') && (
                                  <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                    Google Drive
                                  </span>
                                )}
                              </div>

                              {/* Live Image Preview Thumbnail */}
                              {isImage && fileUrl && (
                                <div
                                  onClick={() => setPreviewModalImage({ url: fileUrl, name: att.name })}
                                  className="relative group bg-slate-200/60 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2 max-h-44 cursor-pointer"
                                >
                                  <img
                                    src={fileUrl}
                                    alt={att.name}
                                    className="max-h-40 object-contain rounded-lg shadow-xs"
                                  />
                                  <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1">
                                    <Eye className="w-4 h-4" />
                                    Ver Foto Ampliada
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center gap-2 justify-end pt-1">
                                {isImage && fileUrl && (
                                  <button
                                    onClick={() => setPreviewModalImage({ url: fileUrl, name: att.name })}
                                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    Ver Ampliado
                                  </button>
                                )}

                                {att.webViewLink && att.webViewLink.startsWith('http') && (
                                  <a
                                    href={att.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-xs"
                                  >
                                    Ver en Drive
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}

                                {fileUrl && (
                                  <button
                                    onClick={() => safeOpenAttachment(fileUrl, att.name)}
                                    className="px-3 py-1.5 bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold hover:bg-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Abrir / Descargar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : selectedReembolsoDetail.receiptUrl ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="w-4 h-4 text-primary/60 flex-shrink-0" />
                            <span className="font-mono text-xs text-primary/80 truncate">
                              {selectedReembolsoDetail.receiptUrl.startsWith('data:') ? 'Comprobante adjunto (Imagen/PDF)' : selectedReembolsoDetail.receiptUrl}
                            </span>
                          </div>
                        </div>

                        {selectedReembolsoDetail.receiptUrl.startsWith('data:image/') && (
                          <div
                            onClick={() => setPreviewModalImage({ url: selectedReembolsoDetail.receiptUrl, name: 'Comprobante' })}
                            className="relative group bg-slate-200/60 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center p-2 max-h-44 cursor-pointer"
                          >
                            <img
                              src={selectedReembolsoDetail.receiptUrl}
                              alt="Comprobante"
                              className="max-h-40 object-contain rounded-lg shadow-xs"
                            />
                            <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1">
                              <Eye className="w-4 h-4" />
                              Ver Comprobante Ampliado
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          {selectedReembolsoDetail.receiptUrl.startsWith('data:image/') && (
                            <button
                              onClick={() => setPreviewModalImage({ url: selectedReembolsoDetail.receiptUrl, name: 'Comprobante' })}
                              className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver Ampliado
                            </button>
                          )}
                          <button
                            onClick={() => safeOpenAttachment(selectedReembolsoDetail.receiptUrl, 'Comprobante')}
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-[11px] font-bold hover:bg-secondary hover:text-primary transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer"
                          >
                            Abrir Comprobante
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-primary/40 italic text-center">
                        No hay archivos adjuntos para esta solicitud.
                      </p>
                    )}
                  </div>

                  {selectedReembolsoDetail.notes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-primary/50 block mb-1">Observaciones</span>
                      <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-primary/80">
                        {selectedReembolsoDetail.notes}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold uppercase text-primary/50 block mb-1">Firmas Registradas</span>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                      {selectedReembolsoDetail.signatures && selectedReembolsoDetail.signatures.length > 0 ? (
                        selectedReembolsoDetail.signatures.map((s, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-800 flex items-center gap-1">
                              ✓ {s.name} ({s.email})
                            </span>
                            <span className="font-mono text-[10px] text-primary/40">
                              {new Date(s.signedAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-primary/40 italic">Ninguna firma registrada aún.</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-100">
                    <button
                      onClick={() => {
                        const r = selectedReembolsoDetail;
                        setSelectedReembolsoDetail(null);
                        handleDeleteReembolso(r);
                      }}
                      className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar Solicitud
                    </button>
                    <button
                      onClick={() => setSelectedReembolsoDetail(null)}
                      className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-secondary hover:text-primary transition-all cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL CONFIRMACION ELIMINAR REEMBOLSO */}
        <AnimatePresence>
          {reembolsoToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 p-6 space-y-4 text-center"
              >
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-kenao text-primary">¿Eliminar Solicitud?</h3>
                  <p className="text-xs text-primary/70 mt-1 leading-relaxed">
                    ¿Estás seguro de que deseas eliminar la solicitud de reembolso <strong className="text-primary font-mono font-bold">[{reembolsoToDelete.code || reembolsoToDelete.id}]</strong>?
                    <br />
                    <span className="text-red-600 font-medium block mt-1">Esta acción es permanente y no se puede deshacer.</span>
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setReembolsoToDelete(null)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteReembolso}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Sí, Eliminar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL LIGHTBOX: VISUALIZADOR DE IMAGEN EN COMPROBANTES */}
        <AnimatePresence>
          {previewModalImage && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-primary text-sm truncate max-w-md">{previewModalImage.name}</h3>
                  </div>
                  <button
                    onClick={() => setPreviewModalImage(null)}
                    className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-950/90 min-h-[350px]">
                  <img
                    src={previewModalImage.url}
                    alt={previewModalImage.name}
                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                  />
                </div>
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                  <button
                    onClick={() => safeOpenAttachment(previewModalImage.url, previewModalImage.name)}
                    className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl hover:bg-secondary hover:text-primary transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir en pestaña nueva / Descargar
                  </button>
                  <button
                    onClick={() => setPreviewModalImage(null)}
                    className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: GESTIONAR ETIQUETAS Y CATEGORÍAS                                  */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isTagModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100"
              >
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-teal-600" />
                    <h3 className="text-xl font-kenao text-primary">Gestionar Etiquetas y Categorías</h3>
                  </div>
                  <button
                    onClick={() => setIsTagModalOpen(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6 text-xs">
                  {/* Form Create Tag */}
                  <form onSubmit={handleCreateTag} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nueva Categoría (Ej: Mantenimiento)"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-grow px-4 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-secondary"
                    />
                    <select
                      value={newTagType}
                      onChange={(e) => setNewTagType(e.target.value as any)}
                      className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-primary bg-white outline-none"
                    >
                      <option value="egreso">Egreso</option>
                      <option value="ingreso">Ingreso</option>
                    </select>
                    <button
                      type="submit"
                      className="p-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </form>

                  {/* Filter Tags Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTagModalFilter('all')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                        tagModalFilter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-primary/60 hover:text-primary'
                      }`}
                    >
                      Todos ({tags.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagModalFilter('ingreso')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                        tagModalFilter === 'ingreso' ? 'bg-white text-emerald-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                      }`}
                    >
                      Ingresos
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagModalFilter('egreso')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-center transition-all ${
                        tagModalFilter === 'egreso' ? 'bg-white text-red-700 shadow-sm' : 'text-primary/60 hover:text-primary'
                      }`}
                    >
                      Egresos
                    </button>
                  </div>

                  {/* Tags Table */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    {tags.filter(t => tagModalFilter === 'all' || t.type === tagModalFilter).length === 0 ? (
                      <div className="p-6 text-center text-primary/40">No hay categorías.</div>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-primary/50">
                            <th className="py-3 px-4">Nombre</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tags
                            .filter(t => tagModalFilter === 'all' || t.type === tagModalFilter)
                            .map(t => (
                              <tr key={t.id} className="hover:bg-slate-50/50">
                                <td className="py-3 px-4 font-bold text-primary">{t.name}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                    t.type === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {t.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTag(t.id!)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Sync Official Tags Button */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-primary/50">¿Faltan categorías predeterminadas?</span>
                    <button
                      type="button"
                      onClick={handleSyncDefaultTags}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
                      Sincronizar Etiquetas Oficiales
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* MODAL: ASISTENTE CHAT CORRECCIÓN IA DE ETIQUETADO                        */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {aiChatMovement && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
              >
                {/* Modal Header */}
                <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      <Sparkles className="w-5 h-5 text-amber-100" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold flex items-center gap-2">
                        Asistente de Corrección IA
                      </h3>
                      <p className="text-[11px] text-amber-100 font-medium">
                        Corrige y perfecciona la etiqueta de este movimiento bancario
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAiChatMovement(null)}
                    className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Movement Info Banner */}
                <div className="bg-slate-50 p-4 border-b border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary/40 block">Fecha & Tipo</span>
                    <span className="font-bold text-primary block">{aiChatMovement.date}</span>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                      aiChatMovement.amount >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {aiChatMovement.amount >= 0 ? 'INGRESO (+)' : 'EGRESO (-)'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-primary/40 block">Importe</span>
                    <span className={`font-black text-sm block ${
                      aiChatMovement.amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {aiChatMovement.amount >= 0 ? '+' : ''}{aiChatMovement.amount.toFixed(2)} €
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block">
                      Etiqueta actual: <span className="text-amber-700 font-black">{aiChatMovement.categoryName || 'Sin Etiquetar'}</span>
                    </span>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] font-black uppercase text-primary/40 block">Concepto</span>
                    <span className="font-medium text-slate-700 block truncate">{aiChatMovement.concept}</span>
                    {aiChatMovement.beneficiary && (
                      <span className="text-[11px] text-slate-500 block truncate">
                        Beneficiario/Ordenante: <strong>{aiChatMovement.beneficiary}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Chat Message Scroll Box */}
                <div className="p-4 overflow-y-auto space-y-3 flex-grow max-h-[300px] bg-slate-50/40">
                  {aiChatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[82%] p-3 rounded-2xl text-xs whitespace-pre-line shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-primary text-white font-medium rounded-tr-none'
                          : 'bg-white text-primary border border-slate-200/80 rounded-tl-none font-medium'
                      }`}>
                        <p>{msg.text}</p>
                        {msg.time && (
                          <span className={`text-[9px] block text-right mt-1 font-mono ${
                            msg.sender === 'user' ? 'text-white/60' : 'text-slate-400'
                          }`}>
                            {msg.time}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {isAiProcessing && (
                    <div className="flex gap-2.5 items-center text-xs text-amber-700 font-bold bg-amber-50 p-3 rounded-2xl border border-amber-200/60 w-fit">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                      Procesando corrección con IA...
                    </div>
                  )}
                </div>

                {/* Quick Tag Selector Buttons */}
                <div className="p-3 bg-white border-t border-slate-100">
                  <div className="text-[10px] font-black uppercase text-primary/40 mb-1.5 px-1">
                    Selección directa de etiquetas oficiales:
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                    {DEFAULT_CATEGORIES
                      .filter(cat => aiChatMovement.amount >= 0 ? cat.type === 'ingreso' : cat.type === 'egreso')
                      .map(cat => (
                        <button
                          key={cat.name}
                          onClick={() => handleApplyAiTag(cat.name)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                            cat.type === 'ingreso'
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                              : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-800'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Chat Input Bar */}
                <form onSubmit={handleSendAiChatMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    placeholder="Escribe instrucción (ej: 'Asigna LUZ', 'Es alquiler de CEOIN')..."
                    className="flex-grow px-4 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <button
                    type="submit"
                    disabled={!aiChatInput.trim() || isAiProcessing}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: CONFIRMAR ELIMINAR MOVIMIENTO BANCARIO */}
        <AnimatePresence>
          {bankMovementToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-red-600">
                  <div className="p-3 bg-red-100 rounded-2xl">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-kenao text-primary">Eliminar Movimiento Bancario</h3>
                    <p className="text-xs text-primary/60">Esta acción eliminará el registro de la base de datos.</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-primary">{bankMovementToDelete.concept}</p>
                  <p className="text-primary/70 font-mono">{bankMovementToDelete.date} • {bankMovementToDelete.amount >= 0 ? '+' : ''}{bankMovementToDelete.amount.toFixed(2)} €</p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setBankMovementToDelete(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => bankMovementToDelete.id && handleDeleteBankMovement(bankMovementToDelete.id)}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-all cursor-pointer shadow-md"
                  >
                    Eliminar Definitivamente
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL: CONFIRMAR ELIMINAR CUALQUIER OTRO MOVIMIENTO */}
        <AnimatePresence>
          {genericItemToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 p-6 space-y-4"
              >
                <div className="flex items-center gap-3 text-red-600">
                  <div className="p-3 bg-red-100 rounded-2xl">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-kenao text-primary">{genericItemToDelete.title}</h3>
                    <p className="text-xs text-primary/60">{genericItemToDelete.description}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setGenericItemToDelete(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDeleteGenericItem}
                    className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-all cursor-pointer shadow-md"
                  >
                    Eliminar Definitivamente
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        </>
      )}

      </div>
    </div>
  );
}
