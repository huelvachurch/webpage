const fs = require('fs');
let content = fs.readFileSync('src/pages/Lideres.tsx', 'utf-8');

// Rename Academia to Acompañamientos in the tabs
content = content.replace(
  /<option value="supervision">Academia<\/option>/,
  '<option value="supervision">Acompañamientos</option>'
);

content = content.replace(
  /<BookOpen className="w-4 h-4 shrink-0" \/>\n            Academia/,
  '<BookOpen className="w-4 h-4 shrink-0" />\n            Acompañamientos'
);

fs.writeFileSync('src/pages/Lideres.tsx', content);
