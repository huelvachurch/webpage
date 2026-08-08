const fs = require('fs');
let code = fs.readFileSync('src/components/VisualBlockEditor.tsx', 'utf8');

// Match from `const AddBlockBar = ` to `  };` followed by `  return (`
const regex = /\s*const AddBlockBar = \(\{[\s\S]*?\}\);\s*return \(/;

const match = code.match(regex);
if (match) {
  // Wait, I can just split on `const AddBlockBar = ` and `  return (`
  let parts1 = code.split('  const AddBlockBar = ({');
  let part0 = parts1[0];
  let parts2 = parts1[1].split('  };\n\n  return (');
  let componentBody = '  const AddBlockBar = ({' + parts2[0] + '  };\n\n';
  let rest = '  return (' + parts2[1];
  
  // now prepend componentBody right before `export const VisualBlockEditor`
  let result = part0.replace('export const VisualBlockEditor', componentBody + 'export const VisualBlockEditor');
  result = result + rest;
  
  fs.writeFileSync('src/components/VisualBlockEditor.tsx', result);
  console.log("Moved");
} else {
  console.log("Not matched");
}
