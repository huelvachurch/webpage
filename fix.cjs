const fs = require('fs');
let code = fs.readFileSync('src/components/VisualBlockEditor.tsx', 'utf8');

code = code.replace(/<CustomEditorProvider/g, '<EditorProvider');

fs.writeFileSync('src/components/VisualBlockEditor.tsx', code);
