# Huelva Church - Web Application

Esta aplicación está construida con React (Vite) y funciona como una SPA (Single Page Application) tradicional (Renderizado del lado del cliente o CSR). 

## Inyección Estática (SSR Básico) para Google for Nonprofits

Dado que los rastreadores web (crawlers) de Google for Nonprofits (y otros sistemas básicos) no siempre ejecutan JavaScript, el código fuente estático (`index.html`) originalmente devuelto por el servidor incluía únicamente un `<div id="root"></div>` vacío. Esto causaba problemas de verificación.

Para solucionar este problema de forma mantenible y sin agregar dependencias masivas o modificar la arquitectura a SSR completo (ej. Next.js), hemos implementado **Inyección Estática en Tiempo de Ejecución** directamente en nuestro servidor de Node (`server.ts`).

### ¿Cómo funciona?

1. En el archivo `server.ts`, interceptamos las rutas críticas para la verificación (`/`, `/nosotros`, y `/legal`).
2. Antes de devolver el archivo `index.html` al navegador o rastreador, utilizamos una operación de reemplazo de cadenas (string replacement) para inyectar contenido HTML estructurado dentro del `<div id="root"></div>`.
3. El rastreador de Google lee este HTML inmediatamente.
4. Cuando un usuario humano (con un navegador moderno) carga la página, el paquete de React se ejecuta (gracias a `createRoot`), sobrescribiendo este contenido inicial y montando la aplicación dinámica normalmente, sin crear conflictos.

### Cómo actualizar el contenido estático en el futuro

Si la información legal de la iglesia (CIF, número de registro, domicilio) cambia, o necesitas exponer nuevos textos a los rastreadores:

1. Abre el archivo `server.ts`.
2. Busca el bloque que comienza con el comentario: `// Render static fallbacks for Google for Nonprofits crawlers on essential pages`
3. Actualiza el contenido HTML dentro de las variables `prerenderHtml` para cada ruta específica.
4. Vuelve a ejecutar el proceso de compilación (build) y despliegue estándar (`npm run build`).

### Verificación de Google Search Console

La etiqueta meta requerida por Google Search Console está ubicada en `index.html`:

```html
<meta name="google-site-verification" content="TU_CODIGO_DE_VERIFICACION" />
```

Asegúrate de reemplazar `"TU_CODIGO_DE_VERIFICACION"` por tu código real.
