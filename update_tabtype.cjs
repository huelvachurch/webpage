const fs = require('fs');
let content = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');

content = content.replace(
  /type TabType = 'notificaciones' \| 'estudios' \| 'peticiones' \| 'info';/,
  "type TabType = 'notificaciones' | 'estudios' | 'peticiones' | 'info' | 'academia';"
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
