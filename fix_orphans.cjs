const fs = require('fs');
let content = fs.readFileSync('src/pages/Lideres.tsx', 'utf-8');

content = content.replace(
  /                  <h2 className="text-3xl font-kenao text-primary font-bold mb-3">\n                    Aprobación y Desbloqueo de Cursos\n                  <\/h2>\n                  <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">\n                    Como Líder de Célula, puedes supervisar el avance de los miembros de tu célula en los cursos de formación con requisito de supervisión\. Autoriza su inicio y desbloquea clases conforme completan su proceso\.\n                  <\/p>\n                <\/div>\n/,
  ''
);

fs.writeFileSync('src/pages/Lideres.tsx', content);
