const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf-8');

const replacementHtml = `                          </div>
                        </div>

                        {/* Diploma PDF Config */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-150">
                          <label className="block text-xs font-black text-primary/40 uppercase tracking-widest mb-3">Enlace al Diploma (PDF)</label>
                          <p className="text-xs text-slate-500 mb-4">Si este curso entrega un diploma de finalización, puedes pegar aquí el enlace público del archivo PDF. Se mostrará a los alumnos al terminar el curso.</p>
                          <div className="relative">
                            <input 
                              type="url"
                              placeholder="Ej. https://drive.google.com/..."
                              value={ajustesFormData.diplomaPdfUrl}
                              onChange={(e) => setAjustesFormData({...ajustesFormData, diplomaPdfUrl: e.target.value})}
                              className="w-full bg-white pl-4 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-secondary text-sm font-medium text-primary shadow-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-widest text-primary/40 mb-2">Estado del Curso</label>`;

content = content.replace(
  /                          <\/div>\n                        <\/div>\n\n                        <div>\n                          <label className="block text-xs font-black uppercase tracking-widest text-primary\/40 mb-2">Estado del Curso<\/label>/,
  replacementHtml
);

fs.writeFileSync('src/pages/admin/AdminCursos.tsx', content);
