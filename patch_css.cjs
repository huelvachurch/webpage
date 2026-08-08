const fs = require('fs');
let code = fs.readFileSync('src/index.css', 'utf8');

// replace the rsw-ce list styles
code = code.replace(/\/\* Override react-simple-wysiwyg list styles \*\/[\s\S]*?\/\* Ensure headings inside the editor match the preview sizing \*\//, `/* Override react-simple-wysiwyg list styles */
.rsw-ce {
  font-size: 0.875rem !important; /* matching text-sm */
}
.rsw-ce ul, .rsw-ce ol, .rsw-ce li, .rsw-ce p {
  font-size: 0.875rem !important;
  font-family: inherit !important;
}
.rsw-ce ul, .rsw-ce ol {
  margin-left: 1.5rem !important;
  padding-left: 0 !important;
}
.rsw-ce ul {
  list-style-type: disc !important;
}
.rsw-ce ol {
  list-style-type: decimal !important;
}
.rsw-ce li {
  margin-bottom: 0.25rem;
}

/* Ensure headings inside the editor match the preview sizing */`);

fs.writeFileSync('src/index.css', code);
console.log("Patched src/index.css");
