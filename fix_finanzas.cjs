const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminFinanzas.tsx', 'utf8');

// 1. handleConfirmArqueo modifications
// Change sobre, bolsa, caja vars
content = content.replace(
  /const totalArqueoDistribuido = useMemo\(\(\) => \{\s*const sobre = parseFloat\(arqueoSobre\) \|\| 0;\s*const bolsa = parseFloat\(arqueoBolsa\) \|\| 0;\s*const caja = parseFloat\(arqueoCajaChica\) \|\| 0;\s*return sobre \+ bolsa \+ caja;\s*\}, \[arqueoSobre, arqueoBolsa, arqueoCajaChica\]\);/g,
  `const totalArqueoDistribuido = useMemo(() => {
    const sobre = parseFloat(arqueoSobre) || 0;
    const caja = parseFloat(arqueoCajaChica) || 0;
    return sobre + caja;
  }, [arqueoSobre, arqueoCajaChica]);`
);

content = content.replace(
  /const handleConfirmArqueo = async \(e: React\.FormEvent\) => \{\s*e\.preventDefault\(\);\s*const sobre = parseFloat\(arqueoSobre\) \|\| 0;\s*const bolsa = parseFloat\(arqueoBolsa\) \|\| 0;\s*const caja = parseFloat\(arqueoCajaChica\) \|\| 0;\s*if \(totalArqueoDistribuido <= 0\) \{\s*alert\("Por favor, distribuye el efectivo en al menos un rubro \(Sobre, Bolsa o Caja Chica\)\."\);\s*return;\s*\}/,
  `const handleConfirmArqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    const sobre = parseFloat(arqueoSobre) || 0;
    const caja = parseFloat(arqueoCajaChica) || 0;

    if (totalArqueoDistribuido <= 0) {
      alert("Por favor, distribuye el efectivo en al menos un rubro (A Depositar o Caja Chica).");
      return;
    }`
);

content = content.replace(
  /sobreBilletes: sobre,\s*bolsaMonedas: bolsa,\s*cajaChica: caja,/,
  `sobreBilletes: sobre,
        bolsaMonedas: 0,
        cajaChica: caja,`
);

content = content.replace(
  /setArqueoBolsa\(''\);\s*/,
  ``
);

// 2. Remove Bolsa (Monedas) JSX from Celebraciones and change Sobre to A Depositar
content = content.replace(
  /Sobre \(Billetes\)/g,
  `A Depositar (Billetes)`
);

content = content.replace(
  /\{\/\* Card 2: Bolsa Monedas \*\/\}[\s\S]*?\{\/\* Card 3: Caja Chica \*\/\}/,
  `{/* Card 3: Caja Chica */}`
);

content = content.replace(
  /<th className="py-4 px-6">BOLSA \(MONEDAS\)<\/th>/g,
  ``
);

content = content.replace(
  /<td className="py-4 px-6 font-bold text-purple-600">\s*\{arq\.bolsaMonedas\.toLocaleString\('es-ES', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\} €\s*<\/td>/g,
  ``
);

// 3. Update handleSaveModuleArqueo
content = content.replace(
  /const handleSaveModuleArqueo = async \([\s\S]*?const diferencia = totalEfectivo - expectedBalance;/m,
  `const handleSaveModuleArqueo = async (
    e: React.FormEvent,
    module: 'caja_chica' | 'cafeteria' | 'libreria',
    date: string,
    billetesStr: string,
    monedasStr: string,
    expectedBalance: number,
    notes: string,
    setSaving: (v: boolean) => void,
    resetForm: () => void
  ) => {
    e.preventDefault();
    const billetes = parseFloat(billetesStr) || 0;
    const monedas = parseFloat(monedasStr) || 0;
    const totalEfectivo = billetes + monedas;

    if (totalEfectivo <= 0 && billetesStr === '' && monedasStr === '') {
      alert("Introduce los montos contados.");
      return;
    }

    const diferencia = totalEfectivo - expectedBalance;`
);

// We need to inject the logic to create finanzas_caja_chica ingreso for Cafeteria/Libreria.
// Also, we change the fields saved to `finanzas_arqueos`
content = content.replace(
  /diferencia,\s*sobreBilletes: billetes,\s*bolsaMonedas: monedas,\s*notes/m,
  `diferencia,
        sobreBilletes: billetes,
        bolsaMonedas: 0,
        cajaChica: monedas,
        notes`
);

content = content.replace(
  /alert\("¡Arqueo de caja registrado correctamente!"\);\s*resetForm\(\);/m,
  `if (monedas > 0 && module !== 'caja_chica') {
        let moduleName = module === 'cafeteria' ? 'Cafetería' : 'Librería';
        await addDoc(collection(db, 'finanzas_caja_chica'), {
          date: date,
          type: 'ingreso',
          category: \`\${moduleName} / Arqueo\`,
          concept: \`Retención Arqueo \${moduleName} (\${date})\`,
          amount: monedas,
          notes: notes.trim() || \`Ingreso automático desde Arqueo de \${moduleName}\`,
          registeredByUid: user?.uid,
          registeredByName: user?.displayName || user?.email || 'Financiero',
          createdAt: serverTimestamp()
        });
      }

      alert("¡Arqueo de caja registrado correctamente!");
      resetForm();`
);

// Change UI text for Cafeteria / Libreria Arqueos
content = content.replace(
  /Total Billetes \(€\)/g,
  `A Depositar (Billetes) (€)`
);

content = content.replace(
  /Total Monedas \(€\)/g,
  `Caja Chica (€)`
);

content = content.replace(
  /Monedas contadas/g,
  `Efectivo retenido para gastos`
);

// Now fix the Egreso handlers to use setDoc so they create identically ID'd documents in finanzas_caja_chica!
// We'll write a specific replacement for each.

// Celeb Egreso
const celebEgresoOld = `await addDoc(collection(db, 'finanzas_celebraciones'), {
        date: celebEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: celebEgresoForm.destination.trim(),
        concept: celebEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: celebEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });`;
      
const celebEgresoNew = `const newRef = doc(collection(db, 'finanzas_celebraciones'));
      const data = {
        date: celebEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: celebEgresoForm.destination.trim(),
        concept: celebEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: celebEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      };
      await setDoc(newRef, data);
      await setDoc(doc(db, 'finanzas_caja_chica', newRef.id), {
        ...data,
        category: 'Celebraciones / Egreso'
      });`;
      
content = content.replace(celebEgresoOld, celebEgresoNew);

// Cafeteria Egreso
const cafeEgresoOld = `await addDoc(collection(db, 'finanzas_cafeteria'), {
        date: cafeteriaEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: cafeteriaEgresoForm.destination.trim(),
        concept: cafeteriaEgresoForm.destination.trim(),
        category: cafeteriaEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: cafeteriaEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });`;
      
const cafeEgresoNew = `const newRef = doc(collection(db, 'finanzas_cafeteria'));
      const data = {
        date: cafeteriaEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: cafeteriaEgresoForm.destination.trim(),
        concept: cafeteriaEgresoForm.destination.trim(),
        category: cafeteriaEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: cafeteriaEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      };
      await setDoc(newRef, data);
      await setDoc(doc(db, 'finanzas_caja_chica', newRef.id), {
        ...data,
        category: 'Cafetería / Egreso'
      });`;

content = content.replace(cafeEgresoOld, cafeEgresoNew);

// Libreria Egreso
const libreriaEgresoOld = `await addDoc(collection(db, 'finanzas_libreria'), {
        date: libreriaEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: libreriaEgresoForm.destination.trim(),
        concept: libreriaEgresoForm.destination.trim(),
        category: libreriaEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: libreriaEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      });`;
      
const libreriaEgresoNew = `const newRef = doc(collection(db, 'finanzas_libreria'));
      const data = {
        date: libreriaEgresoForm.date,
        type: 'egreso',
        amount: parsedAmount,
        destination: libreriaEgresoForm.destination.trim(),
        concept: libreriaEgresoForm.destination.trim(),
        category: libreriaEgresoForm.destination.trim(),
        paymentMethod: 'Efectivo',
        notes: libreriaEgresoForm.notes.trim() || '',
        registeredByUid: user?.uid,
        registeredByName: user?.displayName || user?.email || 'Financiero',
        createdAt: serverTimestamp()
      };
      await setDoc(newRef, data);
      await setDoc(doc(db, 'finanzas_caja_chica', newRef.id), {
        ...data,
        category: 'Librería / Egreso'
      });`;

content = content.replace(libreriaEgresoOld, libreriaEgresoNew);

fs.writeFileSync('src/pages/admin/AdminFinanzas.tsx', content);
