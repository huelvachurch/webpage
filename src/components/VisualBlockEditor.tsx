import React, { useState, useEffect, useRef } from "react";
import {
  EditorProvider,
  Editor as WysiwygEditor,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnNumberedList,
  BtnBulletList,
  BtnLink,
  BtnClearFormatting,
  createDropdown,
  Separator,
  BtnUndo,
  BtnRedo
} from "react-simple-wysiwyg";

const BtnStylesCustom = createDropdown('Estilos', [
    ['Normal', 'formatBlock', 'DIV'],
    ['Título', 'formatBlock', 'H1'],
    ['Subtítulo', 'formatBlock', 'H2'],
    ['Código', 'formatBlock', 'PRE'],
]);

const CustomEditor = (props: any) => {
  return (
    <EditorProvider>
      <WysiwygEditor {...props}>
        <Toolbar>
          <BtnUndo />
          <BtnRedo />
          <Separator />
          <BtnBold />
          <BtnItalic />
          <BtnUnderline />
          <BtnStrikeThrough />
          <Separator />
          <BtnNumberedList />
          <BtnBulletList />
          <Separator />
          <BtnLink />
          <BtnClearFormatting />
          <Separator />
          <BtnStylesCustom />
        </Toolbar>
      </WysiwygEditor>
    </EditorProvider>
  );
};

import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Quote,
} from "lucide-react";

interface VisualBlockEditorProps {
  content: string;
  onChange: (content: string) => void;
}

type BlockType = "text" | "versículo" | "pregunta" | "nota" | "frase";

interface Block {
  id: string;
  type: BlockType;
  meta: string;
  content: string;
}

