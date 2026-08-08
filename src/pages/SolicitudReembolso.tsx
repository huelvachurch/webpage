import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Receipt, FileText, CheckCircle2, AlertCircle, Building2, 
  CreditCard, Banknote, ShieldAlert, ArrowLeft, Copy, Check, Send, RefreshCw, Info,
  UploadCloud, X, File, Image as ImageIcon, HardDrive, ExternalLink
} from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, connectGoogleDrive } from '../firebase';
import { useAuth } from '../AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ChurchArea, DEFAULT_CHURCH_AREAS } from './admin/AdminAreas';
import { useGlobalSettings } from '../utils/useSettings';

export default function SolicitudReembolso() {
  const { user, isAuthReady } = useAuth();
  const { gasWebAppUrl, driveFolderUrl } = useGlobalSettings();
  const navigate = useNavigate();

  // Loaded Church Areas
  const [areas, setAreas] = useState<ChurchArea[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Form Fields
  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia Bancaria'>('Transferencia Bancaria');
  const [iban, setIban] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; file: File; base64: string; previewUrl?: string }[]>([]);
  const [uploadProgressMsg, setUploadProgressMsg] = useState('');

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper function to compress images before storing as base64
  const compressImageFile = (file: File): Promise<{ base64: string; previewUrl?: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const originalBase64 = (event.target?.result as string) || '';
        if (!file.type.startsWith('image/')) {
          resolve({ base64: originalBase64, previewUrl: undefined });
          return;
        }
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDimension = 1000;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
            resolve({ base64: compressedBase64, previewUrl: compressedBase64 });
          } else {
            resolve({ base64: originalBase64, previewUrl: originalBase64 });
          }
        };
        img.onerror = () => resolve({ base64: originalBase64, previewUrl: originalBase64 });
        img.src = originalBase64;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files);

    filesArray.forEach(async (file) => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`El archivo "${file.name}" supera el límite máximo de 20 MB.`);
        return;
      }

      const { base64, previewUrl } = await compressImageFile(file);
      setAttachedFiles(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          file,
          base64,
          previewUrl
        }
      ]);
    });
    e.target.value = '';
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Initialize applicant info from logged in user
  useEffect(() => {
    if (user) {
      if (!applicantName && user.displayName) setApplicantName(user.displayName);
      if (!applicantEmail && user.email) setApplicantEmail(user.email);
    }
  }, [user]);

  // Load Church Areas from Firestore
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const q = query(collection(db, 'areas'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ChurchArea[];
          setAreas(loaded);
          if (loaded.length > 0) {
            setSelectedAreaId(loaded[0].id || '');
          }
        } else {
          // Fallback to default areas list
          const formatted = DEFAULT_CHURCH_AREAS.map((a, i) => ({ id: `def_${i}`, ...a }));
          setAreas(formatted);
          setSelectedAreaId(formatted[0].id);
        }
      } catch (err) {
        console.warn("Using default areas fallback:", err);
        const formatted = DEFAULT_CHURCH_AREAS.map((a, i) => ({ id: `def_${i}`, ...a }));
        setAreas(formatted);
        setSelectedAreaId(formatted[0].id);
      } finally {
        setLoadingAreas(false);
      }
    };
    fetchAreas();
  }, []);

  // Validation: Numeric amount logic
  const parsedAmount = parseFloat(amount) || 0;
  const isAmountOverLimit = parsedAmount > 40;

  // Enforce Transferencia Bancaria if amount > 40€
  useEffect(() => {
    if (isAmountOverLimit && paymentMethod === 'Efectivo') {
      setPaymentMethod('Transferencia Bancaria');
    }
  }, [isAmountOverLimit, paymentMethod]);

  // Generate Unique Code ID
  // Format: {TIPO}-{FECHA_SERIAL}-{INICIALES_AREA}-{TIME_SERIAL}
  // Example: TB-046228-AL-985694
  const generateReimbursementCode = (method: 'Efectivo' | 'Transferencia Bancaria', areaInitials: string) => {
    const methodPrefix = method === 'Transferencia Bancaria' ? 'TB' : 'EF';
    
    // Serial date format: DDMMYY
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = String(today.getFullYear()).slice(-2);
    const dateSerial = `${day}${month}${year}`;

    // Area initials uppercase clean (fallback 'HC' if none)
    const cleanInitials = (areaInitials || 'HC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'HC';

    // Random 6 digit time/number serial
    const timeSerial = Math.floor(100000 + Math.random() * 900000).toString();

    return `${methodPrefix}-${dateSerial}-${cleanInitials}-${timeSerial}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicantName.trim()) {
      alert("Por favor indica tu Nombre y Apellidos.");
      return;
    }

    if (!concept.trim()) {
      alert("Por favor indica el concepto o motivo del gasto.");
      return;
    }

    if (!amount || parsedAmount <= 0) {
      alert("Por favor ingresa un importe mayor a 0,00 €.");
      return;
    }

    if (paymentMethod === 'Transferencia Bancaria' && !iban.trim()) {
      alert("Por favor proporciona el número de IBAN / Cuenta Bancaria para la transferencia.");
      return;
    }

    // Find selected area details
    const selectedArea: ChurchArea = areas.find(a => a.id === selectedAreaId) || areas[0] || {
      name: 'General',
      type: 'Servicios',
      initials: 'HC'
    };

    setSubmitting(true);
    setUploadProgressMsg('Generando código de reembolso...');

    try {
      // Generate Unique Code
      const code = generateReimbursementCode(paymentMethod, selectedArea.initials);

      // Upload attached files to Google Drive (Finanzas/Reembolsos/Adjuntos) with base64 fallback
      const driveAttachments: { id: string; name: string; url: string; webViewLink: string; fileId: string; mimeType: string }[] = [];

      if (attachedFiles.length > 0) {
        for (let i = 0; i < attachedFiles.length; i++) {
          const item = attachedFiles[i];
          setUploadProgressMsg(`Subiendo a Google Drive (/Finanzas/Reembolsos/Adjuntos) ${i + 1} de ${attachedFiles.length}...`);
          let uploadedToDrive = false;
          try {
            const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

            const response = await fetch('/api/drive/upload-attachment', {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify({
                fileName: item.file.name,
                mimeType: item.file.type,
                base64Data: item.base64,
                reimbursementCode: code,
                gasWebAppUrl: gasWebAppUrl,
                folderUrl: driveFolderUrl
              })
            });

            const contentType = response.headers.get('content-type') || '';
            if (response.ok && contentType.includes('application/json')) {
              const resData = await response.json().catch(() => null);
              if (resData && resData.success && resData.file) {
                driveAttachments.push({
                  id: resData.file.id,
                  fileId: resData.file.id,
                  name: item.file.name,
                  url: resData.file.webViewLink,
                  webViewLink: resData.file.webViewLink,
                  mimeType: item.file.type || 'image/jpeg'
                });
                uploadedToDrive = true;
              } else if (resData && resData.error) {
                console.warn(`Drive upload aviso: ${resData.error}`);
                alert(`Error al subir el archivo ${item.file.name}: ${resData.error}`);
                throw new Error(`Drive upload failed: ${resData.error}`);
              }
            } else {
              console.warn("Servicio de Drive no devolvió JSON válido o estado OK:", response.status);
              alert(`Error del servidor al subir ${item.file.name}. Estado: ${response.status}`);
              throw new Error(`Server returned status ${response.status}`);
            }
          } catch (uploadErr: any) {
            console.warn(`Drive upload no disponible para ${item.file.name}, usando almacenamiento seguro local.`, uploadErr);
            alert(`No se pudo subir el archivo adjunto: ${uploadErr.message}`);
            setSubmitting(false);
            setUploadProgressMsg('');
            return; // Abort submission
          }

          // Fallback: If Drive upload failed, store compressed base64 or safe attachment reference
          if (!uploadedToDrive) {
            console.warn(`Fallback local activo para adjunto: ${item.file.name}`);
            let safeBase64 = item.base64;
            // If non-image base64 string is larger than 300KB, truncate it so document never exceeds 1MB limit
            if (!item.file.type.startsWith('image/') && safeBase64.length > 300000) {
              console.warn(`[Base64 Warning] Archivo no imagen "${item.file.name}" de gran tamaño (${safeBase64.length} chars). Guardando referencia segura.`);
              safeBase64 = '';
            }
            driveAttachments.push({
              id: item.id || `att_${Date.now()}_${i}`,
              fileId: '',
              name: item.file.name,
              url: safeBase64,
              webViewLink: safeBase64,
              mimeType: item.file.type || 'image/jpeg'
            });
          }
        }
      }

      setUploadProgressMsg('Guardando datos de solicitud...');

      const primaryReceiptUrl = driveAttachments.length > 0 
        ? (driveAttachments[0].webViewLink || driveAttachments[0].url) 
        : (receiptUrl.trim() || '');

      const reimbursementDoc: any = {
        code: code,
        createdByUid: user?.uid || 'anon',
        createdByName: applicantName.trim(),
        createdByEmail: applicantEmail.trim() || user?.email || '',
        createdByPhone: applicantPhone.trim() || '',
        date: date,
        areaId: selectedArea.id || selectedArea.initials,
        areaName: selectedArea.name,
        areaInitials: selectedArea.initials,
        concept: concept.trim(),
        amount: parsedAmount,
        paymentMethod: paymentMethod,
        iban: paymentMethod === 'Transferencia Bancaria' ? iban.trim() : '',
        receiptUrl: primaryReceiptUrl,
        attachments: driveAttachments,
        notes: notes.trim() || '',
        status: 'pendiente',
        signatures: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Guarantee document size stays strictly below Firestore's 1MB limit (1,048,576 bytes)
      const docPayloadJson = JSON.stringify(reimbursementDoc);
      if (docPayloadJson.length > 750000) {
        console.warn(`[Firestore Limit Guard] Payload de solicitud (${docPayloadJson.length} bytes) excede 750KB. Optimizando adjuntos...`);
        reimbursementDoc.attachments = reimbursementDoc.attachments.map((att: any) => {
          if (att.url && att.url.startsWith('data:') && att.url.length > 50000) {
            return {
              ...att,
              url: '',
              webViewLink: '',
              notice: `Adjunto ${att.name} preservado en registro (archivo original excede 1MB local)`
            };
          }
          return att;
        });
        if (reimbursementDoc.receiptUrl && reimbursementDoc.receiptUrl.startsWith('data:') && reimbursementDoc.receiptUrl.length > 50000) {
          reimbursementDoc.receiptUrl = reimbursementDoc.attachments[0]?.url || '';
        }
      }

      await addDoc(collection(db, 'reembolsos'), reimbursementDoc);

      setSubmittedCode(code);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reembolsos');
    } finally {
      setSubmitting(false);
      setUploadProgressMsg('');
    }
  };

  const handleCopyCode = () => {
    if (submittedCode) {
      navigator.clipboard.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleResetForm = () => {
    setSubmittedCode(null);
    setConcept('');
    setAmount('');
    setIban('');
    setReceiptUrl('');
    setAttachedFiles([]);
    setNotes('');
  };

  return (
    <div className="pt-28 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Navigation back */}
        <div className="mb-6">
          <Link
            to="/dar"
            className="inline-flex items-center gap-2 text-xs font-bold text-primary/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Finanzas y Donaciones
          </Link>
        </div>

        {/* Page Title */}
        <div className="text-center mb-8">

          <h1 className="text-3xl sm:text-4xl font-kenao text-primary mb-2">
            Solicitud de Reembolso
          </h1>
          <p className="text-primary/70 text-sm max-w-xl mx-auto">
            Formulario para solicitar la devolución de un gasto realizado en nombre o beneficio de la iglesia.
          </p>
        </div>

        {/* SUCCESS MODAL / SCREEN */}
        <AnimatePresence>
          {submittedCode ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-kenao text-primary mb-2">¡Solicitud de Reembolso Registrada!</h2>
                <p className="text-primary/70 text-sm max-w-md mx-auto">
                  Tu solicitud ha sido guardada con éxito en el sistema financiero de la iglesia.
                </p>
              </div>

              {/* Code Display Box */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-2xl max-w-md mx-auto relative space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary/50 block">
                  Código de Seguimiento Asignado
                </span>
                <div className="text-2xl font-mono font-black text-primary tracking-widest bg-white py-2 px-4 rounded-xl border border-slate-200 inline-block shadow-xs">
                  {submittedCode}
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-secondary hover:text-primary transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? '¡Código Copiado!' : 'Copiar Código'}
                  </button>
                </div>
              </div>

              {/* Signature Requirements Notice */}
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-left max-w-md mx-auto text-xs space-y-1.5 text-blue-900">
                <div className="flex items-center gap-2 font-bold text-blue-800">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  Próximos pasos de aprobación:
                </div>
                {paymentMethod === 'Efectivo' ? (
                  <p className="text-blue-700 leading-relaxed">
                    Al ser un reembolso en <strong>Efectivo (máx. 40€)</strong>, requiere la firma de <strong>1 miembro financiero</strong> para que el pago quede completado.
                  </p>
                ) : (
                  <p className="text-blue-700 leading-relaxed">
                    Al ser una devolución por <strong>Transferencia Bancaria</strong>, requiere la firma de <strong>2 miembros financieros</strong> para quedar completada.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <button
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Enviar otra Solicitud
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto px-6 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-secondary hover:text-primary transition-all cursor-pointer shadow-md"
                >
                  Volver al Inicio
                </button>
              </div>
            </motion.div>
          ) : (
            /* FORM STATE */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-md space-y-8"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Applicant Details */}
                <div>
                  <h3 className="text-base font-kenao text-primary mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <FileText className="w-4 h-4 text-secondary" />
                    1. Datos del Solicitante
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Nombre y Apellidos *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: María García Fernández"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Correo Electrónico *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="tuemail@ejemplo.com"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Teléfono de Contacto
                      </label>
                      <input
                        type="tel"
                        placeholder="+34 600 000 000"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Fecha del Gasto / Solicitud *
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Expense Details */}
                <div>
                  <h3 className="text-base font-kenao text-primary mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Receipt className="w-4 h-4 text-secondary" />
                    2. Detalle del Gasto & Área
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Área de la Iglesia Destinataria *
                      </label>
                      <select
                        required
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-secondary bg-white cursor-pointer"
                      >
                        {areas.map(area => (
                          <option key={area.id} value={area.id}>
                            [{area.initials}] {area.name} ({area.type})
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-primary/50 mt-1 block">
                        Selecciona el servicio o ministerio para el cual se realizó el gasto.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Concepto / Motivo del Gasto *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Compra de cables de audio para el equipo de sonido de la iglesia"
                        value={concept}
                        onChange={(e) => setConcept(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Importe Total del Gasto (€) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 font-bold text-base">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                          placeholder="0,00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 font-extrabold text-lg text-primary outline-none focus:ring-2 focus:ring-secondary"
                        />
                      </div>
                    </div>

                    {/* RED WARNING ALERT IF AMOUNT > 40 € */}
                    <AnimatePresence>
                      {isAmountOverLimit && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-800 text-xs"
                        >
                          <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold block text-red-900 mb-0.5">
                              Límite de Efectivo Excedido
                            </span>
                            <p className="leading-relaxed">
                              Para importes superiores a <strong>40,00 €</strong>, la devolución se realiza obligatoriamente por <strong>Transferencia Bancaria</strong>. La opción en efectivo se ha desactivado automáticamente.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 3. Refund Payment Method */}
                <div>
                  <h3 className="text-base font-kenao text-primary mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <CreditCard className="w-4 h-4 text-secondary" />
                    3. Forma de Devolución
                  </h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* Efectivo Option */}
                      <div 
                        onClick={() => {
                          if (!isAmountOverLimit) setPaymentMethod('Efectivo');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                          paymentMethod === 'Efectivo' 
                            ? 'bg-amber-50/80 border-amber-500 shadow-sm' 
                            : isAmountOverLimit 
                              ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed' 
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          disabled={isAmountOverLimit}
                          checked={paymentMethod === 'Efectivo'}
                          onChange={() => setPaymentMethod('Efectivo')}
                          className="mt-1 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-bold text-xs text-primary">
                            <Banknote className="w-4 h-4 text-amber-600" />
                            Efectivo (Caja Chica)
                          </div>

                          {isAmountOverLimit && (
                            <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 font-extrabold rounded text-[10px] uppercase">
                              Desactivado (&gt;40€)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Transferencia Bancaria Option */}
                      <div 
                        onClick={() => setPaymentMethod('Transferencia Bancaria')}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          paymentMethod === 'Transferencia Bancaria' 
                            ? 'bg-blue-50/80 border-blue-500 shadow-sm' 
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'Transferencia Bancaria'}
                          onChange={() => setPaymentMethod('Transferencia Bancaria')}
                          className="mt-1 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="flex items-center gap-2 font-bold text-xs text-primary">
                            <CreditCard className="w-4 h-4 text-blue-600" />
                            Transferencia Bancaria
                          </div>

                        </div>
                      </div>

                    </div>

                    {/* IBAN Input if Transferencia Bancaria */}
                    <AnimatePresence>
                      {paymentMethod === 'Transferencia Bancaria' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5"
                        >
                          <label className="block text-xs font-bold text-primary/70">
                            Número de Cuenta / IBAN destinatario *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="ES12 3456 7890 1234 5678 9012"
                            value={iban}
                            onChange={(e) => setIban(e.target.value.toUpperCase())}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-primary outline-none focus:ring-2 focus:ring-secondary uppercase tracking-wider"
                          />
                          <span className="text-[10px] text-primary/50 block">
                            Asegúrate de verificar el IBAN de tu banco para evitar errores en la transferencia.
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 4. Attachment & Additional Notes */}
                <div>
                  <h3 className="text-base font-kenao text-primary mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <HardDrive className="w-4 h-4 text-secondary" />
                    4. Archivos Adjuntos & Observaciones
                  </h3>

                  <div className="space-y-4">
                    
                    {/* File Attachment Dropzone */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-primary/80">
                          Adjuntar Tickets, Fotos o Facturas
                        </label>

                      </div>

                      {/* Dropzone container */}
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/40 rounded-2xl p-5 text-center transition-all cursor-pointer group">
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf,.doc,.docx"
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 group-hover:border-amber-400 flex items-center justify-center transition-colors">
                            <UploadCloud className="w-5 h-5 text-primary/60 group-hover:text-amber-600" />
                          </div>
                          <p className="text-xs font-bold text-primary">
                            Haz clic o arrastra aquí tus archivos o fotos de tickets
                          </p>
                        </div>
                      </div>

                      {/* Display selected files */}
                      {attachedFiles.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <span className="text-[11px] font-bold text-primary/60 block">
                            Archivos listos para subir ({attachedFiles.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {attachedFiles.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs text-xs"
                              >
                                <div className="flex items-center gap-2 overflow-hidden pr-2">
                                  {item.previewUrl ? (
                                    <img
                                      src={item.previewUrl}
                                      alt="Vista previa"
                                      className="w-8 h-8 rounded object-cover border border-slate-200 flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                                      <File className="w-4 h-4 text-primary/60" />
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="font-bold text-primary truncate text-[11px]">{item.file.name}</p>
                                    <p className="text-[10px] text-primary/50">
                                      {(item.file.size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(item.id)}
                                  className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                                  title="Quitar archivo"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary/70 mb-1">
                        Enlace o Referencia Adicional (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Nº de ticket, referencia o enlace externo"
                        value={receiptUrl}
                        onChange={(e) => setReceiptUrl(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-primary outline-none focus:ring-2 focus:ring-secondary"
                      />
                    </div>


                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  {uploadProgressMsg && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      {uploadProgressMsg}
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto ml-auto px-8 py-3.5 bg-primary text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider hover:bg-secondary hover:text-primary transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Guardando Solicitud...' : 'Enviar Solicitud de Reembolso'}
                  </button>
                </div>

              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
