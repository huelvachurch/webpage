const fs = require('fs');
let content = fs.readFileSync('src/pages/Lideres.tsx', 'utf-8');

// Replace tab name
content = content.replace(
  /<option value="supervision">Supervisión Cursos<\/option>/g,
  '<option value="supervision">Academia</option>'
);

// Delete the header banner entirely
content = content.replace(
  /                \{\/\* Header Banner \*\/\}\n                <div className="bg-gradient-to-r from-amber-50 to-amber-100\/80 border border-amber-200\/80 rounded-3xl p-8 text-left">[\s\S]*?<\/div>\n/,
  ''
);

// Replace comments block
const oldCommentsBlock = `                                              <p className="text-xs text-slate-500 mb-4">Respuestas de los cuestionarios asociados a esta clase u otras (historial del alumno):</p>
                                              {Object.keys(quizAnswersMap || {}).length === 0 ? (
                                                <p className="text-[11px] text-slate-400 italic">El alumno aún no ha completado cuestionarios.</p>
                                              ) : (
                                                <div className="space-y-4">
                                                  {Object.entries(quizAnswersMap).map(([stepId, data]: [string, any]) => (`;

const newCommentsBlock = `                                              <p className="text-xs text-slate-500 mb-4">Respuestas de los cuestionarios asociados a esta clase:</p>
                                              
                                              {enrollment.classComments?.[clase.id] && (
                                                <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                  <div className="flex items-center gap-1.5 mb-2">
                                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-800/60">Comentario del alumno al finalizar la clase</span>
                                                  </div>
                                                  <p className="text-xs font-medium text-blue-900/80 leading-relaxed whitespace-pre-line">
                                                    {enrollment.classComments[clase.id]}
                                                  </p>
                                                </div>
                                              )}

                                              {Object.keys(quizAnswersMap || {}).filter(k => (quizAnswersMap[k] as any).classId === clase.id).length === 0 ? (
                                                <p className="text-[11px] text-slate-400 italic">El alumno aún no ha completado cuestionarios para esta clase.</p>
                                              ) : (
                                                <div className="space-y-4">
                                                  {Object.entries(quizAnswersMap).filter(([k, d]) => (d as any).classId === clase.id).map(([stepId, data]: [string, any]) => (`;

content = content.replace(oldCommentsBlock, newCommentsBlock);

fs.writeFileSync('src/pages/Lideres.tsx', content);
