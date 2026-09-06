const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

const endScreenCode = `          if (!activeStep) {
            if (enrollment.progress >= 100 || (!activeClassId && classes.length > 0)) {
              return (
                <div className="flex-grow flex flex-col items-center justify-center py-20 text-center max-w-2xl mx-auto animate-fade-in px-6">
                  <div className="w-28 h-28 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-sm border border-emerald-100">
                    <Award className="w-14 h-14" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 inline-block mb-4">
                    ¡Felicidades!
                  </span>
                  <h3 className="text-4xl font-kenao text-primary mb-4">Has Finalizado este Curso</h3>
                  <p className="text-primary/60 text-sm leading-relaxed mb-8 max-w-lg mx-auto">
                    Has completado exitosamente todas las clases y cuestionarios de este curso de formación. Nos enorgullece mucho tu constancia y crecimiento.
                  </p>
                  
                  {course.diplomaPdfUrl && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm w-full mb-8">
                      <div className="flex items-center gap-4 text-left">
                        <div className="w-12 h-12 bg-secondary/20 text-secondary rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-primary">Diploma de Finalización</h4>
                          <p className="text-xs text-slate-500 mt-1">Descarga tu certificado oficial en formato PDF.</p>
                        </div>
                        <a 
                          href={course.diplomaPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-auto inline-flex items-center gap-2 bg-primary hover:bg-secondary hover:text-primary text-white font-bold text-[10px] uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-sm"
                        >
                          <Download className="w-4 h-4" />
                          Descargar PDF
                        </a>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/mis-cursos')}
                    className="inline-flex items-center gap-2 text-primary hover:text-secondary font-bold text-xs transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver a Mis Cursos
                  </button>
                </div>
              );
            }

            return (
              <div className="flex-grow flex flex-col items-center justify-center py-20 text-center max-w-xl mx-auto">`;

content = content.replace(
  /          if \(\!activeStep\) \{\n            return \(\n              <div className="flex-grow flex flex-col items-center justify-center py-20 text-center max-w-xl mx-auto">/,
  endScreenCode
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
