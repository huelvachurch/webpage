const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /                        \)\} \n                      <\/div>\n                    \);\n                  \}\)}\n                <\/div>/,
  `                        )}
                        {/* Explanation Display */}
                        {qItem.explanation && (
                          <div className="mt-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-800/60 block mb-1">
                              Explicación Adicional
                            </span>
                            <p className="text-xs font-medium text-blue-900/80 leading-relaxed whitespace-pre-line">
                              {qItem.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>`
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
