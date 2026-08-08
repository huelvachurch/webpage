const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf8');

const regex = /<div className="space-y-4 lg:col-span-2">[\s\S]*?<div className="bg-slate-50\/50 p-6 border border-slate-200\/60 rounded-2xl shadow-sm min-h-\[400px\]">[\s\S]*?<VisualBlockEditor[\s\S]*?\/>\s*<\/div>\s*<span className="text-\[10px\] text-slate-400 font-semibold italic text-center block">Los cambios se guardarán como formato Markdown, pero tú puedes editarlos visualmente\.<\/span>\s*<\/div>/;

const newLayout = `<div className="space-y-4">
                                    <div className="flex flex-col gap-2.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                          <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block">Constructor Visual de la Clase</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isAnalyzingPdf}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-all border border-indigo-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            title="Subir PDF para extraer estructura con Inteligencia Artificial"
                                          >
                                            {isAnalyzingPdf ? '⏳ Analizando...' : '✨ Analizar PDF'}
                                          </button>
                                          <input
                                             type="file"
                                             accept="application/pdf"
                                            className="hidden"
                                            ref={fileInputRef}
                                            onChange={handlePdfFileChange}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-slate-50/50 p-6 border border-slate-200/60 rounded-2xl shadow-sm min-h-[400px]">
                                      <VisualBlockEditor
                                         content={activeStep.content || ''}
                                         onChange={(newContent) => handleUpdateStepFields({ content: newContent })}
                                       />
                                    </div>
                                  </div>
                                  
                                  {/* RIGHT COLUMN: PREVIEW */}
                                  <div className="space-y-4">
                                    <div className="flex flex-col gap-2.5">
                                      <div className="flex items-center justify-between h-[30px]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block">Vista Previa</span>
                                      </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm min-h-[400px] prose prose-slate max-w-none text-slate-800 leading-relaxed tracking-normal font-sans">
                                      <TheoryMarkdown content={activeStep.content || ''} />
                                    </div>
                                  </div>`;

if(regex.test(code)) {
  code = code.replace(regex, newLayout);
  fs.writeFileSync('src/pages/admin/AdminCursos.tsx', code);
  console.log("Patched layout successfully");
} else {
  console.log("Could not find regex match!");
}