const AddBlockBar = ({
  targetIndex,
  isTop = false,
  onAdd,
}: {
  targetIndex: number;
  isTop?: boolean;
  onAdd: (type: BlockType, index: number) => void;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleAdd = (type: BlockType) => {
    onAdd(type, targetIndex);
    setIsOpen(false);
  };

  return (
    <div
      className={`flex items-center justify-center py-4 group/addbar ${isTop ? "opacity-100 mb-2" : "opacity-40 hover:opacity-100 focus-within:opacity-100 transition-opacity absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 mt-3 z-20" + (isOpen ? " opacity-100" : "")}`}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-full flex items-center p-1 overflow-hidden transition-all duration-300">
        <div
          onClick={() => setIsOpen(!isOpen)}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${isOpen ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover/addbar:bg-primary group-hover/addbar:text-white"}`}
        >
          <Plus className="w-4 h-4" />
        </div>

        <div
          className={`flex items-center gap-0.5 overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? "max-w-[400px] opacity-100 pl-1" : "max-w-0 opacity-0 group-hover/addbar:max-w-[400px] group-hover/addbar:opacity-100 group-hover/addbar:pl-1"}`}
        >
          <button
            onClick={() => handleAdd("text")}
            className="px-2.5 py-1.5 hover:bg-slate-100 rounded-md text-slate-600 title='Texto' cursor-pointer text-[11px] flex items-center font-bold whitespace-nowrap"
          >
            Texto Normal
          </button>
          <button
            onClick={() => handleAdd("versículo")}
            className="px-2.5 py-1.5 hover:bg-amber-100 rounded-md text-amber-700 title='Versículo' cursor-pointer text-[11px] flex items-center font-bold whitespace-nowrap"
          >
            Versículo
          </button>
          <button
            onClick={() => handleAdd("pregunta")}
            className="px-2.5 py-1.5 hover:bg-sky-100 rounded-md text-sky-700 title='Pregunta' cursor-pointer text-[11px] flex items-center font-bold whitespace-nowrap"
          >
            Pregunta
          </button>
          <button
            onClick={() => handleAdd("nota")}
            className="px-2.5 py-1.5 hover:bg-emerald-100 rounded-md text-emerald-700 title='Nota' cursor-pointer text-[11px] flex items-center font-bold whitespace-nowrap"
          >
            Nota
          </button>
          <button
            onClick={() => handleAdd("frase")}
            className="px-2.5 py-1.5 hover:bg-purple-100 rounded-md text-purple-700 title='Frase' cursor-pointer text-[11px] flex items-center font-bold whitespace-nowrap"
          >
            Frase
          </button>
        </div>
      </div>
    </div>
  );
};
export const VisualBlockEditor: React.FC<VisualBlockEditorProps> = ({
  content,
  onChange,
}) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const lastParsedContent = useRef(content);

  // Parse markdown or BLOCKS_JSON into blocks on mount
  useEffect(() => {
    if (content === lastParsedContent.current) return;
    lastParsedContent.current = content;

    if (!content) {
      setBlocks([]);
      return;
    }

    // 1. Check if BLOCKS_JSON comment exists for exact block recovery
    const jsonMatch = content.match(/<!-- BLOCKS_JSON:([\s\S]*?)-->/);
    if (jsonMatch) {
      try {
        const parsedBlocks = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsedBlocks)) {
          setBlocks(parsedBlocks);
          return;
        }
      } catch (e) {
        console.error("Error parsing BLOCKS_JSON payload:", e);
      }
    }

    // 2. Fallback: Parse markdown lines into blocks for legacy or external content
    const lines = (content || "").split("\n");
    const newBlocks: Block[] = [];
    let currentBlock: any = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const match = line.match(
        /^> \*\*(Versículo|Pregunta|Nota|Consejo|Dato curioso|Sugerencia|Frase)(?::\s*(.*?))?\*\*\s*(.*)/i,
      );

      if (match) {
        if (currentBlock && currentBlock.type === "text") {
          currentBlock.content = currentBlock.content.trim();
          if (currentBlock.content) newBlocks.push(currentBlock);
        }

        let type = match[1].toLowerCase();
        if (
          type === "dato curioso" ||
          type === "sugerencia" ||
          type === "consejo"
        ) {
          type = "nota";
        }
        const meta = match[2] ? match[2].trim() : "";
        let inlineContent = match[3] ? match[3].trim() : "";
        if (inlineContent.startsWith("> "))
          inlineContent = inlineContent.substring(2).trim();

        currentBlock = {
          id: Math.random().toString(36).substring(7),
          type: type as BlockType,
          meta: meta,
          content: inlineContent ? inlineContent + "\n" : "",
        };
      } else if (
        line.startsWith("> ") &&
        currentBlock &&
        currentBlock.type !== "text"
      ) {
        currentBlock.content += line.substring(2) + "\n";
      } else if (
        line.trim() === "" &&
        currentBlock &&
        currentBlock.type !== "text"
      ) {
        currentBlock.content = currentBlock.content.trim();
        newBlocks.push(currentBlock);
        currentBlock = null;
      } else if (
        line.trim() === "" &&
        currentBlock &&
        currentBlock.type === "text"
      ) {
        let isNextList = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine !== "") {
            if (/^(?:[-*]|\d+\.)\s/.test(nextLine)) {
              isNextList = true;
            }
            break;
          }
        }
        if (isNextList) {
          currentBlock.content += line + "\n";
        } else {
          currentBlock.content = currentBlock.content.trim();
          if (currentBlock.content) newBlocks.push(currentBlock);
          currentBlock = null;
        }
      } else {
        if (
          line.trim() === "" &&
          (!currentBlock || currentBlock.type !== "text")
        ) {
          continue;
        }
        if (!currentBlock || currentBlock.type !== "text") {
          if (currentBlock && currentBlock.type !== "text") {
            currentBlock.content = currentBlock.content.trim();
            newBlocks.push(currentBlock);
          }
          currentBlock = {
            id: Math.random().toString(36).substring(7),
            type: "text",
            meta: "",
            content: "",
          };
        }
        currentBlock.content += line + "\n";
      }
    }

    if (currentBlock) {
      currentBlock.content = currentBlock.content.trim();
      if (currentBlock.content || currentBlock.type !== "text") {
        newBlocks.push(currentBlock);
      }
    }

    setBlocks(newBlocks);
  }, [content]);

  const triggerChange = (updatedBlocks: Block[]) => {
    const markdown = updatedBlocks
      .map((b) => {
        if (b.type === "text") return b.content;

        const lines = b.content
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n");
        let header = `> **${b.type.charAt(0).toUpperCase() + b.type.slice(1)}**`;

        if (b.type === "versículo" && b.meta) {
          header = `> **Versículo: ${b.meta}**`;
        } else if (b.type === "nota" && b.meta) {
          header = `> **${b.meta.charAt(0).toUpperCase() + b.meta.slice(1)}:**`;
        } else if (b.type === "frase") {
          header = `> **Frase:**`;
        } else {
          header = `> **${b.type.charAt(0).toUpperCase() + b.type.slice(1)}:**`;
        }

        return `${header}\n${lines}`;
      })
      .join("\n\n");

    const fullPayload = `${markdown}\n\n<!-- BLOCKS_JSON:${JSON.stringify(updatedBlocks)} -->`;

    onChange(fullPayload);
    lastParsedContent.current = fullPayload;
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    setBlocks(newBlocks);
    triggerChange(newBlocks);
  };

  const removeBlock = (index: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index, 1);

    setBlocks(newBlocks);
    triggerChange(newBlocks);
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
    triggerChange(newBlocks);
  };

  const addBlock = (type: BlockType, index: number) => {
    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, {
      id: Math.random().toString(36).substring(7),
      type,
      meta: type === "nota" ? "Nota" : "",
      content: "",
    });
    setBlocks(newBlocks);
    triggerChange(newBlocks);
  };

  return (
    <div className="space-y-6 relative pb-10">
      {blocks.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
          <p className="text-sm text-slate-500 mb-4">
            La clase está vacía. Comienza añadiendo un bloque de contenido.
          </p>
          {<AddBlockBar targetIndex={-1} isTop={true} onAdd={addBlock} />}
        </div>
      ) : (
        <AddBlockBar targetIndex={-1} isTop={true} onAdd={addBlock} />
      )}
      {blocks.map((block, index) => (
        <div key={block.id} className="relative group">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-secondary/50 transition-all">
            {/* Editor Header / Controls */}
            <div className="bg-slate-50 border-b border-slate-100 px-3 py-2 flex items-center justify-between opacity-50 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  {block.type === "text" && <>Texto Normal</>}
                  {block.type === "versículo" && (
                    <>
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />{" "}
                      Versículo Bíblico
                    </>
                  )}
                  {block.type === "pregunta" && (
                    <>
                      <HelpCircle className="w-3.5 h-3.5 text-sky-600" />{" "}
                      Pregunta de Reflexión
                    </>
                  )}
                  {block.type === "nota" && (
                    <>
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />{" "}
                      Nota / Consejo
                    </>
                  )}
                  {block.type === "frase" && (
                    <>
                      <Quote className="w-3.5 h-3.5 text-purple-600" /> Frase o
                      Cita
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveBlock(index, "up")}
                  disabled={index === 0}
                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveBlock(index, "down")}
                  disabled={index === blocks.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeBlock(index)}
                  className="p-1 text-red-400 hover:text-red-600 ml-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Block Content Editor */}
            <div className="p-0">
              {block.type === "text" && (
                <CustomEditor
                  value={block.content}
                  onChange={(e) =>
                    updateBlock(index, { content: e.target.value })
                  }
                  className="min-h-[120px] bg-white text-sm"
                />
              )}

              {block.type === "versículo" && (
                <div className="p-4 bg-amber-50/30 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1 block">
                      Referencia (Ej: Juan 3:16)
                    </label>
                    <input
                      type="text"
                      value={block.meta}
                      onChange={(e) =>
                        updateBlock(index, { meta: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                      placeholder="Libro Capítulo:Versículo"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1 block">
                      Texto del Versículo
                    </label>
                    <textarea
                      rows={3}
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(index, { content: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white resize-none"
                      placeholder="Escribe el pasaje..."
                    />
                  </div>
                </div>
              )}

              {block.type === "pregunta" && (
                <div className="p-4 bg-sky-50/30">
                  <label className="text-[10px] font-bold text-sky-800 uppercase tracking-wider mb-1 block">
                    Pregunta
                  </label>
                  <textarea
                    rows={2}
                    value={block.content}
                    onChange={(e) =>
                      updateBlock(index, { content: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-sky-200 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none bg-white resize-none"
                    placeholder="¿Qué nos enseña esto sobre...?"
                  />
                </div>
              )}

              {block.type === "nota" && (
                <div className="p-4 bg-emerald-50/30 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 block">
                      Tipo de Nota
                    </label>
                    <select
                      value={block.meta || "Nota"}
                      onChange={(e) =>
                        updateBlock(index, { meta: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white cursor-pointer"
                    >
                      <option value="Nota">Nota Importante</option>
                      <option value="Consejo">Consejo Práctico</option>
                      <option value="Dato Curioso">Dato Curioso</option>
                      <option value="Sugerencia">Sugerencia</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1 block">
                      Contenido
                    </label>
                    <textarea
                      rows={2}
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(index, { content: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white resize-none"
                      placeholder="Escribe aquí el comentario..."
                    />
                  </div>
                </div>
              )}

              {block.type === "frase" && (
                <div className="p-4 bg-purple-50/30 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider mb-1 block">
                      Frase o Cita
                    </label>
                    <textarea
                      rows={2}
                      value={block.content}
                      onChange={(e) =>
                        updateBlock(index, { content: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white resize-none"
                      placeholder='"La fe es el arte de aferrarse..."'
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider mb-1 block">
                      Autor (Se añade en el texto)
                    </label>
                    <p className="text-[10px] text-slate-500 italic">
                      Agrega "— Nombre del Autor" al final del texto arriba.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {<AddBlockBar targetIndex={index} onAdd={addBlock} />}
        </div>
      ))}
    </div>
  );
};
