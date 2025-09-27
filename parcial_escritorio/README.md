# Music Playlist Manager

## Temática Elegida

Esta aplicación se centra en la gestión de una **Playlist Musical Personal**, permitiendo a los usuarios organizar, agregar, editar y eliminar canciones de su colección musical favorita. La temática está inspirada en la personalización de experiencias musicales, donde cada usuario puede crear y mantener una biblioteca única de tracks con detalles como título, artista, álbum, género, duración, calificación y enlaces a URLs externas (por ejemplo, videos de YouTube). El enfoque es en una interfaz intuitiva y moderna que simula una aplicación de música profesional, con énfasis en la usabilidad para aficionados a la música que desean una herramienta simple pero potente para curar sus playlists.

## Decisiones de Diseño Tomadas

- **Arquitectura Híbrida (Web + Desktop)**: Se utilizó Electron para convertir una aplicación web (HTML, CSS, JavaScript) en una aplicación de escritorio nativa. Esto permite reutilizar código web mientras se aprovechan APIs nativas como el manejo de archivos y diálogos del sistema operativo, facilitando la portabilidad sin sacrificar la familiaridad de una app web.

- **Diseño Visual (UI/UX)**: 
  - Tema oscuro (dark mode) con gradientes y efectos de vidrio esmerilado (glassmorphism) para una estética moderna y atractiva, inspirada en aplicaciones como Spotify o Apple Music. Se definieron variables CSS personalizadas para colores, bordes y sombras, asegurando consistencia y facilidad de mantenimiento.
  - Layout responsivo con CSS Grid y Flexbox: En pantallas grandes, se divide en dos columnas (formulario y playlist); en móviles, se apila verticalmente para mejor accesibilidad.
  - Animaciones sutiles (fade-in, hover effects) y notificaciones toast para feedback inmediato al usuario, mejorando la experiencia interactiva sin sobrecargar el rendimiento.

- **Estructura de Datos**: 
  - Almacenamiento local en JSON para simplicidad y offline-first: `users.json` para autenticación, `session.json` para sesiones persistentes, y `playlist_songs_{userId}.json` para playlists por usuario. Esto evita dependencias externas como bases de datos, priorizando la privacidad y el rendimiento local.
  - CRUD completo con validaciones (e.g., formato de duración MM:SS) y escape de HTML para prevenir XSS.

- **Seguridad y Funcionalidad**: 
  - Autenticación básica con hashing implícito en JSON (en producción, se recomendaría bcrypt). Sesiones persistentes para reanudar uso sin relogin.
  - Manejo seguro de URLs externas vía Electron's shell para evitar riesgos de seguridad.
  - Exportación de playlists en JSON para interoperabilidad con otras herramientas.

Estas decisiones priorizaron simplicidad, rendimiento y escalabilidad, manteniendo el proyecto ligero (sin frameworks pesados como React) para un desarrollo rápido.

## Instrucciones para Ejecutar Ambas Aplicaciones

El proyecto incluye una **aplicación web embebida** (el núcleo HTML/CSS/JS) y su **versión de escritorio** vía Electron. Ambas se ejecutan desde el mismo código base.

### Requisitos Previos
- Node.js (versión 14 o superior) instalado.
- npm (incluido con Node.js).

### Instalación
1. Clona o descarga el proyecto en una carpeta (e.g., `music-playlist-manager`).
2. Abre una terminal en la raíz del proyecto.
3. Instala las dependencias:
   ```
   npm install
   ```
   Esto instalará Electron y Electron Builder.

### Ejecución de la Aplicación Web (Modo Desarrollo)
- La app web se puede probar directamente abriendo `src/index.html` en un navegador moderno (Chrome, Firefox).
- No requiere servidor; los archivos JSON se manejan localmente vía JavaScript (en producción, usa Electron para persistencia real).
- Usuario de prueba: `admin` / `admin`.

### Ejecución de la Aplicación de Escritorio (Electron)
1. En la terminal, ejecuta:
   ```
   npm start
   ```
   o
   ```
   npm run dev
   ```
   Esto lanza la app en modo desarrollo con ventana de 1200x800 píxeles.

2. Para build y distribución (genera ejecutables para Windows/Mac/Linux):
   ```
   npm run build
   ```
   o para solo distribución sin publicar:
   ```
   npm run dist
   ```
   - Los archivos se generan en la carpeta `dist/`.
   - Iconos personalizados en `assets/` (ajusta si es necesario).

