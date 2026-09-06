const fs = require('fs');
let content = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');

// Add option to mobile select
const mobileSelectOption = `                <option value="info">Info. de Reuniones</option>
                {guidedEnrollments.length > 0 && <option value="academia">Academia</option>}`;
content = content.replace(
  /<option value="info">Info\. de Reuniones<\/option>/,
  mobileSelectOption
);

// Add button to desktop grid
const desktopGridClass = `          <div className={\`hidden lg:grid \${guidedEnrollments.length > 0 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full mb-10 gap-1\`}>`;
content = content.replace(
  /<div className="hidden lg:grid lg:grid-cols-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full mb-10 gap-1">/,
  desktopGridClass
);

const academiaDesktopButton = `            <button
              onClick={() => setActiveTab('info')}
              className={\`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer \${
                activeTab === 'info' 
                  ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'
              }\`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              Info
            </button>
            
            {guidedEnrollments.length > 0 && (
              <button
                onClick={() => setActiveTab('academia')}
                className={\`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer \${
                  activeTab === 'academia' 
                    ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                    : 'text-slate-500 hover:text-primary hover:bg-slate-50'
                }\`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                Academia
                {guidedEnrollments.some(e => (e.classUnlockRequests || []).length > 0) && (
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                )}
              </button>
            )}`;

content = content.replace(
  /<button\n              onClick=\{\(\) => setActiveTab\('info'\)\}\n              className=\{`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all uppercase cursor-pointer \$\{\n                activeTab === 'info' \n                  \? 'bg-amber-100 text-amber-950 border border-amber-200' \n                  : 'text-slate-500 hover:text-primary hover:bg-slate-50'\n              \}`\}\n            >\n              <MapPin className="w-4 h-4 shrink-0" \/>\n              Info\n            <\/button>/,
  academiaDesktopButton
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
