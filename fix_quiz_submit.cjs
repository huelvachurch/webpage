const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /    if \(completed\.includes\(activeStepId\)\) \{\n      \/\/ Step already completed: just move to next step automatically\n      navigateNextStep\(\);\n      return;\n    \}/g,
  `    const isAlreadyCompleted = completed.includes(activeStepId);
    let shouldUpdateDB = !isAlreadyCompleted;
    if (activeStep?.type === 'quiz') {
      shouldUpdateDB = true;
    }
    
    if (isAlreadyCompleted && !shouldUpdateDB) {
      // Step already completed: just move to next step automatically
      navigateNextStep();
      return;
    }`
);

content = content.replace(
  /    const updatedCompleted = \[\.\.\.completed, activeStepId\];/g,
  `    const updatedCompleted = isAlreadyCompleted ? completed : [...completed, activeStepId];`
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
