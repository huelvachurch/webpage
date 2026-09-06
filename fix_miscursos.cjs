const fs = require('fs');
let content = fs.readFileSync('src/pages/MisCursos.tsx', 'utf-8');

// Update Interface
content = content.replace(
  /  leaderApproved\?: boolean;\n  course\?: Course;/,
  "  leaderApproved?: boolean;\n  isPaused?: boolean;\n  guideName?: string;\n  course?: Course;"
);

// Update logic
content = content.replace(
  /  const canAccess = \(enrollment.status === 'active' && !isPendingLeaderApproval\) \|\| enrollment.status === 'completed';/,
  "  const canAccess = (enrollment.status === 'active' && !isPendingLeaderApproval && !enrollment.isPaused) || enrollment.status === 'completed';"
);

// Update pending text
content = content.replace(
  /              \{isPendingLeaderApproval \? \(\n                <div className="w-full mt-3 flex items-center justify-center gap-2 bg-amber-50 text-amber-800 py-3\.5 px-4 rounded-2xl font-bold text-xs border border-amber-200">\n                  <Clock className="w-4 h-4 text-amber-600 shrink-0" \/>\n                  <span>Pendiente aceptación de supervisión<\/span>\n                <\/div>\n              \) : \(/,
  `              {isPendingLeaderApproval ? (
                <div className="w-full mt-3 flex items-center justify-center gap-2 bg-amber-50 text-amber-800 py-3.5 px-4 rounded-2xl font-bold text-xs border border-amber-200">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pendiente asignación de acompañante</span>
                </div>
              ) : enrollment.isPaused ? (
                <div className="w-full mt-3 flex items-center justify-center gap-2 bg-rose-50 text-rose-800 py-3.5 px-4 rounded-2xl font-bold text-xs border border-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Curso Pausado</span>
                </div>
              ) : (`
);

fs.writeFileSync('src/pages/MisCursos.tsx', content);
