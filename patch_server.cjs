const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const prompt = `Eres un asistente experto[\s\S]*?Solo devuelve el contenido formateado en Markdown, sin ningún texto adicional ni introducción al inicio ni al final.`;/;

const newPrompt = `const prompt = \`Eres un asistente experto en analizar material educativo teológico y pastoral para estructurarlo en clases teóricas.
Analiza el documento PDF adjunto. Identifica las secciones del contenido (sin alterar, resumir ni omitir el texto original, manteniendo fielmente el texto) y formatea el contenido en Markdown. IMPORTANTE: Para el texto normal, SOLO devuelve el contenido sin usar formatos Markdown como títulos (##) o negritas (**). Separa cada párrafo con una línea en blanco. Solo usa la sintaxis especial de bloques de cita que se detalla a continuación:

REGLA PARA ENUMERACIONES AISLADAS:
Si encuentras una enumeración aislada (por ejemplo "1. Jesús es la Luz" o "1. LA FE EN JESÚS") que no va seguida de un "2." o de otros elementos de la lista en esa sección, debes considerarla como un Subtítulo. En ese caso, aplica el formato Markdown de Subtítulo (usa el prefijo ## ).
Las listas enumeradas reales (1., 2., etc.) o con viñetas deben mantenerse como texto normal sin formato especial.

- Versículos Bíblicos (Citas de la Escritura): ponlos en un bloque de cita donde la primera línea lleve la referencia (ej. Juan 3:16-17) y las líneas siguientes el contenido del versículo. Ejemplo exacto:
> **Versículo: Juan 3:16-17**
> 16 Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito...

- Preguntas de reflexión o estudio: ponlas en bloques de cita especificados exactamente como:
> **Pregunta:** ¿Cómo podemos aplicar esta enseñanza en nuestra vida cotidiana?

- Comentarios adicionales, notas, consejos o datos curiosos: ponlos en bloques de cita especificados exactamente como:
> **Nota:** Recordar profundizar en este punto en la clase.
o
> **Consejo:** Medita en este pasaje antes de la reunión.
o
> **Dato curioso:** La palabra evangelio significa buena noticia.

- Frases destacadas o citas de autores (ej. C.S. Lewis, J.C. Ryle, Spurgeon, etc.): ponlas en bloques de cita especificados exactamente como:
> **Frase:** "La fe es el arte de aferrarse a las cosas que tu razón ha aceptado una vez..." — C.S. Lewis

Solo devuelve el contenido formateado en Markdown, sin ningún texto adicional ni introducción al inicio ni al final.\`;`;

if(regex.test(code)) {
  code = code.replace(regex, newPrompt);
  fs.writeFileSync('server.ts', code);
  console.log("Patched server.ts successfully");
} else {
  console.log("Could not find regex!");
}
