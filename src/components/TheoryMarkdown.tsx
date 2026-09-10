import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { BookOpen, HelpCircle, Lightbulb, Quote, Info, CheckCircle2 } from 'lucide-react';

export interface HighlightItem {
  id: string;
  content: string;
  color?: string;
}

interface TheoryMarkdownProps {
  content: string;
  highlights?: HighlightItem[];
  onRemoveHighlight?: (id: string) => void;
  isHighlightMode?: boolean;
}

// Helper to escape regex characters
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

// Helper to render plain text strings with highlights wrapped in <mark> tags
function renderTextWithHighlights(
  text: string,
  highlights: HighlightItem[] = [],
  onRemoveHighlight?: (id: string) => void
): React.ReactNode {
  if (!text || !highlights || highlights.length === 0) return text;

  const valid = highlights
    .filter(h => h && h.content && h.content.trim().length >= 2)
    .sort((a, b) => b.content.trim().length - a.content.trim().length);

  if (valid.length === 0) return text;

  try {
    const escapedTerms = valid.map(h => escapeRegExp(h.content.trim()));
    const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    const parts = text.split(pattern);

    if (parts.length <= 1) return text;

    return parts.map((part, index) => {
      if (index % 2 === 0) {
        return part;
      }

      // Matched highlight segment
      const matchedHl = valid.find(h => {
        const cleanH = h.content.trim().toLowerCase();
        const cleanP = part.trim().toLowerCase();
        return cleanH === cleanP || cleanP.includes(cleanH) || cleanH.includes(cleanP);
      }) || valid[0];

      return (
        <mark
          key={`hl-${index}`}
          className="bg-amber-200/90 hover:bg-amber-300/90 text-slate-900 rounded-xs px-1 py-0.5 shadow-2xs font-medium transition-all inline relative group/hl selection:bg-amber-300"
          data-annotation-id={matchedHl?.id}
        >
          <span>{part}</span>
          {matchedHl && onRemoveHighlight && (
            <button
              type="button"
              className="inline-flex items-center justify-center ml-1 w-3.5 h-3.5 text-[11px] font-bold leading-none bg-slate-800 hover:bg-red-600 text-white rounded-full cursor-pointer select-none transition-transform hover:scale-125 align-middle shadow-xs"
              title="Eliminar este subrayado"
              aria-label="Eliminar este subrayado"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveHighlight(matchedHl.id);
              }}
            >
              ×
            </button>
          )}
        </mark>
      );
    });
  } catch (err) {
    console.error("Error highlighting text:", err);
    return text;
  }
}

// Recursive function to apply highlights to React nodes
function applyHighlightsToNodes(
  node: React.ReactNode,
  highlights: HighlightItem[] = [],
  onRemoveHighlight?: (id: string) => void
): React.ReactNode {
  if (!node || !highlights || highlights.length === 0) return node;

  if (typeof node === 'string') {
    return renderTextWithHighlights(node, highlights, onRemoveHighlight);
  }

  if (typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child, idx) => (
      <React.Fragment key={idx}>
        {applyHighlightsToNodes(child, highlights, onRemoveHighlight)}
      </React.Fragment>
    ));
  }

  if (React.isValidElement(node)) {
    if (node.type === 'mark') return node;

    const children = (node.props as any)?.children;
    if (children) {
      return React.cloneElement(
        node,
        node.props,
        applyHighlightsToNodes(children, highlights, onRemoveHighlight)
      );
    }
  }

  return node;
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

