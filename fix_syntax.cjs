const fs = require('fs');
let content = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');

content = content.replace(
  /                  <\/motion\.div>\n                \{activeTab === 'academia' && \(/,
  "                  </motion.div>\n                )}\n                {activeTab === 'academia' && ("
);

// We should also clean up the extra `)}` at the bottom:
content = content.replace(
  /                  <\/motion\.div>\n                \)\}\n                \)\}\n              <\/AnimatePresence>/,
  "                  </motion.div>\n                )}\n              </AnimatePresence>"
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
