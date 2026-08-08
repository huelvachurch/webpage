const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/AdminCursos.tsx', 'utf8');

if (!code.includes('Toast Guardado con exito')) {
  const toastCode = `
      {/* Toast Guardado con exito */}
      <AnimatePresence>
        {showSaveToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-6 right-6 z-[200] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm"
          >
            <div className="bg-white/20 p-1.5 rounded-full">
              <Save className="w-4 h-4" />
            </div>
            Guardado correctamente
          </motion.div>
        )}
      </AnimatePresence>
`;
  code = code.replace(/<\/div>\s*<\/main>\s*<\/div>\s*\)\s*;\s*\}\s*$/m, toastCode + '\n    </div>\n  </main>\n</div>\n  );\n}\n');
  fs.writeFileSync('src/pages/admin/AdminCursos.tsx', code);
  console.log("Patched toast");
} else {
  console.log("Toast already there");
}
