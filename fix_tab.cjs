const fs = require('fs');
let content = fs.readFileSync('src/pages/Lideres.tsx', 'utf-8');

content = content.replace(
  /<BookOpen className="w-4 h-4 shrink-0" \/>\n            Supervisión/,
  '<BookOpen className="w-4 h-4 shrink-0" />\n            Academia'
);

fs.writeFileSync('src/pages/Lideres.tsx', content);
