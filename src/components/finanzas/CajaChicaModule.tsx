import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  FileText,
  CheckCircle2,
  AlertCircle,
  LucideIcon
} from 'lucide-react';

export interface IncomeItem {
  id?: string;
  date: string;
  amount: number;
  paymentMethod?: string;
  category?: string;
  destination?: string;
  concept?: string;
  notes?: string;
  registeredByName?: string;
}

export interface EgresoItem {
  id?: string;
  date: string;
  amount: number;
  category?: string;
  concept?: string;
  notes?: string;
  registeredByName?: string;
}

export interface ArqueoItem {
  id?: string;
  date: string;
  totalEfectivo?: number;
  totalBilletes?: number;
  totalMonedas?: number;
  totalContado?: number;
  esperado?: number;
  diferencia?: number;
  notes?: string;
  registeredByName?: string;
}

interface CajaChicaModuleProps {
  moduleKey: 'celebraciones' | 'cafeteria' | 'libreria';
  title: string;
  description: string;
  icon: LucideIcon;
  themeColor: 'amber' | 'emerald' | 'indigo';
  subTab: 'dashboard' | 'ingresos' | 'arqueo' | 'egresos';
  setSubTab: (tab: 'dashboard' | 'ingresos' | 'arqueo' | 'egresos') => void;
  saldo: number;
  incomes: IncomeItem[];
  egresos: EgresoItem[];
  arqueos: ArqueoItem[];
  arqueoDate: string;
  setArqueoDate: (date: string) => void;
  onSaveIncome: (form: { date: string; amount: number; paymentMethod: string; category: string; concept: string; notes: string }) => Promise<void>;
  onSaveEgreso: (form: { date: string; amount: number; category: string; concept: string; notes: string }) => Promise<void>;
  onSaveArqueo: (form: { date: string; billetes: number; monedas: number; notes: string }) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  onDeleteEgreso: (id: string) => Promise<void>;
  onDeleteArqueo: (id: string) => Promise<void>;
  incomeCategories: string[];
  egresoCategories: string[];
}

