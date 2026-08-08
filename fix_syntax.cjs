const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf8');

// Fix 1: Extra div around 1260
code = code.replace(
  /<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\) : \(\n\s*\/\* ====================================/g,
  `</div>\n                                </div>\n                              </div>\n                            ) : (\n                              /* ====================================`
);

fs.writeFileSync('src/pages/admin/AdminCursos.tsx', code);
console.log("Applied fix 1");
