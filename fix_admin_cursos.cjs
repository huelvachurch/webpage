const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf-8');

const regex = /                          \{ajustesFormData\.requiresCellSupervision && \([\s\S]*?<\/div>\n                          \)\}/;

content = content.replace(regex, '');

fs.writeFileSync('src/pages/admin/AdminCursos.tsx', content);
