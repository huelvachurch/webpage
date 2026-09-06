const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminFinanzas.tsx', 'utf8');

// Replace labels inside the Caja Chica Arqueo
const targetCode = `<div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">A Depositar (Billetes) (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cajaArqueoBilletes}
                          onChange={(e) => setCajaArqueoBilletes(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Caja Chica (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cajaArqueoMonedas}
                          onChange={(e) => setCajaArqueoMonedas(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>`;

const newCode = `<div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Total Billetes (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cajaArqueoBilletes}
                          onChange={(e) => setCajaArqueoBilletes(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-primary/70 mb-1">Total Monedas (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cajaArqueoMonedas}
                          onChange={(e) => setCajaArqueoMonedas(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-primary outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>`;

content = content.replace(targetCode, newCode);
fs.writeFileSync('src/pages/admin/AdminFinanzas.tsx', content);