export const CajaChicaModule: React.FC<CajaChicaModuleProps> = ({
  title,
  description,
  icon: Icon,
  themeColor,
  subTab,
  setSubTab,
  saldo,
  incomes,
  egresos,
  arqueos,
  arqueoDate,
  setArqueoDate,
  onSaveIncome,
  onSaveEgreso,
  onSaveArqueo,
  onDeleteIncome,
  onDeleteEgreso,
  onDeleteArqueo,
  incomeCategories,
  egresoCategories
}) => {
  // Theme styling maps
  const colorStyles = {
    amber: {
      bgIcon: 'bg-amber-100 text-amber-700',
      activeTab: 'bg-white text-amber-800 shadow-xs',
      badge: 'from-amber-950 to-amber-900 text-amber-300',
      textAccent: 'text-amber-600',
      borderAccent: 'border-amber-200',
      btnPrimary: 'bg-amber-600 hover:bg-amber-700 text-white'
    },
    emerald: {
      bgIcon: 'bg-emerald-100 text-emerald-700',
      activeTab: 'bg-white text-emerald-800 shadow-xs',
      badge: 'from-emerald-950 to-emerald-900 text-emerald-300',
      textAccent: 'text-emerald-600',
      borderAccent: 'border-emerald-200',
      btnPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    indigo: {
      bgIcon: 'bg-indigo-100 text-indigo-700',
      activeTab: 'bg-white text-indigo-800 shadow-xs',
      badge: 'from-slate-900 to-indigo-950 text-emerald-400',
      textAccent: 'text-indigo-600',
      borderAccent: 'border-indigo-200',
      btnPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-white'
    }
  }[themeColor];

  // Income Modal Form State
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'Efectivo',
    category: incomeCategories[0] || 'Venta General',
    concept: '',
    notes: ''
  });
  const [savingIncome, setSavingIncome] = useState(false);

  // Egreso Modal Form State
  const [showEgresoModal, setShowEgresoModal] = useState(false);
  const [egresoForm, setEgresoForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: egresoCategories[0] || 'Compras / Insumos',
    concept: '',
    notes: ''
  });
  const [savingEgreso, setSavingEgreso] = useState(false);

  // Arqueo Form State
  const [arqueoBilletes, setArqueoBilletes] = useState('');
  const [arqueoMonedas, setArqueoMonedas] = useState('');
  const [arqueoNotes, setArqueoNotes] = useState('');
  const [savingArqueo, setSavingArqueo] = useState(false);

  // Computed Totals
  const totalIngresos = useMemo(() => incomes.reduce((acc, curr) => acc + (curr.amount || 0), 0), [incomes]);
  const totalEfectivo = useMemo(() => {
    return incomes
      .filter(i => (i.paymentMethod || 'Efectivo') === 'Efectivo')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [incomes]);
  const totalDatafono = useMemo(() => {
    return incomes
      .filter(i => i.paymentMethod === 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [incomes]);
  const totalOtros = useMemo(() => {
    return incomes
      .filter(i => i.paymentMethod && i.paymentMethod !== 'Efectivo' && i.paymentMethod !== 'Datafono')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [incomes]);

  const totalEgresos = useMemo(() => egresos.reduce((acc, curr) => acc + (curr.amount || 0), 0), [egresos]);

  // Daily cash logic for Arqueo Date
  const efectivoIngresadoDiaArqueo = useMemo(() => {
    return incomes
      .filter(i => i.date === arqueoDate && (i.paymentMethod || 'Efectivo') === 'Efectivo')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [incomes, arqueoDate]);

  const egresosDiaArqueo = useMemo(() => {
    return egresos
      .filter(e => e.date === arqueoDate)
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  }, [egresos, arqueoDate]);

  const esperadoEnCajaArqueo = useMemo(() => {
    return efectivoIngresadoDiaArqueo - egresosDiaArqueo;
  }, [efectivoIngresadoDiaArqueo, egresosDiaArqueo]);

  const contadoFisicoArqueo = useMemo(() => {
    const b = parseFloat(arqueoBilletes) || 0;
    const m = parseFloat(arqueoMonedas) || 0;
    return b + m;
  }, [arqueoBilletes, arqueoMonedas]);

  const diferenciaArqueo = useMemo(() => {
    return contadoFisicoArqueo - esperadoEnCajaArqueo;
  }, [contadoFisicoArqueo, esperadoEnCajaArqueo]);

  const ultimoArqueo = useMemo(() => arqueos[0] || null, [arqueos]);

  // Combined Recent Activity for Dashboard
  const recentActivity = useMemo(() => {
    const incMap = incomes.map(i => ({ ...i, kind: 'ingreso' as const }));
    const egrMap = egresos.map(e => ({ ...e, kind: 'egreso' as const }));
    return [...incMap, ...egrMap].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [incomes, egresos]);

  // Handlers
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(incomeForm.amount);
    if (isNaN(amt) || amt <= 0) {
      alert("Introduce un importe válido mayor a 0.");
      return;
    }
    setSavingIncome(true);
    try {
      await onSaveIncome({
        date: incomeForm.date,
        amount: amt,
        paymentMethod: incomeForm.paymentMethod,
        category: incomeForm.category,
        concept: incomeForm.concept,
        notes: incomeForm.notes
      });
      setShowIncomeModal(false);
      setIncomeForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'Efectivo',
        category: incomeCategories[0] || 'Venta General',
        concept: '',
        notes: ''
      });
    } finally {
      setSavingIncome(false);
    }
  };

  const handleEgresoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(egresoForm.amount);
    if (isNaN(amt) || amt <= 0 || !egresoForm.concept.trim()) {
      alert("Introduce un concepto e importe válidos.");
      return;
    }
    setSavingEgreso(true);
    try {
      await onSaveEgreso({
        date: egresoForm.date,
        amount: amt,
        category: egresoForm.category,
        concept: egresoForm.concept,
        notes: egresoForm.notes
      });
      setShowEgresoModal(false);
      setEgresoForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: egresoCategories[0] || 'Compras / Insumos',
        concept: '',
        notes: ''
      });
    } finally {
      setSavingEgreso(false);
    }
  };

  const handleArqueoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(arqueoBilletes) || 0;
    const m = parseFloat(arqueoMonedas) || 0;
    if (b + m <= 0) {
      alert("Introduce el desglose de billetes o monedas contados.");
      return;
    }
    setSavingArqueo(true);
    try {
      await onSaveArqueo({
        date: arqueoDate,
        billetes: b,
        monedas: m,
        notes: arqueoNotes
      });
      alert("¡Arqueo de caja registrado correctamente!");
      setArqueoBilletes('');
      setArqueoMonedas('');
      setArqueoNotes('');
    } finally {
      setSavingArqueo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & MODULE SUBTABS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className={`p-2.5 rounded-2xl ${colorStyles.bgIcon}`}>
              <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-kenao text-primary">{title}</h2>
          </div>
          <p className="text-xs text-primary/60">{description}</p>

          {/* Subtabs Bar */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl mt-4 flex-wrap">
            <button
              onClick={() => setSubTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'dashboard' ? colorStyles.activeTab : 'text-primary/60 hover:text-primary'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => setSubTab('ingresos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'ingresos' ? colorStyles.activeTab : 'text-primary/60 hover:text-primary'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              Ingresos ({incomes.length})
            </button>
            <button
              onClick={() => setSubTab('arqueo')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'arqueo' ? colorStyles.activeTab : 'text-primary/60 hover:text-primary'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              Arqueo de Caja
            </button>
            <button
              onClick={() => setSubTab('egresos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subTab === 'egresos' ? colorStyles.activeTab : 'text-primary/60 hover:text-primary'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              Egresos ({egresos.length})
            </button>
          </div>
        </div>

        {/* SALDO CAJA CHICA CARD */}
        <div className={`bg-gradient-to-br ${colorStyles.badge} p-5 rounded-2xl text-right lg:min-w-[240px] shadow-sm`}>
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block mb-0.5">
            Saldo Efectivo Disponible
          </span>
          <span className="text-3xl font-extrabold tracking-tight block">
            {saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Efectivo Ingresado - Egresos
          </span>
        </div>
      </div>

      {/* SUBTAB 1: DASHBOARD */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ingresos</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">
                {totalIngresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Efectivo: <strong className="text-slate-700">{totalEfectivo.toFixed(2)}€</strong> | Datáfono: <strong className="text-slate-700">{totalDatafono.toFixed(2)}€</strong>
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Egresos</span>
                <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {totalEgresos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {egresos.length} gastos registrados en caja
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Caja Chica</span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-red-600'}`}>
                {saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Disponible físico para gastos inmediatos
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Último Arqueo</span>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              {ultimoArqueo ? (
                <div>
                  <div className="text-lg font-bold text-primary">{ultimoArqueo.date}</div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Físico: <strong>{(ultimoArqueo.totalContado ?? ultimoArqueo.totalEfectivo ?? 0).toFixed(2)}€</strong>
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">No hay arqueos registrados</div>
              )}
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              Desglose de Formas de Pago (Ingresos)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Efectivo (Entra a Caja Chica)
                </div>
                <div className="text-xl font-bold text-emerald-700">{totalEfectivo.toFixed(2)} €</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Datáfono / Tarjeta
                </div>
                <div className="text-xl font-bold text-indigo-700">{totalDatafono.toFixed(2)} €</div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 mb-1">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Bizum / Transferencia / Otros
                </div>
                <div className="text-xl font-bold text-amber-700">{totalOtros.toFixed(2)} €</div>
              </div>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-primary">Últimos Movimientos Registrados</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No se registran movimientos en esta caja.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Fecha</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Categoría / Concepto</th>
                      <th className="py-3 px-4">Forma de Pago</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentActivity.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-primary whitespace-nowrap">{item.date}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.kind === 'ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.kind === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{item.concept || item.category || '-'}</div>
                          {item.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          {item.kind === 'ingreso' ? (item.paymentMethod || 'Efectivo') : 'Efectivo (Caja)'}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                          item.kind === 'ingreso' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {item.kind === 'ingreso' ? '+' : '-'}{item.amount.toFixed(2)} €
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

      {/* SUBTAB 2: INGRESOS */}
      {subTab === 'ingresos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-primary">Ingresos de {title}</h3>
              <p className="text-xs text-slate-500">Registra entradas de efectivo, datáfono u otros métodos.</p>
            </div>
            <button
              onClick={() => setShowIncomeModal(true)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs ${colorStyles.btnPrimary}`}
            >
              <Plus className="w-4 h-4" />
              Nuevo Ingreso
            </button>
          </div>

          {/* New Income Modal / Form Box */}
          {showIncomeModal && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-primary">Registrar Nuevo Ingreso</h4>
                <button
                  onClick={() => setShowIncomeModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleIncomeSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Importe (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={incomeForm.amount}
                    onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Forma de Pago</label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={e => setIncomeForm({ ...incomeForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="Efectivo">Efectivo (Entra a Caja)</option>
                    <option value="Datafono">Datáfono / Tarjeta</option>
                    <option value="Bizum">Bizum</option>
                    <option value="Transferencia">Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Categoría</label>
                  <select
                    value={incomeForm.category}
                    onChange={e => setIncomeForm({ ...incomeForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    {incomeCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Concepto / Descripción</label>
                  <input
                    type="text"
                    placeholder="Ej: Venta de café / Libro / Diezmo..."
                    value={incomeForm.concept}
                    onChange={e => setIncomeForm({ ...incomeForm, concept: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Notas u Observaciones</label>
                  <input
                    type="text"
                    placeholder="Opcional..."
                    value={incomeForm.notes}
                    onChange={e => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowIncomeModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingIncome}
                    className={`px-5 py-2 rounded-xl text-xs font-bold ${colorStyles.btnPrimary} cursor-pointer disabled:opacity-50`}
                  >
                    {savingIncome ? 'Guardando...' : 'Guardar Ingreso'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Income Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total Ingresos Registrados: {incomes.length}</span>
              <span className="font-bold text-emerald-700">{totalIngresos.toFixed(2)} €</span>
            </div>

            {incomes.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center">No hay ingresos registrados aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-6">Fecha</th>
                      <th className="py-3.5 px-6">Concepto / Categoría</th>
                      <th className="py-3.5 px-6">Forma de Pago</th>
                      <th className="py-3.5 px-6">Notas</th>
                      <th className="py-3.5 px-6">Registrado por</th>
                      <th className="py-3.5 px-6 text-right">Importe</th>
                      <th className="py-3.5 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incomes.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-6 font-bold text-primary whitespace-nowrap">{item.date}</td>
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-800">{item.concept || item.destination || item.category || 'Ingreso'}</div>
                          <div className="text-[10px] text-slate-400">{item.category || item.destination}</div>
                        </td>
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.paymentMethod === 'Datafono' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            item.paymentMethod === 'Efectivo' || !item.paymentMethod ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.paymentMethod || 'Efectivo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 max-w-xs truncate">{item.notes || '-'}</td>
                        <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap">{item.registeredByName || 'Financiero'}</td>
                        <td className="py-3.5 px-6 text-right font-bold text-emerald-600 whitespace-nowrap">
                          +{item.amount.toFixed(2)} €
                        </td>
                        <td className="py-3.5 px-6 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (confirm("¿Seguro que deseas eliminar este ingreso?")) {
                                onDeleteIncome(item.id!);
                              }
                            }}
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
        </div>
      )}

      {/* SUBTAB 3: ARQUEO DE CAJA */}
      {subTab === 'arqueo' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                  <Coins className="w-5 h-5 text-indigo-600" />
                  Arqueo y Cierre de Caja ({title})
                </h3>
                <p className="text-xs text-slate-500">
                  Calcula el saldo esperado en efectivo para una fecha concreta y compáralo con el conteo físico.
                </p>
              </div>

              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Fecha Arqueo:</label>
                <input
                  type="date"
                  value={arqueoDate}
                  onChange={e => setArqueoDate(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-primary"
                />
              </div>
            </div>

            {/* Calculated Status Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  (+) Efectivo Ingresado ({arqueoDate})
                </span>
                <span className="text-xl font-bold text-emerald-700">
                  {efectivoIngresadoDiaArqueo.toFixed(2)} €
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  (-) Egresos en Efectivo ({arqueoDate})
                </span>
                <span className="text-xl font-bold text-red-600">
                  {egresosDiaArqueo.toFixed(2)} €
                </span>
              </div>
              <div className="border-l border-indigo-200 pl-4">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">
                  (=) Efectivo Esperado en Caja
                </span>
                <span className="text-2xl font-black text-indigo-950">
                  {esperadoEnCajaArqueo.toFixed(2)} €
                </span>
              </div>
            </div>

            {/* Arqueo Form */}
            <form onSubmit={handleArqueoSubmit} className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Desglose Físico de Dinero en Caja</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Total Billetes (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={arqueoBilletes}
                    onChange={e => setArqueoBilletes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Total Monedas (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={arqueoMonedas}
                    onChange={e => setArqueoMonedas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Total Físico Contado</label>
                  <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                    {contadoFisicoArqueo.toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Difference Status */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                diferenciaArqueo === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                diferenciaArqueo > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' :
                'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-2">
                  {diferenciaArqueo === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <div>
                    <span className="text-xs font-bold block">
                      {diferenciaArqueo === 0 ? '¡Caja Cuadrada Perfectamente!' :
                       diferenciaArqueo > 0 ? 'Sobrante en Caja' : 'Faltante en Caja'}
                    </span>
                    <span className="text-[11px] opacity-80">
                      Diferencia = Contado ({contadoFisicoArqueo.toFixed(2)}€) - Esperado ({esperadoEnCajaArqueo.toFixed(2)}€)
                    </span>
                  </div>
                </div>
                <span className="text-lg font-extrabold whitespace-nowrap">
                  {diferenciaArqueo > 0 ? '+' : ''}{diferenciaArqueo.toFixed(2)} €
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Observaciones / Notas del Arqueo</label>
                <input
                  type="text"
                  placeholder="Ej: Se cuadró caja al finalizar el culto/evento..."
                  value={arqueoNotes}
                  onChange={e => setArqueoNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingArqueo}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs ${colorStyles.btnPrimary} cursor-pointer disabled:opacity-50 flex items-center gap-2`}
                >
                  <Coins className="w-4 h-4" />
                  {savingArqueo ? 'Guardando Arqueo...' : 'Confirmar & Guardar Arqueo de Caja'}
                </button>
              </div>
            </form>
          </div>

          {/* Historical Arqueos Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden space-y-3 p-6">
            <h4 className="text-sm font-bold text-primary">Histórico de Arqueos Registrados</h4>

            {arqueos.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No hay cierres de caja guardados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-6">Fecha</th>
                      <th className="py-3.5 px-6 text-right">Contado (€)</th>
                      <th className="py-3.5 px-6 text-right">Esperado (€)</th>
                      <th className="py-3.5 px-6 text-right">Diferencia</th>
                      <th className="py-3.5 px-6">Notas</th>
                      <th className="py-3.5 px-6">Responsable</th>
                      <th className="py-3.5 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {arqueos.map(item => {
                      const totalCont = item.totalContado ?? item.totalEfectivo ?? 0;
                      const esp = item.esperado ?? item.totalEfectivo ?? 0;
                      const dif = item.diferencia ?? (totalCont - esp);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60">
                          <td className="py-3.5 px-6 font-bold text-primary whitespace-nowrap">{item.date}</td>
                          <td className="py-3.5 px-6 text-right font-bold text-slate-800">{totalCont.toFixed(2)} €</td>
                          <td className="py-3.5 px-6 text-right text-slate-600">{esp.toFixed(2)} €</td>
                          <td className="py-3.5 px-6 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              dif === 0 ? 'bg-emerald-100 text-emerald-800' :
                              dif > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {dif > 0 ? '+' : ''}{dif.toFixed(2)} €
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-slate-500 max-w-xs truncate">{item.notes || '-'}</td>
                          <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap">{item.registeredByName || 'Financiero'}</td>
                          <td className="py-3.5 px-6 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (confirm("¿Seguro que deseas eliminar este registro de arqueo?")) {
                                  onDeleteArqueo(item.id!);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Eliminar arqueo"
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

      {/* SUBTAB 4: EGRESOS */}
      {subTab === 'egresos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-primary">Egresos de {title}</h3>
              <p className="text-xs text-slate-500">Registra compras o salidas de caja que se descuentan del saldo físico.</p>
            </div>
            <button
              onClick={() => setShowEgresoModal(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Nuevo Egreso
            </button>
          </div>

          {/* New Egreso Form */}
          {showEgresoModal && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-primary">Registrar Nuevo Egreso / Gasto de Caja</h4>
                <button
                  onClick={() => setShowEgresoModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleEgresoSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={egresoForm.date}
                    onChange={e => setEgresoForm({ ...egresoForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Importe (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={egresoForm.amount}
                    onChange={e => setEgresoForm({ ...egresoForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-red-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Categoría de Gasto</label>
                  <select
                    value={egresoForm.category}
                    onChange={e => setEgresoForm({ ...egresoForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  >
                    {egresoCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Concepto / Motivo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Compra de servilletas / Reparación..."
                    value={egresoForm.concept}
                    onChange={e => setEgresoForm({ ...egresoForm, concept: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Notas u Observaciones</label>
                  <input
                    type="text"
                    placeholder="Opcional..."
                    value={egresoForm.notes}
                    onChange={e => setEgresoForm({ ...egresoForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEgresoModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingEgreso}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    {savingEgreso ? 'Guardando...' : 'Registrar Egreso (-€)'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Egreso Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Total Egresos Registrados: {egresos.length}</span>
              <span className="font-bold text-red-600">-{totalEgresos.toFixed(2)} €</span>
            </div>

            {egresos.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-6 text-center">No hay egresos registrados aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-6">Fecha</th>
                      <th className="py-3.5 px-6">Concepto / Categoría</th>
                      <th className="py-3.5 px-6">Notas</th>
                      <th className="py-3.5 px-6">Registrado por</th>
                      <th className="py-3.5 px-6 text-right">Importe</th>
                      <th className="py-3.5 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {egresos.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-6 font-bold text-primary whitespace-nowrap">{item.date}</td>
                        <td className="py-3.5 px-6">
                          <div className="font-bold text-slate-800">{item.concept || item.category || 'Egreso'}</div>
                          <div className="text-[10px] text-slate-400">{item.category}</div>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 max-w-xs truncate">{item.notes || '-'}</td>
                        <td className="py-3.5 px-6 text-slate-500 whitespace-nowrap">{item.registeredByName || 'Financiero'}</td>
                        <td className="py-3.5 px-6 text-right font-bold text-red-600 whitespace-nowrap">
                          -{item.amount.toFixed(2)} €
                        </td>
                        <td className="py-3.5 px-6 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (confirm("¿Seguro que deseas eliminar este egreso?")) {
                                onDeleteEgreso(item.id!);
                              }
                            }}
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
  );
};
