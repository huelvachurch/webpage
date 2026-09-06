const fs = require('fs');
let content = fs.readFileSync('src/pages/MisCursos.tsx', 'utf-8');

content = content.replace(
  /import \{ GraduationCap, BookOpen, Clock, CheckCircle, AlertCircle, ChevronRight, Play, Layout, User, Calendar \} from 'lucide-react';/,
  "import { GraduationCap, BookOpen, Clock, CheckCircle, AlertCircle, ChevronRight, Play, Layout, User, Calendar, Download } from 'lucide-react';"
);

content = content.replace(
  /  requiresCellSupervision\?: boolean;\n\}/,
  "  requiresCellSupervision?: boolean;\n  diplomaPdfUrl?: string;\n}"
);

content = content.replace(
  /              <Link\n                to=\{\`\/cursos\/\$\{enrollment.courseId\}\`\}\n                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 px-4 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"\n              >\n                <span>Repasar Contenidos<\/span>\n                <ChevronRight className="w-4 h-4" \/>\n              <\/Link>/,
  `              {enrollment.course?.diplomaPdfUrl && (
                <a
                  href={enrollment.course.diplomaPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 px-4 rounded-2xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Diploma</span>
                </a>
              )}
              <Link
                to={\`/cursos/\${enrollment.courseId}\`}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-3 px-4 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all"
              >
                <span>Repasar Contenidos</span>
                <ChevronRight className="w-4 h-4" />
              </Link>`
);

fs.writeFileSync('src/pages/MisCursos.tsx', content);
