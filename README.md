# Gestor de URLs

Aplicación web simple (HTML + CSS + JavaScript puro, sin frameworks) para **agregar, editar, eliminar, buscar, copiar, exportar e importar URLs** (por ejemplo, enlaces de Dropbox como el de tu video).

## Funcionalidades
- 🎬 **Reproductor principal** rediseñado: barra de título superpuesta, controles circulares tipo reproductor de medios, indicador de progreso por puntos, botón de pantalla completa y toggle visual para el avance automático.
- ➕ Agregar URL con nombre, enlace, **tipo** (video / imagen / otro, detectado automáticamente por extensión) y categoría opcional.
- ✏️ Editar y 🗑️ eliminar cualquier URL guardada.
- 🔍 Buscar por nombre, URL o categoría, y **filtrar por tipo** (Todos / Videos / Imágenes / Otros) — el reproductor respeta el filtro activo.
- 🖼️🎬 **Vista previa** en la lista: miniatura de imagen, fotograma de video con ícono de reproducción, o ícono genérico.
- 👆 Haz clic en cualquier item de la lista para saltar a reproducirlo de inmediato.
- ⏮ ▶/⏸ ⏭ Controles de anterior / reproducir-pausar / siguiente, con avance automático opcional al terminar cada video o imagen.
- 🔗 **Obtener link del reproductor**: genera una URL que abre **solo el reproductor** (sin el formulario ni las herramientas de gestión) con tu playlist cargada — incluye una tira de miniaturas abajo para navegar. Ideal para enviarlo a alguien que solo quiere ver el contenido.
- 🔗 **Botón de compartir flotante sobre el video/imagen**: además del botón de arriba, hay un pequeño botón 🔗 en la esquina del reproductor mismo. Como vive dentro del recuadro que entra en pantalla completa, **sigue visible aunque estés viendo el reproductor en modo pantalla completa** (⛶). Un clic copia el link directamente al portapapeles (verás un ✅ de confirmación), sin salir de pantalla completa.
- 📋 Copiar el enlace al portapapeles con un clic.
- ⬇️⬆️ Exportar/Importar tus URLs como archivo `.json` (útil para respaldo).
- 💾 En la versión de 3 archivos (`index.html` + `style.css` + `script.js`), los datos se guardan en `localStorage` y persisten al recargar. La versión `demo.html` (un solo archivo) no persiste, solo sirve para pruebas rápidas — pero el link para compartir funciona igual en ambas.

### Modo "solo reproductor"
El link generado agrega `?view=player&playlist=...` a la URL. Cuando la página detecta `view=player`:
- Oculta el formulario de agregar/editar, la barra de búsqueda, los filtros y la lista de gestión.
- Muestra únicamente el reproductor, centrado y más grande, con una tira de miniaturas (filmstrip) debajo para navegar entre los elementos.
- Quien reciba el link **no puede editar ni eliminar nada** — solo ver y navegar la playlist.

### Cómo funciona el link para compartir
Al hacer clic en "Obtener link del reproductor", el sistema convierte tu lista de URLs a JSON, la codifica en Base64 y la agrega como parámetro `?playlist=...` a la URL de tu sitio, junto con `view=player`. Al abrir ese link, la página detecta los parámetros, decodifica la playlist y activa automáticamente el modo solo-reproductor.

**Importante:** esto significa que el link solo funciona de verdad una vez que el sitio esté desplegado en una URL pública (por ejemplo, en Vercel). Compartir el link de un `index.html` abierto localmente (`file:///...`) no funcionará para otra persona, porque no hay una URL pública detrás. Además, si tu playlist es muy larga, el link puede volverse demasiado largo para algunos navegadores; en ese caso, usa mejor "Exportar" y comparte el archivo `.json` junto con el sitio desplegado.

### Detección automática de tipo
Al pegar una URL, el sistema revisa la extensión del archivo (ignorando parámetros como `?dl=1`):
- **Video**: `.mp4 .webm .mov .mkv .avi .m4v .ogv`
- **Imagen**: `.jpg .jpeg .png .gif .webp .svg .bmp .avif`
- Cualquier otra extensión (o ninguna) se marca como **Otro**.

También puedes forzar el tipo manualmente desde el selector del formulario.

### Enlaces de Dropbox
Si el enlace es de Dropbox, el sistema ajusta automáticamente el parámetro `dl=1` para que la vista previa y el reproductor carguen el archivo directo en vez de la página de Dropbox.

## Probar localmente
Solo abre `index.html` en tu navegador, o levanta un servidor rápido:

```bash
npx serve .
```

## Desplegar en Vercel

### Opción 1: Vercel CLI
```bash
npm i -g vercel
cd url-manager
vercel
```
Sigue las instrucciones en pantalla (puedes aceptar todas las opciones por defecto, ya que es un sitio estático).

### Opción 2: Desde GitHub
1. Sube esta carpeta a un repositorio de GitHub.
2. Ve a https://vercel.com/new
3. Importa el repositorio.
4. Framework Preset: **Other** (sitio estático). No requiere build command ni output directory especiales.
5. Haz clic en **Deploy**.

## Ejemplo de uso con tu enlace de Dropbox
1. En el campo **Nombre**, escribe algo como `tv_Show video`.
2. En el campo **URL**, pega tu enlace, por ejemplo:
   `https://www.dropbox.com/scl/fi/4zbtcy2zdg1upztjvw9ty/tv_Sjow.mp4?rlkey=fz4swcg4iul7kqlq0jdt7rajk&st=15889gl1&dl=1`
3. (Opcional) En **Categoría**, escribe `videos`.
4. Haz clic en **Agregar URL**.

Repite el proceso para tus demás enlaces. Luego puedes editarlos o eliminarlos desde la lista.

## Nota sobre almacenamiento
Los datos se guardan en el navegador (localStorage), por lo que son **por dispositivo/navegador**. Si necesitas que las URLs sean compartidas entre varios usuarios o dispositivos (una base de datos real), lo siguiente sería agregar un backend (por ejemplo, Vercel KV, Supabase o Firebase). Puedo ayudarte a implementar esa versión si la necesitas.
