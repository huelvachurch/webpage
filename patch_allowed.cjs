const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminFinanzas.tsx', 'utf8');

content = content.replace(
  /return \['bancarios', 'celebraciones', 'cafeteria', 'libreria', 'reembolsos'\] as Array<'bancarios' \| 'celebraciones' \| 'caja_chica' \| 'cafeteria' \| 'libreria' \| 'reembolsos' \| 'permisos'>;/,
  `return ['bancarios', 'celebraciones', 'caja_chica', 'cafeteria', 'libreria', 'reembolsos'] as Array<'bancarios' | 'celebraciones' | 'caja_chica' | 'cafeteria' | 'libreria' | 'reembolsos' | 'permisos'>;`
);

content = content.replace(
  /const tabs: Array\<'bancarios' \| 'celebraciones' \| 'cafeteria' \| 'libreria' \| 'reembolsos'\> = \[\];/,
  `const tabs: Array<'bancarios' | 'celebraciones' | 'caja_chica' | 'cafeteria' | 'libreria' | 'reembolsos'> = [];`
);

content = content.replace(
  /if \(hasPermission\('reembolsos'\)\) tabs\.push\('reembolsos'\);/g,
  `if (hasPermission('caja_chica')) tabs.push('caja_chica');\n    if (hasPermission('reembolsos')) tabs.push('reembolsos');`
);

fs.writeFileSync('src/pages/admin/AdminFinanzas.tsx', content);
