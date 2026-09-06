const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /  requiresCellSupervision\?: boolean;/,
  "  requiresCellSupervision?: boolean;\n  diplomaPdfUrl?: string;"
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