- **Notas**: 
  - En modo dev, las DevTools se pueden activar manualmente (comentado en `main.js`).
  - La app guarda datos en `src/`; asegúrate de permisos de escritura.
  - Para múltiples usuarios, cada uno tiene su playlist separada.

### Pruebas
- Agrega canciones vía el formulario.
- Busca, edita, elimina y exporta playlists.
- Verifica el gráfico de géneros con Chart.js.

## Dificultades Encontradas y Soluciones Aplicadas

- **Dificultad: Persistencia de Datos en Entorno Desktop**: En web pura, el almacenamiento local (localStorage) es limitado y no soporta archivos JSON complejos fácilmente. Solución: Usar Electron's IPC (Inter-Process Communication) para leer/escribir archivos JSON desde el proceso principal (`main.js`), asegurando aislamiento de seguridad y persistencia offline. Se implementaron handlers como `read-json-file` y `write-json-file` con manejo de errores via try-catch.

- **Dificultad: Manejo de Sesiones y Autenticación Multi-Usuario**: Mantener sesiones activas sin recargar y separar playlists por usuario. Solución: Clase `AuthManager` con carga/guardado de `session.json` y nombres de archivos dinámicos (`playlist_songs_{userId}.json`). Usuarios por defecto se crean si el archivo está vacío, con validación en login.

- **Dificultad: Interfaz Responsiva y Visual en Electron**: Renderizado inconsistente en diferentes OS y tamaños de ventana. Solución: CSS con media queries para móviles, viewport meta en HTML, y configuración de BrowserWindow en Electron para resolución fija inicial. Efectos de backdrop-filter y shadows se probaron para compatibilidad cross-platform.

- **Dificultad: Seguridad en Apertura de URLs y Exportación**: Riesgo de enlaces maliciosos y diálogos de archivos. Solución: Validación de protocolos HTTP/HTTPS en `open-external-url` IPC, y uso de `dialog.showSaveDialog` para exportaciones seguras, con filtros por extensión (.json).

- **Dificultad: Gráfico Dinámico con Chart.js**: Actualización en tiempo real sin recargas. Solución: Destruir y recrear el canvas en `updateChart()` tras filtros/búsquedas, usando datos agregados por género para un pie chart responsive.

Estas soluciones mantuvieron el proyecto robusto, con logs de errores en consola para debugging.

## Explicación de las Funcionalidades Avanzadas Implementadas

- **Sistema de Autenticación y Sesiones Persistentes**: Login con usuarios en JSON, roles básicos (admin/user), y sesiones que se restauran al reiniciar la app. Funciona offline, guardando timestamp de login. Notificaciones toast informan éxito/error.

- **CRUD Avanzado para Playlists Personalizadas**: 
  - **Create**: Agrega canciones con validación (campos obligatorios, formato duración) y timestamp/ID único.
  - **Read**: Carga dinámica por usuario, con búsqueda en tiempo real por título/artista/género (filtro client-side eficiente).
  - **Update**: Modo edición inline en el formulario, con botón de cancelar.
  - **Delete**: Confirmación modal antes de eliminar, actualizando vistas inmediatamente.

- **Estadísticas y Visualización de Datos**: 
  - Contador total de canciones y duración acumulada (suma de MM:SS convertida a minutos).
  - Gráfico de pastel (Chart.js) que muestra distribución por género, actualizándose en vivo. Colores dinámicos y leyenda responsive.

- **Exportación e Integración Externa**: 
  - Exporta playlist completa a JSON vía diálogo nativo de Electron, con formato legible (indentado).
  - Apertura segura de URLs (e.g., YouTube) solo para protocolos válidos, integrando con el navegador del sistema.

- **Búsqueda y Filtrado Inteligente**: Input de búsqueda que filtra resultados en O(n) tiempo, mostrando estado vacío diferenciado (playlist vacía vs. no resultados). Escape de HTML previene inyecciones.

- **Notificaciones y UX Mejorada**: Sistema de toast personalizable (éxito/error) con animaciones CSS, posicionado fijo. Estados vacíos con iconos motivadores.

Estas funcionalidades hacen la app escalable, con potencial para extensiones como importación JSON o sincronización cloud, manteniendo un footprint bajo (~50KB minificado).
