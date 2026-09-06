const fs = require('fs');
let content = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');

content = content.replace(
  /                  <\/motion\.div>\n                \)\}\n                \)\}/g,
  "                  </motion.div>\n                )}"
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
