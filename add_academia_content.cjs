const fs = require('fs');
let content = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');

const academiaContent = `                {activeTab === 'academia' && (
                  <motion.div
                    key="academia-view"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="space-y-6"
                  >
                    {guidedEnrollments.map((enrollment) => {
                      const course = guidedCoursesMap[enrollment.courseId];
                      const classes = guidedClassesMap[enrollment.courseId] || [];
                      
                      return (
                        <div key={enrollment.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-left">
                          <div 
                            className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => toggleEnrollment(enrollment.id)}
                          >
                            <div className="flex-grow">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mb-2">
                                🧩 {course?.title || 'Curso Supervisado'}
                              </span>
                              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                                <UserIcon className="w-5 h-5 text-secondary shrink-0" />
                                {enrollment.studentName || 'Alumno'}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">
                                Inscrito el {enrollment.enrolledAt ? new Date(enrollment.enrolledAt.seconds * 1000).toLocaleDateString() : 'Recientemente'}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <ChevronRight className={\`w-6 h-6 text-slate-400 transition-transform \${expandedEnrollments.includes(enrollment.id) ? 'rotate-90' : ''}\`} />
                            </div>
                          </div>

                          {expandedEnrollments.includes(enrollment.id) && (
                            <div className="p-6 border-t border-slate-100 space-y-6">
                              <div className="space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary/60">
                                  Clases y Respuestas del Alumno
                                </h4>
                                {classes.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-2xl">
                                    Este curso no tiene clases configuradas.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {classes.map((clase) => {
                                      const isUnlocked = enrollment.approvedClassIds?.includes(clase.id);
                                      const isRequested = (enrollment.classUnlockRequests || []).includes(clase.id);
                                      const isLockable = clase.requiresLeaderApproval;
                                      const isClassExpanded = expandedClasses.includes(\`\${enrollment.id}-\${clase.id}\`);
                                      
                                      const quizAnswersMap = enrollment.quizAnswersMap || {};
                                      const classQuizData = Object.values(quizAnswersMap).find((qa: any) => qa.classId === clase.id) as any;
                                      const hasQuizData = !!classQuizData;

                                      return (
                                        <div key={clase.id} className="border border-slate-100 rounded-2xl overflow-hidden">
                                          <div 
                                            className="bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                                            onClick={() => toggleClass(enrollment.id, clase.id)}
                                          >
                                            <div>
                                              <span className="text-[10px] font-black uppercase tracking-widest text-secondary block mb-1">
                                                Clase {clase.order + 1}
                                              </span>
                                              <h5 className="text-sm font-bold text-primary flex items-center gap-2">
                                                {clase.title}
                                                {isLockable && (
                                                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Requiere Aprob.</span>
                                                )}
                                              </h5>
                                            </div>

                                            <div className="flex items-center gap-3">
                                              {isLockable && (
                                                isUnlocked ? (
                                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" onClick={e => e.stopPropagation()}>
                                                    <Check className="w-3.5 h-3.5" />
                                                    Desbloqueada
                                                  </span>
                                                ) : isRequested ? (
                                                  <button
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      const current = enrollment.approvedClassIds || [];
                                                      try {
                                                        const { updateDoc, doc, serverTimestamp } = require('firebase/firestore');
                                                        await updateDoc(doc(db, 'enrollments', enrollment.id), {
                                                          approvedClassIds: [...current, clase.id],
                                                          updatedAt: serverTimestamp()
                                                        });
                                                      } catch(err) {}
                                                    }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer shadow-sm animate-pulse"
                                                  >
                                                    <BookOpen className="w-4 h-4" />
                                                    Permitir Acceso
                                                  </button>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200" onClick={e => e.stopPropagation()}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Aún no solicitada
                                                  </span>
                                                )
                                              )}
                                              
                                              {hasQuizData && (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20" onClick={e => e.stopPropagation()}>
                                                  <Check className="w-3.5 h-3.5" />
                                                  Respuestas Enviadas
                                                </span>
                                              )}
                                              <ChevronRight className={\`w-4 h-4 text-slate-300 transition-transform \${isClassExpanded ? 'rotate-90' : ''}\`} />
                                            </div>
                                          </div>

                                          {/* Quiz Answers Expanded Area */}
                                          {isClassExpanded && (
                                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
                                              {!hasQuizData ? (
                                                <p className="italic text-slate-400">El alumno aún no ha enviado respuestas para esta clase.</p>
                                              ) : (
                                                <div className="space-y-4">
                                                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                                                    <span className="font-bold text-primary">Calificación obtenida:</span>
                                                    <span className={\`font-black text-sm px-2 py-1 rounded-lg \${classQuizData.score >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}\`}>
                                                      {classQuizData.score}%
                                                    </span>
                                                  </div>
                                                  {classQuizData.questions && classQuizData.questions.map((q: any, i: number) => {
                                                    const ans = classQuizData.answers[i];
                                                    return (
                                                      <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                                        <p className="font-bold text-primary mb-2">Q{i + 1}. {q.text}</p>
                                                        <div className="pl-3 border-l-2 border-secondary/30">
                                                          <span className="text-slate-500 font-bold block mb-1">Respuesta del alumno:</span>
                                                          <span className="text-slate-700">
                                                            {q.type === 'multiple' && Array.isArray(ans) 
                                                              ? ans.map(a => q.options[a]).join(', ')
                                                              : q.type === 'pairs' && typeof ans === 'object'
                                                                ? Object.entries(ans).map(([l, r]) => \`\${l} ➔ \${r}\`).join(' | ')
                                                                : q.type === 'single'
                                                                  ? q.options[ans]
                                                                  : ans?.toString() || <em className="text-slate-400">Sin responder</em>
                                                            }
                                                          </span>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
`;

content = content.replace(
  /                \)\}\n              <\/AnimatePresence>/,
  academiaContent + '\n                )}\n              </AnimatePresence>'
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