// Helper to sanitize markdown and remove accidental ## headers in enumerations or lists
function sanitizeMarkdownContent(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^(\s*\d+\.\s*)#{1,4}\s+/gm, '$1')
    .replace(/^(>|\s*[-*])\s*#{1,4}\s+/gm, '$1 ');
}

export const TheoryMarkdown: React.FC<TheoryMarkdownProps> = ({ 
  content, 
  highlights = [], 
  onRemoveHighlight,
  isHighlightMode = false
}) => {
  const processedContent = sanitizeMarkdownContent(content);

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw]}
      components={{
        // Custom Blockquote Renderer to distinguish Verses, Questions, Notes, and Quotes
        blockquote: ({ children }) => {
          const rawText = extractTextFromChildren(children).trim();
          const lower = rawText.toLowerCase();

          // 1. VERSÍCULO BÍBLICO (Bible Verse)
          const isVerse = lower.startsWith('versículo') || lower.startsWith('versiculo') || lower.startsWith('cita bíblica') || lower.startsWith('cita biblica');
          
          if (isVerse) {
            let reference = '';
            let verseBody = rawText;

            const cleanPrefix = rawText.replace(/^(versículo|versiculo|cita bíblica|cita biblica)\s*:?\s*/i, '');
            
            const lines = cleanPrefix.split('\n').filter(l => l.trim().length > 0);
            if (lines.length >= 2) {
              reference = lines[0].replace(/^\*\*|\*\*$/g, '').trim();
              verseBody = lines.slice(1).join('\n').trim();
            } else {
              const match = cleanPrefix.match(/^(\*\*[^*]+\*\*|[A-Z1-3a-záéíóúñ\s]+\s+\d+:\d+(?:-\d+)?)\s*(?::|—|-)?\s*([\s\S]*)/i);
              if (match) {
                reference = match[1].replace(/^\*\*|\*\*$/g, '').trim();
                verseBody = match[2].trim();
              }
            }

            return (
              <div className="my-5 bg-gradient-to-br from-amber-50/90 to-amber-100/40 border border-amber-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden group prose-scale-container">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 rounded-l-2xl" />
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold tracking-wide uppercase" style={{ fontSize: '0.85em' }}>
                    <div className="p-1.5 bg-amber-200/60 rounded-lg text-amber-800 shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span>{reference || 'Pasaje Bíblico'}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700/60 bg-amber-200/40 px-2 py-0.5 rounded-md">
                    Sagrada Escritura
                  </span>
                </div>
                <div className="text-slate-800 font-sans leading-relaxed pl-1" style={{ fontSize: '1em' }}>
                  {applyHighlightsToNodes(verseBody || cleanPrefix, highlights, onRemoveHighlight)}
                </div>
              </div>
            );
          }

          // 2. PREGUNTA DE REFLEXIÓN / ESTUDIO (Question Card)
          const isQuestion = lower.startsWith('pregunta') || lower.startsWith('?') || lower.startsWith('¿');

          if (isQuestion) {
            let questionText = rawText
              .replace(/^(pregunta)\s*:?\s*/i, '')
              .trim();

            return (
              <div className="my-5 bg-gradient-to-br from-sky-50/90 to-blue-50/50 border border-sky-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden prose-scale-container">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500 rounded-l-2xl" />
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-sky-100 text-sky-700 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-sky-800 bg-sky-100/70 px-2.5 py-0.5 rounded-md mb-2">
                      Pregunta de reflexión
                    </span>
                    <div className="text-slate-800 font-sans leading-relaxed" style={{ fontSize: '1em' }}>
                      {applyHighlightsToNodes(questionText, highlights, onRemoveHighlight)}
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
              <div className="my-5 bg-gradient-to-br from-emerald-50/90 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-4 md:p-5 shadow-xs relative overflow-hidden prose-scale-container">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-l-2xl" />
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-md mb-2">
                      {badgeTitle}
                    </span>
                    <div className="text-slate-800 font-sans leading-relaxed" style={{ fontSize: '1em' }}>
                      {applyHighlightsToNodes(cleanNote, highlights, onRemoveHighlight)}
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

            const dashIdx = cleanQuote.lastIndexOf('—') !== -1 ? cleanQuote.lastIndexOf('—') : cleanQuote.lastIndexOf(' - ');
            if (dashIdx !== -1) {
              author = cleanQuote.substring(dashIdx + 1).replace(/^—|-|\s*/g, '').trim();
              cleanQuote = cleanQuote.substring(0, dashIdx).trim();
            }

            return (
              <div className="my-6 bg-slate-900 text-slate-100 border-l-4 border-secondary rounded-r-2xl rounded-l-md p-5 shadow-md relative overflow-hidden prose-scale-container">
                <div className="flex gap-3">
                  <Quote className="w-8 h-8 text-secondary/40 shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 font-sans leading-relaxed" style={{ fontSize: '1em' }}>
                      {applyHighlightsToNodes(cleanQuote, highlights, onRemoveHighlight)}
                    </div>
                    {author && (
                      <div className="text-right mt-3 font-sans not-italic font-bold text-secondary uppercase tracking-wider" style={{ fontSize: '0.85em' }}>
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
            <blockquote className="my-4 border-l-4 border-slate-300 pl-4 py-1.5 italic text-slate-700 bg-slate-100/50 rounded-r-xl text-xs md:text-sm font-sans">
              {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
            </blockquote>
          );
        },

        // Custom Heading Renderers for clean typography hierarchy
        h1: ({ children }) => (
          <h1 className="text-xl md:text-2xl font-bold text-primary mt-6 mb-3 pb-1 border-b border-slate-200">
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg md:text-xl font-bold text-primary mt-5 mb-2.5">
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base md:text-lg font-bold text-primary mt-4 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full inline-block" />
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-bold text-slate-800 mt-3 mb-1.5">
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </h4>
        ),

        // Custom Paragraph Renderer
        p: ({ children }) => (
          <p className="my-2.5 text-slate-700 leading-relaxed text-xs md:text-sm font-sans">
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </p>
        ),

        // Custom Lists
        ul: ({ children }) => (
          <ul className="my-3 space-y-1.5 pl-6 list-disc text-xs md:text-sm text-slate-700 font-sans">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="my-3 space-y-1.5 pl-6 list-decimal text-xs md:text-sm text-slate-700 font-sans">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 text-xs md:text-sm text-slate-700 font-sans marker:text-secondary marker:font-bold">
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </li>
        ),

        // Strong/Bold
        strong: ({ children }) => (
          <strong className="font-bold text-slate-900">
            {applyHighlightsToNodes(children, highlights, onRemoveHighlight)}
          </strong>
        )
      }}
    >
      {processedContent}
    </ReactMarkdown>
  );
};

