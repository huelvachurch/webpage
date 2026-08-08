const fs = require('fs');
let code = fs.readFileSync('src/components/TheoryMarkdown.tsx', 'utf8');

const regexList = /\/\/ Custom Lists[\s\S]*?li: \({ children }\) => \([\s\S]*?<\/li>\s*\),/m;

const newLists = `// Custom Lists
        ul: ({ children }) => (
          <ul className="my-3 space-y-1.5 pl-6 list-disc text-xs md:text-sm text-slate-700">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 space-y-1.5 pl-6 list-decimal text-xs md:text-sm text-slate-700">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 text-xs md:text-sm text-slate-700 marker:text-secondary marker:font-bold">
            {children}
          </li>
        ),`;

if(regexList.test(code)) {
  code = code.replace(regexList, newLists);
  fs.writeFileSync('src/components/TheoryMarkdown.tsx', code);
  console.log("Patched TheoryMarkdown.tsx");
} else {
  console.log("Could not find regex!");
}
