import React, { useState, useEffect } from 'react';
import { useAuth } from '../../AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';
import { Save, Loader2, Clock, HardDrive, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  const { user, isAuthReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');
  const [hideHuelvaChurchCell, setHideHuelvaChurchCell] = useState(false);
  const [hideRadio, setHideRadio] = useState(false);
  const [hideNewsletter, setHideNewsletter] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [gasWebAppUrl, setGasWebAppUrl] = useState('');
  const [testingDrive, setTestingDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ success: boolean; message: string; webViewLink?: string } | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resetModalType, setResetModalType] = useState<'celula' | 'asistentes' | null>(null);
  const [resetInput, setResetInput] = useState('');

  // Helper to show temporary success message
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => {
      setSuccessMessage(current => current === msg ? null : current);
    }, 5000);
  };

  // Helper to show temporary error message
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setTimeout(() => {
      setErrorMessage(current => current === msg ? null : current);
    }, 5000);
  };

  const handleResetMyCelula = async () => {
    if (!user) return;
    setResetting(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { 
        celulaId: null,
        celulaStatus: null
      }, { merge: true });
      triggerSuccess("Se restableció Mi Célula con éxito.");
      setResetModalType(null);
      setResetInput('');
    } catch (err) {
      console.error("Error resetting celula:", err);
      triggerError("No se pudo restablecer la célula.");
    } finally {
      setResetting(false);
    }
  };

  const handleResetAsistentes = async () => {
    if (!user) return;
    setResetting(true);
    try {
      const qCell = query(collection(db, 'celulas'), where('leaderId', '==', user.uid));
      const cellSnap = await getDocs(qCell);
      if (cellSnap.empty) {
        triggerError("No se encontró tu célula.");
        return;
      }
      const cellId = cellSnap.docs[0].id;
      
      // Unlink users
      const qUsers = query(collection(db, 'users'), where('celulaId', '==', cellId));
      const usersSnap = await getDocs(qUsers);
      
      const batch = writeBatch(db);
      usersSnap.forEach(uDoc => {
         batch.update(uDoc.ref, { celulaId: null, celulaStatus: null });
      });

      // Delete cell_members
      const qMembers = query(collection(db, 'cell_members'), where('cellId', '==', cellId));
      const membersSnap = await getDocs(qMembers);
      membersSnap.forEach(mDoc => {
        batch.delete(mDoc.ref);
      });

      await batch.commit();
      
      triggerSuccess("Se restablecieron los asistentes con éxito.");
      setResetModalType(null);
      setResetInput('');
    } catch (err) {
      console.error("Error resetting asistentes:", err);
      triggerError("No se pudo restablecer los asistentes.");
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) return;
    
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.meetingTime) setMeetingTime(data.meetingTime);
          if (data.hideHuelvaChurchCell !== undefined) setHideHuelvaChurchCell(data.hideHuelvaChurchCell);
          if (data.hideRadio !== undefined) setHideRadio(data.hideRadio);
          if (data.hideNewsletter !== undefined) setHideNewsletter(data.hideNewsletter);
          if (data.driveFolderUrl) setDriveFolderUrl(data.driveFolderUrl);
          if (data.gasWebAppUrl) setGasWebAppUrl(data.gasWebAppUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user, isAuthReady]);

  const handleTestDriveConnection = async () => {
    setTestingDrive(true);
    setDriveStatus(null);
    try {
      const res = await fetch(`/api/drive/test-connection?gasUrl=${encodeURIComponent(gasWebAppUrl || '')}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setDriveStatus({
          success: true,
          message: data.message || `Conexión con Google Drive activa. Carpeta destino: ${data.folderPath}`,
          webViewLink: data.webViewLink
        });
      } else {
        setDriveStatus({
          success: false,
          message: data.error || 'No se pudo conectar con la API de Google Drive.'
        });
      }
    } catch (err: any) {
      setDriveStatus({
        success: false,
        message: err?.message || 'Error al conectar con la API de Google Drive.'
      });
    } finally {
      setTestingDrive(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        meetingTime: meetingTime,
        hideHuelvaChurchCell: hideHuelvaChurchCell,
        hideRadio: hideRadio,
        hideNewsletter: hideNewsletter,
        driveFolderUrl: driveFolderUrl.trim(),
        gasWebAppUrl: gasWebAppUrl.trim()
      }, { merge: true });
      triggerSuccess('Ajustes guardados correctamente.');
    } catch (err) {
      console.error(err);
      triggerError('Error al guardar los ajustes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pt-32 pb-24 text-center">Cargando ajustes...</div>;

  return (
    <div className="pt-32 pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-kenao text-primary mb-2">Ajustes Generales</h1>
        <p className="text-primary/60 mb-8">Configura horarios e información general que se refleja en toda la aplicación web.</p>
        
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-medium flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 text-xs font-bold font-mono p-1">✕</button>
          </motion.div>
        )}
        
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-850 rounded-2xl text-sm font-medium flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-rose-500">⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 text-xs font-bold font-mono p-1">✕</button>
          </motion.div>
        )}
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm"
        >
          <form onSubmit={handleSave} className="space-y-8">
            <div>
              <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-secondary" />
                Horarios de Reunión
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-primary/70 mb-2 uppercase tracking-wide">
                    Horario de Reunión General Familiar (Ej. Verano/Invierno)
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-primary"
                    placeholder="Ej. Domingos a las 18:30h"
                  />
                  <p className="text-xs text-primary/40 mt-2">Este horario aparecerá en la página de Inicio y en las plantillas de los boletines semanales.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-600" />
                Almacenamiento en Google Drive (Reembolsos)
              </h2>
              <div className="space-y-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5">
                <div>
                  <label className="block text-xs font-bold text-emerald-900 mb-2 uppercase tracking-wide">
                    Enlace o ID de la carpeta de Google Drive (/Finanzas/Reembolsos/Adjuntos)
                  </label>
                  <input 
                    type="text" 
                    value={driveFolderUrl}
                    onChange={e => setDriveFolderUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-primary text-sm font-mono"
                    placeholder="https://drive.google.com/drive/folders/... o ID de la carpeta"
                  />
                  <p className="text-xs text-emerald-700/80 mt-2 leading-relaxed">
                    Los archivos adjuntos enviados en los formularios de Solicitud de Reembolso se guardarán automáticamente en esta carpeta de Google Drive (por defecto en <strong>/Finanzas/Reembolsos/Adjuntos</strong> de <em>huelvachurch@gmail.com</em>).
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-emerald-100">
                  <label className="block text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    URL de Google Apps Script (Alternativa 100% segura para Google Drive)
                  </label>
                  <p className="text-xs text-primary/70 mb-3 leading-relaxed">
                    Si el método estándar falla por permisos de Google Cloud, puedes usar este método alternativo infalible. Copia el siguiente código en un nuevo proyecto de <a href="https://script.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Google Apps Script</a> (con tu cuenta huelvachurch@gmail.com):
                  </p>
                  <div className="bg-slate-800 text-emerald-300 text-[10px] sm:text-xs p-3 rounded-xl mb-3 overflow-x-auto font-mono whitespace-pre text-left leading-tight">
{`function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const folderId = data.folderId || "11EJzsr8vs0r0kkpSVeA1p0EdqFjrpH7s";
    const folder = DriveApp.getFolderById(folderId);
    
    // Decodificar Base64
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.base64Data), 
      data.mimeType || "application/octet-stream", 
      data.fileName || "adjunto"
    );
    
    const file = folder.createFile(blob);
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      id: file.getId(), 
      webViewLink: file.getUrl() 
    })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                  </div>
                  <p className="text-xs text-primary/70 mb-3 leading-relaxed">
                    Haz clic en <strong>Implementar &gt; Nueva implementación</strong>. Selecciona "Aplicación web". Ejecutar como: <strong>Tú</strong>. Quién tiene acceso: <strong>Cualquier persona</strong>. Luego, pega aquí la <strong>URL de la aplicación web</strong>:
                  </p>
                  <input
                    type="text"
                    value={gasWebAppUrl}
                    onChange={e => setGasWebAppUrl(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-200 bg-white outline-none focus:ring-2 focus:ring-emerald-500 text-primary text-sm font-mono"
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 mt-2">
                  <button
                    type="button"
                    onClick={handleTestDriveConnection}
                    disabled={testingDrive}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
                  >
                    {testingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Probar Conexión con Google Drive
                  </button>

                  {driveStatus && driveStatus.webViewLink && (
                    <a
                      href={driveStatus.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:underline"
                    >
                      <span>Abrir Carpeta en Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {driveStatus && (
                  <div className={`p-4 rounded-xl text-xs font-medium border space-y-3 ${driveStatus.success ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-950'}`}>
                    <div className="flex items-start gap-2">
                      <div className="leading-relaxed">
                        {driveStatus.message}
                      </div>
                    </div>

                    {(driveStatus.message.includes('Google Drive API has not been used') || driveStatus.message.includes('disabled') || driveStatus.message.includes('295341840360') || driveStatus.message.includes('458081726794')) && (
                      <div className="p-3 bg-white/90 rounded-xl border border-amber-200 space-y-2 mt-2">
                        <p className="font-bold text-amber-900 text-xs">
                          ⚠️ Instrucciones para habilitar la API de Google Drive en Google Cloud:
                        </p>
                        <p className="text-amber-800 text-[11px] leading-normal">
                          1. Haz clic en cualquiera de los enlaces de abajo para ir directamente al panel de tu proyecto en Google Cloud.<br />
                          2. Pulsa el botón azul <strong>"Habilitar" / "Enable"</strong> en la página de Google Drive API.<br />
                          3. Espera unos segundos y vuelve a pulsar en <strong>"Probar Conexión con Google Drive"</strong>.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <a
                            href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=458081726794"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                          >
                            <span>Habilitar API en Proyecto Cloud Run (458081726794)</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        <p className="text-[11px] text-amber-800/80 mt-2 bg-amber-50 p-2 rounded border border-amber-100">
                          <strong>Nota Importante:</strong> El almacenamiento en Google Drive <strong>solo funciona en la aplicación desplegada (Cloud Run)</strong>. En el entorno de Vista Previa (AI Studio), esta función está bloqueada por seguridad y los archivos se guardarán temporalmente en la base de datos.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
                Opciones Adicionales
              </h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={hideHuelvaChurchCell}
                    onChange={e => setHideHuelvaChurchCell(e.target.checked)}
                    className="mt-1 w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-primary">Ocultar Célula Pastoral</span>
                    <span className="block text-xs text-primary/60 mt-1 leading-relaxed">
                      Si se activa, la célula "Huelva Church" (o la célula pastoral predeterminada) no aparecerá en las listas de selección del formulario "Unirme a una Célula" ni en la configuración de "Mi Célula".
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={hideRadio}
                    onChange={e => setHideRadio(e.target.checked)}
                    className="mt-1 w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-primary">Ocultar Radio</span>
                    <span className="block text-xs text-primary/60 mt-1 leading-relaxed">
                      Si se activa, se ocultará el enlace a la página de Radio en el menú de navegación y la franja de la radio en la página principal.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={hideNewsletter}
                    onChange={e => setHideNewsletter(e.target.checked)}
                    className="mt-1 w-4 h-4 text-secondary rounded border-slate-300 focus:ring-secondary"
                  />
                  <div>
                    <span className="block text-sm font-bold text-primary">Ocultar Boletines Informativos</span>
                    <span className="block text-xs text-primary/60 mt-1 leading-relaxed">
                      Si se activa, se ocultará la sección de suscripción a boletines en la página principal.
                    </span>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                type="submit"
                disabled={saving}
                className="bg-primary text-white font-bold py-3 px-8 rounded-xl hover:bg-secondary hover:text-primary transition-all flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Guardar Ajustes
              </button>
            </div>
          </form>
        </motion.div>

        {user?.email === 'huelvachurch@gmail.com' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white rounded-3xl p-8 border border-amber-200 shadow-sm text-left"
          >
            <h2 className="text-xl font-kenao text-primary mb-4 flex items-center gap-2">
              <span className="text-xl">🛠️</span>
              Modo Demo / Captura de Pantalla
            </h2>
            <p className="text-sm text-primary/70 mb-6">
              Como administrador <strong>huelvachurch@gmail.com</strong>, puedes restablecer tu vinculación a "Mi Célula" o limpiar todos los asistentes de tu célula desde esta sección de Ajustes para simular el estado inicial o realizar capturas de pantalla limpias de la interfaz.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  setResetInput('');
                  setResetModalType('celula');
                }}
                disabled={resetting}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Restablecer Mi Célula de esta Cuenta
              </button>
              <button
                onClick={() => {
                  setResetInput('');
                  setResetModalType('asistentes');
                }}
                disabled={resetting}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
              >
                Restablecer Asistentes de mi Célula
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {resetModalType && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 max-w-sm w-full shadow-2xl text-center text-slate-800">
            <h3 className="text-lg font-bold font-kenao text-primary mb-2">Confirmar Restablecimiento</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              {resetModalType === 'celula' 
                ? '¿Estás seguro de que deseas restablecer tu vinculación de célula? Esto le permitirá volver a seleccionar una célula desde cero en la página Mi Célula.'
                : '¿Estás seguro de que deseas eliminar todos los asistentes vinculados a tu célula? Esto los desvinculará a todos.'}
            </p>
            
            <div className="p-3 bg-slate-100/50 rounded-xl mb-4 border border-slate-100 text-[11px] text-slate-650">
              Escribe <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-red-200 font-bold text-red-650">RESET</span> en mayúsculas para confirmar.
            </div>
            
            <input
              type="text"
              placeholder="Escribe RESET aquí..."
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              className="text-center w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:bg-white text-xs font-mono uppercase tracking-widest font-bold mb-4 text-slate-800"
            />
            
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setResetModalType(null);
                  setResetInput('');
                }}
                className="flex-grow py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer select-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={resetInput !== 'RESET' || resetting}
                onClick={resetModalType === 'celula' ? handleResetMyCelula : handleResetAsistentes}
                className="flex-grow py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors disabled:opacity-40 disabled:hover:bg-red-600 cursor-pointer select-none flex items-center justify-center gap-2"
              >
                {resetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
