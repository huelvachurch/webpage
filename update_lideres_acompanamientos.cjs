const fs = require('fs');
let content = fs.readFileSync('src/pages/Lideres.tsx', 'utf-8');

const regex = /            \{activeTab === 'supervision' && \([\s\S]*?className="w-full text-left p-6 font-bold text-xs uppercase tracking-widest text-primary\/40 hover:bg-slate-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-2"/;

const replacement = `            {activeTab === 'supervision' && (
              <motion.div
                key="supervision-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-8"
              >
                {supervisedEnrollments.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-slate-150 shadow-sm space-y-3">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="text-lg font-bold text-primary">No hay alumnos de tu célula en cursos supervisados</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Cuando los integrantes vinculados a tu célula sean admitidos a cursos supervisados, aparecerán aquí para que asocies un acompañante.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {supervisedEnrollments.map((enrollment) => {
                      const course = supervisedCoursesMap[enrollment.courseId];
                      
                      const potentialGuides = [
                        { userId: user?.uid, name: user?.displayName || 'Mí (Líder)' },
                        ...cellMembers.filter(m => m.userId && m.userId !== user?.uid).map(m => ({ userId: m.userId, name: m.name }))
                      ];
                      
                      const isPaused = enrollment.isPaused === true;
                      
                      return (
                        <div key={enrollment.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-left p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-grow">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 inline-block mb-2">
                                🧩 {course?.title || 'Curso Supervisado'}
                              </span>
                              <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                                <User className="w-5 h-5 text-secondary shrink-0" />
                                {enrollment.studentName || 'Alumno de Célula'}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">
                                Inscrito el {enrollment.enrolledAt ? new Date(enrollment.enrolledAt.seconds * 1000).toLocaleDateString() : 'Recientemente'}
                                {isPaused && <span className="ml-2 text-rose-500 font-bold tracking-widest uppercase text-[10px] bg-rose-50 px-2 py-0.5 rounded-full">PAUSADO</span>}
                              </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              {/* Dropdown for Guide Selection */}
                              <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acompañante Asignado:</label>
                                <select 
                                  value={enrollment.guideId || ''}
                                  onChange={async (e) => {
                                    const guideId = e.target.value;
                                    const guideName = potentialGuides.find(g => g.userId === guideId)?.name || '';
                                    try {
                                      await updateDoc(doc(db, 'enrollments', enrollment.id), {
                                        leaderApproved: !!guideId,
                                        guideId: guideId || null,
                                        guideName: guideName || null,
                                        updatedAt: serverTimestamp()
                                      });
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.UPDATE, \`enrollments/\${enrollment.id}\`);
                                    }
                                  }}
                                  className="bg-slate-50 border border-slate-200 text-primary text-xs font-bold rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-56 cursor-pointer"
                                >
                                  <option value="">-- Sin asignar (Pendiente) --</option>
                                  {potentialGuides.map(g => (
                                    <option key={g.userId} value={g.userId}>{g.name}</option>
                                  ))}
                                </select>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'enrollments', enrollment.id), {
                                        isPaused: !isPaused,
                                        updatedAt: serverTimestamp()
                                      });
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.UPDATE, \`enrollments/\${enrollment.id}\`);
                                    }
                                  }}
                                  className={\`px-4 py-3 rounded-xl font-bold text-xs transition-colors shadow-sm \${isPaused ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}\`}
                                >
                                  {isPaused ? 'Reanudar' : 'Pausar'}
                                </button>
                                
                                <button
                                  onClick={async () => {
                                    if(confirm('¿Estás seguro de detener (cancelar) definitivamente este curso para el alumno?')) {
                                      try {
                                        await updateDoc(doc(db, 'enrollments', enrollment.id), {
                                          status: 'dropped',
                                          updatedAt: serverTimestamp()
                                        });
                                      } catch (err) {
                                        handleFirestoreError(err, OperationType.UPDATE, \`enrollments/\${enrollment.id}\`);
                                      }
                                    }
                                  }}
                                  className="px-4 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl font-bold text-xs transition-colors shadow-sm"
                                >
                                  Detener
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            <button
              onClick={() => setActiveTab('inicio')}
              className="w-full text-left p-6 font-bold text-xs uppercase tracking-widest text-primary/40 hover:bg-slate-50 transition-colors border-t border-slate-100 flex items-center justify-center gap-2"`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/pages/Lideres.tsx', content);
