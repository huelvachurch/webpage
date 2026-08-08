import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { BookOpen, HelpCircle, Lightbulb, Quote, Info, CheckCircle2 } from 'lucide-react';

interface TheoryMarkdownProps {
  content: string;
}

// Helper to extract plain text string from React children nodes
function extractTextFromChildren(children: any): string {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && children.props && children.props.children) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
}

export const TheoryMarkdown: React.FC<TheoryMarkdownProps> = ({ content }) => {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      components={{
        // Custom Blockquote Renderer to distinguish Verses, Questions, Notes, and Quotes
        blockquote: ({ children }) => {
          const rawText = extractTextFromChildren(children).trim();
          const lower = rawText.toLowerCase();

          // 1. VERSÍCULO BÍBLICO (Bible Verse)
          // Matches: "Versículo:", "Versiculo:", "Cita Bíblica:", or starting with bible references
          const isVerse = lower.startsWith('versículo') || lower.startsWith('versiculo') || lower.startsWith('cita bíblica') || lower.startsWith('cita biblica');
          
          if (isVerse) {
            // Try to extract Reference (e.g., "Juan 3:16-17") and Verse Text
            // Common patterns:
            // "Versículo: Juan 3:16-17 \n 16 Porque de tal manera..."
            // "Versículo: Juan 3:16-17 - 16 Porque..."
            let reference = '';
            let verseBody = rawText;

            // Remove "Versículo:" prefix
            const cleanPrefix = rawText.replace(/^(versículo|versiculo|cita bíblica|cita biblica)\s*:?\s*/i, '');
            
            // Look for reference pattern or colon/dash separator
            const lines = cleanPrefix.split('\n').filter(l => l.trim().length > 0);
            if (lines.length >= 2) {
              reference = lines[0].replace(/^\*\*|\*\*$/g, '').trim();
              verseBody = lines.slice(1).join('\n').trim();
            } else {
              // Try split by first dash or colon if format is "Juan 3:16-17 - 16 Porque..."
              const match = cleanPrefix.match(/^(\*\*[^*]+\*\*|[A-Z1-3a-záéíóúñ\s]+\s+\d+:\d+(?:-\d+)?)\s*(?::|—|-)?\s*([\s\S]*)/i);
              if (match) {
                reference = match[1].replace(/^\*\*|\*\*$/g, '').trim();
                verseBody = match[2].trim();
              }
            }

            return (
              <div className="my-5 bg-gradient-to-br from-amber-50/90 to-amber-100/40 border border-amber-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-l-2xl" />
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs md:text-sm tracking-wide uppercase">
                    <div className="p-1.5 bg-amber-200/60 rounded-lg text-amber-800 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span>{reference || 'Pasaje Bíblico'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700/60 bg-amber-200/40 px-2 py-0.5 rounded-md">
                    Sagrada Escritura
                  </span>
                </div>
                <div className="text-amber-950 font-serif leading-relaxed text-xs md:text-sm italic pl-1">
                  {verseBody || cleanPrefix}
                </div>
              </div>
            );
          }

          // 2. PREGUNTA DE REFLEXIÓN / ESTUDIO (Question Card)
          // Matches: "Pregunta:", "PREGUNTA:", or starting with "?" / "¿"
          const isQuestion = lower.startsWith('pregunta') || lower.startsWith('?') || lower.startsWith('¿');

          if (isQuestion) {
            // Remove "Pregunta:" or "PREGUNTA:" or leading "?" / "¿" from output
            let questionText = rawText
              .replace(/^(pregunta)\s*:?\s*/i, '')
              .trim();

            return (
              <div className="my-5 bg-gradient-to-br from-sky-50/90 to-blue-50/50 border border-sky-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 rounded-l-2xl" />
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 text-sky-700 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100/70 px-2.5 py-0.5 rounded-md mb-2">
                      Pregunta de reflexión
                    </span>
                    <div className="text-sky-950 font-bold text-xs md:text-sm leading-relaxed">
                      {questionText}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 3. NOTA / CONSEJO / DATO CURIOSO (Note or Tip Card)
          const isNote = lower.startsWith('nota') || lower.startsWith('consejo') || lower.startsWith('dato curioso') || lower.startsWith('sugerencia') || lower.startsWith('💡');

          if (isNote) {
            let badgeTitle = 'Nota importante';
            if (lower.startsWith('consejo')) badgeTitle = 'Consejo práctico';
            else if (lower.startsWith('dato curioso')) badgeTitle = 'Dato curioso';
            else if (lower.startsWith('sugerencia')) badgeTitle = 'Sugerencia';

            const cleanNote = rawText.replace(/^(nota|consejo|dato curioso|sugerencia|💡)\s*:?\s*/i, '').trim();

            return (
              <div className="my-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl" />
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md mb-2">
                      {badgeTitle}
                    </span>
                    <div className="text-emerald-950 font-medium text-xs md:text-sm leading-relaxed">
                      {cleanNote}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 4. FRASE DESTACADA / CITA DE AUTOR (Author Quote)
          const isQuote = lower.startsWith('frase') || lower.startsWith('cita') || rawText.includes('—') || (rawText.includes('"') && rawText.includes('-'));

          if (isQuote) {
            let cleanQuote = rawText.replace(/^(frase|cita)\s*:?\s*/i, '').trim();
            let author = '';

            // Extract author if separated by "—" or " - "
            const dashIdx = cleanQuote.lastIndexOf('—') !== -1 ? cleanQuote.lastIndexOf('—') : cleanQuote.lastIndexOf(' - ');
            if (dashIdx !== -1) {
              author = cleanQuote.substring(dashIdx + 1).replace(/^—|-|\s*/g, '').trim();
              cleanQuote = cleanQuote.substring(0, dashIdx).trim();
            }

            return (
              <div className="my-6 bg-slate-900 text-slate-100 border-l-4 border-secondary rounded-r-2xl rounded-l-md p-5 shadow-md relative overflow-hidden">
                <div className="flex gap-3">
                  <Quote className="w-8 h-8 text-secondary/40 shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 font-serif italic text-xs md:text-sm leading-relaxed">
                      {cleanQuote}
                    </div>
                    {author && (
                      <div className="text-right mt-3 text-xs font-sans not-italic font-bold text-secondary uppercase tracking-wider">
                        — {author}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          // 5. DEFAULT BLOCKQUOTE (Standard Quote)
          return (
            <blockquote className="my-4 border-l-4 border-slate-300 pl-4 py-1.5 italic text-slate-700 bg-slate-100/50 rounded-r-xl text-xs md:text-sm">
              {children}
            </blockquote>
          );
        },

        // Custom Heading Renderers for clean typography hierarchy
        h1: ({ children }) => (
          <h1 className="text-xl md:text-2xl font-kenao text-primary mt-6 mb-3 pb-1 border-b border-slate-200">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg md:text-xl font-kenao text-primary mt-5 mb-2.5">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base md:text-lg font-bold text-primary mt-4 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full inline-block" />
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
            {children}
          </h4>
        ),

        // Custom Paragraph Renderer
        p: ({ children }) => (
          <p className="my-2.5 text-slate-700 leading-relaxed text-xs md:text-sm">
            {children}
          </p>
        ),

        // Custom Lists
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
        ),

        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-bold text-primary bg-primary/5 px-1 py-0.5 rounded">
            {children}
          </strong>
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
