const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /    \/\/ Otherwise, find next unlocked class\n    const classIdx = classes\.findIndex\(c => c\.id === activeClassId\);\n    if \(classIdx < classes\.length - 1\) \{\n      const nextClass = classes\[classIdx \+ 1\];\n      const nextClassIndex = classIdx \+ 1;\n      \n      if \(\!isClassLocked\(nextClass, nextClassIndex\)\) \{\n        setActiveClassId\(nextClass\.id\);\n        const nextClassSteps = steps\[nextClass\.id\] \|\| \[\];\n        if \(nextClassSteps\.length > 0\) \{\n          setActiveStepId\(nextClassSteps\[0\]\.id\);\n        \} else \{\n          setActiveStepId\(null\);\n        \}\n      \} else \{\n        alert\("¡Has terminado este módulo\! El siguiente módulo se encuentra bloqueado hasta que completes los requisitos de tiempo o de materias previas\."\);\n      \}\n    \}/g,
  `    // Find next class regardless of lock status so they can see the locked screen
    const classIdx = classes.findIndex(c => c.id === activeClassId);
    if (classIdx < classes.length - 1) {
      const nextClass = classes[classIdx + 1];
      setActiveClassId(nextClass.id);
      const nextClassSteps = steps[nextClass.id] || [];
      if (nextClassSteps.length > 0) {
        setActiveStepId(nextClassSteps[0].id);
      } else {
        setActiveStepId(null);
      }
    } else {
      // Course fully completed!
      setActiveClassId(null);
      setActiveStepId(null);
    }`
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
