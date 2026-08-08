const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf8');

// I need to count the difference in divs for testButton and other stuff.
// Or wait, let me just undo the previous patch by taking the original file and ONLY injecting where it belongs properly!
