const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminFinanzas.tsx', 'utf8');

// Remove bolsaMonedas table body cells
content = content.replace(
  /<td className="py-4 px-6 font-semibold text-purple-700 whitespace-nowrap">\s*\{arq\.bolsaMonedas\.toLocaleString\('es-ES', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\} €\s*<\/td>/g,
  ``
);

// Remove MONEDAS table headers
content = content.replace(
  /<th className="py-4 px-6">MONEDAS<\/th>/g,
  ``
);

fs.writeFileSync('src/pages/admin/AdminFinanzas.tsx', content);
