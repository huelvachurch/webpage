const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf8');

// 1. Add save toast state
if (!code.includes('showSaveToast')) {
  code = code.replace(
    /const \[isAnalyzingPdf, setIsAnalyzingPdf\] = useState\(false\);/,
    "const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);\n  const [showSaveToast, setShowSaveToast] = useState(false);\n  const handleSimulateSave = () => {\n    setShowSaveToast(true);\n    setTimeout(() => setShowSaveToast(false), 2000);\n  };"
  );
}

// 2. Add Guardar button in Theory section
const theoryButton = `
                                    <div className="flex justify-end mt-4">
                                      <button
                                        type="button"
                                        onClick={handleSimulateSave}
                                        className="bg-primary text-white hover:bg-secondary hover:text-primary px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                                      >
                                        <Save className="w-4 h-4" />
                                        Guardar cambios
                                      </button>
                                    </div>
                                  </div>`;
code = code.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*\) : \(\s*\/\* ====================================/,
  `</div>\n${theoryButton}\n                                </div>\n                              </div>\n                            ) : (\n                              /* ====================================`
);

// 3. Add Guardar button in Test section
const testButton = `
                                  <div className="flex justify-end mt-6">
                                    <button
                                      type="button"
                                      onClick={handleSimulateSave}
                                      className="bg-primary text-white hover:bg-secondary hover:text-primary px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm hover:shadow-md flex items-center gap-2 cursor-pointer"
                                    >
                                      <Save className="w-4 h-4" />
                                      Guardar cambios
                                    </button>
                                  </div>
                                </div>
                              </div>`;
code = code.replace(
  /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\s*}\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/main>/,
  `</div>\n${testButton}\n                            </div>\n                          </div>\n                        </div>\n                      </div>\n                    </div>\n                  )\n                }\n              </div>\n            </div>\n          </div>\n        </div>\n      </main>`
);

fs.writeFileSync('src/pages/admin/AdminCursos.tsx', code);
console.log("Patched AdminCursos.tsx");
