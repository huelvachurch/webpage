const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

// Interface Update
content = content.replace(
  /  completedSteps\?: string\[\];/,
  "  completedSteps?: string[];\n  isPaused?: boolean;\n  guideName?: string;"
);

// Block Access Logic
content = content.replace(
  /  const isAccessBlocked = \(isPendingEnrollment \|\| isPendingLeaderApproval\) && \!\(roles\?\.includes\('admin'\) \|\| roles\?\.includes\('profesor'\) \|\| roles\?\.includes\('superadmin'\)\);/,
  "  const isAccessBlocked = (isPendingEnrollment || isPendingLeaderApproval || enrollment.isPaused) && !(roles?.includes('admin') || roles?.includes('profesor') || roles?.includes('superadmin'));"
);

// Update Pending / Blocked UI Text
const replacementHtml = `          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              {isPendingEnrollment ? 'Solicitud de Inscripción Pendiente' : enrollment.isPaused ? 'Curso Pausado' : 'Asignación de Acompañante Pendiente'}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {isPendingEnrollment ? (
                <>Tu solicitud de inscripción para acceder a <strong className="text-primary">{course.title}</strong> ha sido enviada y está a la espera de ser aceptada por un administrador.</>
              ) : enrollment.isPaused ? (
                <>Tu curso <strong className="text-primary">{course.title}</strong> ha sido pausado temporalmente por tu acompañante o líder de célula.</>
              ) : (
                <>Tu solicitud para acceder a <strong className="text-primary">{course.title}</strong> está en espera de que el Liderazgo de tu Célula{enrollment.cellName ? \` (\${enrollment.cellName})\` : ''} te asigne un acompañante.</>
              )}
            </p>
            {!enrollment.isPaused && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 text-amber-900 text-xs leading-relaxed text-left">
                <strong>💡 ¿Qué sucede ahora?</strong>
                <p className="mt-1 text-amber-800">
                  {isPendingEnrollment ? (
                    <>Una vez que un administrador acepte tu inscripción, {course?.requiresCellSupervision ? 'se notificará a tu célula para la asignación de un acompañante.' : 'podrás ingresar al curso y comenzar a aprender.'}</>
                  ) : (
                    <>Una vez que se te asigne un acompañante por parte de tu célula, el botón cambiará automáticamente a <strong>"Ingresar"</strong> y podrás acceder a tus clases.</>
                  )}
                </p>
              </div>
            )}
          </div>`;

content = content.replace(
  /          <div>\n            <h2 className="text-2xl font-bold text-primary mb-2">\n              \{isPendingEnrollment \? 'Solicitud de Inscripción Pendiente' : 'Solicitud de Inicio Pendiente'\}\n            <\/h2>[\s\S]*?<\/div>\n          <\/div>/,
  replacementHtml
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
