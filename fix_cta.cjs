const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /\n                    \{\!quizSubmitted \|\| \!\(qItem\.isLocked \?\? false\) \? \(/g,
  '\n                    {!quizSubmitted ? ('
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
