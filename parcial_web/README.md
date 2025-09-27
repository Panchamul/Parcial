# Playlist Musical Personal

## Temática Elegida

La temática elegida para este proyecto es una **Playlist Musical Personal**, una aplicación web que permite a los usuarios gestionar su colección de música de manera intuitiva y moderna. La aplicación ofrece una interfaz oscura y elegante inspirada en aplicaciones de música populares, permitiendo agregar, editar, eliminar y buscar canciones, además de visualizar estadísticas y exportar la playlist.

## Decisiones de Diseño Tomadas

### Arquitectura Técnica
- **Frontend puro**: HTML5, CSS3 y JavaScript ES6+ sin frameworks externos (excepto Chart.js para gráficos).
- **Almacenamiento local**: IndexedDB para persistencia de datos del lado del cliente, evitando la necesidad de un servidor backend.
- **Diseño responsivo**: Layout adaptable a dispositivos móviles y de escritorio usando CSS Grid y Flexbox.
- **Tema oscuro**: Interfaz con colores oscuros, gradientes y efectos de vidrio (glassmorphism) para una experiencia visual moderna.

### Estructura del Código
- **Clases modulares**: Separación de responsabilidades con clases `IndexedDBManager` y `MusicPlaylistManager`.
- **Operaciones CRUD**: Implementación completa de Create, Read, Update y Delete para las canciones.
- **Validación de formularios**: Validación del lado del cliente con expresiones regulares y mensajes de error.
- **Animaciones sutiles**: Transiciones CSS y animaciones de entrada para mejorar la UX.

### UX/UI Decisions
- **Interfaz intuitiva**: Formulario de agregar canciones con campos obligatorios y opcionales claramente diferenciados.
- **Búsqueda en tiempo real**: Filtrado instantáneo de la playlist según título, artista o género.
- **Estadísticas visuales**: Gráfico circular de distribución por géneros y contadores de canciones y duración total.
- **Notificaciones**: Sistema de notificaciones toast para feedback de acciones del usuario.

## Instrucciones para Ejecutar Ambas Aplicaciones

Este proyecto consta de una única aplicación web que funciona completamente del lado del cliente. Para ejecutarla:

1. **Requisitos previos**:
   - Un navegador web moderno que soporte IndexedDB (Chrome, Firefox, Safari, Edge).
   - Conexión a internet para cargar Chart.js desde CDN (opcional, puede funcionar offline una vez cargada).

2. **Ejecución**:
   - Abre el archivo `index.html` directamente en tu navegador web.
   - Alternativamente, puedes servir los archivos desde un servidor local:
     ```bash
     # Si tienes Python instalado
     python -m http.server 8000
     # Luego abre http://localhost:8000 en tu navegador
     ```

3. **Uso básico**:
   - Agrega canciones usando el formulario en el panel izquierdo.
   - Visualiza tu playlist en el panel derecho.
   - Usa la barra de búsqueda para filtrar canciones.
   - Haz clic en los botones de editar/eliminar para modificar canciones.
   - Exporta tu playlist como archivo JSON usando el botón "Exportar JSON".

## Dificultades Encontradas y Soluciones Aplicadas

### 1. Implementación de IndexedDB
**Dificultad**: IndexedDB tiene una API asíncrona compleja basada en eventos, diferente a las bases de datos SQL tradicionales.
**Solución**: Encapsulé toda la lógica de IndexedDB en una clase `IndexedDBManager` que abstrae las operaciones CRUD, convirtiendo las llamadas a promesas para un código más legible y mantenible.

### 2. Diseño Responsivo
**Dificultad**: Crear un layout que funcione bien tanto en móviles como en desktop, especialmente con el gráfico y la lista de canciones.
**Solución**: Utilicé CSS Grid para el layout principal y media queries para adaptar el diseño. El gráfico se oculta en móviles para priorizar la funcionalidad sobre la visualización.

### 3. Validación de Formularios
**Dificultad**: Validar formatos específicos como la duración de canciones (MM:SS) y asegurar que los campos obligatorios estén completos.
**Solución**: Implementé validación personalizada con expresiones regulares y mensajes de error específicos, complementando la validación HTML5 nativa.

### 4. Integración de Gráficos
**Dificultad**: Integrar Chart.js para mostrar estadísticas de géneros sin afectar el rendimiento.
**Solución**: Actualicé el gráfico solo cuando cambian los datos, destruyendo instancias previas para evitar memory leaks.

### 5. Persistencia de Datos
**Dificultad**: Asegurar que los datos se mantengan entre sesiones del navegador.
**Solución**: IndexedDB proporciona persistencia automática, pero implementé manejo de errores robusto para casos donde IndexedDB no esté disponible.

## Explicación de las Funcionalidades Avanzadas Implementadas

### 1. Sistema CRUD Completo con IndexedDB
- **Create**: Agregar nuevas canciones con ID único generado por timestamp.
- **Read**: Cargar todas las canciones al iniciar la aplicación y después de cada operación.
- **Update**: Editar canciones existentes manteniendo el mismo ID.
- **Delete**: Eliminar canciones con confirmación del usuario.
- **Ventaja**: Persistencia local sin necesidad de servidor, funciona offline.

### 2. Búsqueda y Filtrado en Tiempo Real
- Filtrado por título, artista o género con entrada de texto.
- Actualización instantánea de la lista y estadísticas.
- **Ventaja**: Permite navegar rápidamente en playlists grandes.

### 3. Visualización de Estadísticas
- Contador total de canciones y duración acumulada.
- Gráfico circular interactivo mostrando distribución por géneros.
- **Ventaja**: Proporciona insights sobre la colección musical del usuario.

### 4. Exportación de Datos
- Exportar la playlist completa como archivo JSON.
- Descarga automática del archivo.
- **Ventaja**: Permite backup, compartir o importar en otras aplicaciones.

### 5. Interfaz de Usuario Moderna
- Tema oscuro con efectos de vidrio y gradientes.
- Animaciones sutiles para transiciones y entradas.
- Diseño responsivo que se adapta a diferentes tamaños de pantalla.
- **Ventaja**: Experiencia visual atractiva y profesional.

### 6. Validación y Manejo de Errores
- Validación de formularios con feedback visual.
- Notificaciones toast para acciones exitosas y errores.
- Manejo de errores en operaciones de base de datos.
- **Ventaja**: Previene datos corruptos y mejora la robustez de la aplicación.

Esta aplicación demuestra el uso avanzado de tecnologías web modernas para crear una herramienta útil y atractiva para la gestión de música personal.
