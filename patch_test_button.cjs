const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf8');

const testButton = `
                                  <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
                                    <button
                                      type="button"
                                      onClick={handleSimulateSave}
                                      className="bg-primary text-white hover:bg-secondary hover:text-primary px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                                    >
                                      <Save className="w-4 h-4" />
                                      Guardar cambios
                                    </button>
                                  </div>
`;

code = code.replace(
  /(\s*)\}\)\}\s*\{\(activeStep\.questions \|\| \[\]\)\.length === 0 && \(\s*<div className="py-8 text-center text-primary\/30 text-xs italic">\s*Este cuestiorio está vacío\. Añade una pregunta para comenzar a armar el test\.\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*\)\}/,
  (match, p1) => match.replace(/<\/div>\s*<\/div>\s*\)\}/, `</div>\n${testButton}\n                                </div>\n                              )}`)
);

fs.writeFileSync('src/pages/admin/AdminCursos.tsx', code);
console.log("Patched test button");
