const fs = require('fs');
let content = fs.readFileSync('src/pages/Cursos.tsx', 'utf-8');

// Change status from 'pending' to 'active'
content = content.replace(
  /status: 'pending',/,
  "status: 'active',"
);

// If leaderApproved is false, let's leave it as false so leader has to approve it.
// The prompt: "El permiso de ingreso al curso por parte de Administración sea automático y que solo espere autorización del líder para iniciar."
// This means if it requires cell supervision, it defaults to 'active' but leaderApproved: false.
// So the above replace is sufficient.

fs.writeFileSync('src/pages/Cursos.tsx', content);
