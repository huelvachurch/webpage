const markdown = `
### Introducción
Este es un texto normal.

> **Versículo: Juan 3:16-17**
> 16 Porque de tal manera amó Dios al mundo...
> 17 Porque no envió Dios...

Y aquí sigue el texto.

> **Pregunta:** ¿Qué piensas?

> **Nota:** Esto es importante.
`;

function parseMarkdownToBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let currentBlock = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    const match = line.match(/^> \*\*(Versículo|Pregunta|Nota|Consejo|Dato curioso|Sugerencia|Frase)(?::\s*(.*?))?\*\*\s*(.*)/i);
    
    if (match) {
      if (currentBlock && currentBlock.type === 'text') {
        currentBlock.content = currentBlock.content.trim();
        if (currentBlock.content) blocks.push(currentBlock);
      }
      
      let type = match[1].toLowerCase();
      if (type === 'dato curioso' || type === 'sugerencia' || type === 'consejo') {
         type = 'nota'; // map to 'nota' type but store the specific word in meta if needed
      }
      const meta = match[2] ? match[2].trim() : '';
      let inlineContent = match[3] ? match[3].trim() : '';
      if (inlineContent.startsWith('> ')) inlineContent = inlineContent.substring(2).trim();

      // If it's a quote, the meta is the author. "Frase"
      // Wait, the AI might do > **Frase:** "Quote" - Author. Let's see later.

      currentBlock = {
        type: match[1].toLowerCase(),
        meta: meta,
        content: inlineContent ? inlineContent + '\n' : ''
      };
    } else if (line.startsWith('> ') && currentBlock && currentBlock.type !== 'text') {
      currentBlock.content += line.substring(2) + '\n';
    } else if (line.trim() === '' && currentBlock && currentBlock.type !== 'text') {
      currentBlock.content = currentBlock.content.trim();
      blocks.push(currentBlock);
      currentBlock = null;
    } else {
      if (!currentBlock || currentBlock.type !== 'text') {
        if (currentBlock && currentBlock.type !== 'text') {
           currentBlock.content = currentBlock.content.trim();
           blocks.push(currentBlock);
        }
        currentBlock = {
          type: 'text',
          content: ''
        };
      }
      currentBlock.content += line + '\n';
    }
  }

  if (currentBlock) {
    currentBlock.content = currentBlock.content.trim();
    if (currentBlock.content || currentBlock.type !== 'text') {
      blocks.push(currentBlock);
    }
  }

  return blocks;
}

console.log(JSON.stringify(parseMarkdownToBlocks(markdown), null, 2));
