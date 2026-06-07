const fs = require('fs');
let fileStr = fs.readFileSync('src/pages/Lideres.tsx', 'utf8');

const targetStart = `                      {displayedAnnouncements.map((ann) => {`;
const targetEnd = `                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </motion.div>
            )}`;

let startIndex = fileStr.indexOf(targetStart);
let afterStart = fileStr.slice(startIndex);
let endRelIndex = afterStart.indexOf(targetEnd);

if (startIndex !== -1 && endRelIndex !== -1) {
  let endIndex = startIndex + endRelIndex + targetEnd.length;

  const newBlock = `                      {displayedAnnouncements.map((ann) => {
                        const isExpired = ann.expiry && ann.expiry < todayStr;
                        return (
                          <div 
                            key={ann.id}
                            className={\`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative group hover:shadow-md transition-shadow \${isExpired ? 'opacity-60 border-dashed bg-slate-50/50' : ''}\`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary/75 text-xs font-bold font-kenao">
                                  {ann.supervisorName ? ann.supervisorName.slice(0, 2).toUpperCase() : 'SP'}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                                    {ann.supervisorName}
                                    {isExpired && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold">Vencido</span>
                                    )}
                                    {ann.expiry && !isExpired && (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[9px] font-mono uppercase tracking-wider font-bold">Expira: {ann.expiry.split('-').reverse().join('/')}</span>
                                    )}
                                  </h4>
                                  <span className="text-[10px] text-slate-400">
                                    {ann.createdAt ? new Date(ann.createdAt.toDate ? ann.createdAt.toDate() : ann.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Recientemente'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <h4 className="font-bold text-amber-900 mt-3 mb-1">{ann.title}</h4>
                            <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                              {ann.message}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </motion.div>
            )}`;

  const newStr = fileStr.substring(0, startIndex) + newBlock + fileStr.substring(endIndex);
  fs.writeFileSync('src/pages/Lideres.tsx', newStr);
  console.log('Success');
} else {
  console.log('Error found:' + startIndex + ' ' + endRelIndex);
}
