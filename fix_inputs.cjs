const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /disabled={quizSubmitted}/g,
  'disabled={quizSubmitted && (qItem.isLocked ?? false)}'
);

content = content.replace(
  /onChange={\(\) => setQuizAnswers\(prev => \({ \.\.\.prev, \[qIdx\]: oIdx }\)\)}/g,
  'onChange={() => { setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx })); setQuizSubmitted(false); setQuizPassed(false); }}'
);

content = content.replace(
  /setQuizAnswers\(prev => \({ \.\.\.prev, \[qIdx\]: nextList }\)\);/g,
  'setQuizAnswers(prev => ({ ...prev, [qIdx]: nextList })); setQuizSubmitted(false); setQuizPassed(false);'
);

content = content.replace(
  /{!quizSubmitted \? \(/g,
  '{!quizSubmitted || !(qItem.isLocked ?? false) ? ('
);

content = content.replace(
  /onChange={\(e\) => setQuizAnswers\(prev => \({ \.\.\.prev, \[qIdx\]: e\.target\.value }\)\)}/g,
  'onChange={(e) => { setQuizAnswers(prev => ({ ...prev, [qIdx]: e.target.value })); setQuizSubmitted(false); setQuizPassed(false); }}'
);

content = content.replace(
  /setQuizAnswers\(prev => \({[^}]+\[qIdx\]: { \.\.\.prevMatches, \[leftVal\]: e\.target\.value }[^}]+\}\)\);/g,
  `setQuizAnswers(prev => ({\n                                            ...prev,\n                                            [qIdx]: { ...prevMatches, [leftVal]: e.target.value }\n                                          }));\n                                          setQuizSubmitted(false);\n                                          setQuizPassed(false);`
);

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
