# Memoria Técnica del Proyecto: Sistema de Encuestas Madisa

Este documento explica de forma detallada cómo está estructurado y cómo funciona el sistema de encuestas de Madisa, sirviendo como guía para que cualquier desarrollador pueda entender el flujo, la arquitectura y realizar futuros mantenimientos o modificaciones.

---

## 1. Arquitectura General

El proyecto está diseñado bajo una arquitectura cliente-servidor clásica y dividida en dos grandes bloques:
- **Backend**: Construido con **Node.js** y **Express**. Se encarga de exponer una API RESTful y de gestionar la persistencia de datos.
- **Frontend**: Una Single Page Application (SPA) construida con **HTML, CSS (Vanilla) y JavaScript puro**, sin frameworks pesados como React o Vue.

Todo el proyecto sirve sus archivos estáticos (el frontend) desde el propio servidor Express, por lo que basta con arrancar un único proceso (`node server.js`) para tener toda la aplicación corriendo.

---

## 2. Base de Datos (Persistencia)

El sistema utiliza **SQLite** (a través de la librería `sql.js`) y guarda toda la información en un archivo local llamado `survey.db`.

### Capa de Acceso a Datos (DAO)
Toda la interacción con la base de datos está encapsulada en el objeto `DAO` dentro de `server.js`. Esto significa que las rutas de la API no ejecutan SQL directamente. 
> [!TIP]
> Si en el futuro el volumen de datos crece y se desea migrar a PostgreSQL o MySQL, bastará con reescribir los métodos del bloque `DAO` (como `createSurvey`, `getResults`, etc.) y el resto de la aplicación funcionará sin cambios.

### Tablas Principales
- **`surveys`**: Almacena las encuestas (`id`, `title`, `description`, `created_at`, `is_public`).
- **`questions`**: Almacena las preguntas de cada encuesta, vinculadas por `survey_id`. Los tipos de pregunta son `scale` (1 al 5) y `text` (texto libre).
- **`responses`**: Registra cada envío de un usuario. Contiene el `survey_id`, `submitted_at` y el `email` del usuario que contestó.
- **`answers`**: Almacena la respuesta específica a una pregunta. Vincula el `response_id`, el `question_id` y el `value` (el valor contestado).

---

## 3. Backend (API REST)

El backend expone varias rutas principales en `server.js` bajo el prefijo `/api`:

- `GET /api/surveys` y `GET /api/surveys/:id`: Obtener encuestas.
- `POST /api/surveys` y `PUT /api/surveys/:id`: Crear y editar encuestas.
- `DELETE /api/surveys/:id`: Eliminar encuestas y todos sus datos en cascada.
- `POST /api/surveys/:id/responses`: Enviar una respuesta (requiere el array de respuestas y el email).
- `GET /api/surveys/:id/results`: Devuelve los resultados. Tiene lógica condicional:
  - Si la encuesta es privada, y la petición no incluye confirmación de administrador (`?admin=true`), devuelve error 403.
  - Retorna datos agregados (medias y distribuciones para las escalas, listas para textos).
  - **Solo si es admin**, devuelve también el array `individual_responses` con cada correo y lo que contestó.
- `POST /api/admin/login`: Valida la contraseña de administrador contra la variable de entorno `ADMIN_PASSWORD`.

---

## 4. Frontend (SPA)

El frontend vive en la carpeta `/frontend` y se gestiona todo desde `index.html`. 

### Estructura de archivos
- **`css/main.css`**: Contiene todos los estilos. Usa variables de CSS en el `:root` para gestionar colores corporativos (`--blue`, `--accent`), fuentes y estandarización.
- **`js/api.js`**: Centraliza todas las llamadas `fetch` hacia el backend.
- **`js/app.js`**: Inicializa el sistema de enrutamiento (Router) y carga las distintas vistas según la URL.
- **`js/pages/`**: Contiene la lógica de cada "página" o vista.

### Vistas principales
1. **Portal del Usuario (`user-portal.js`)**: La página de inicio `/`. Muestra un listado de todas las encuestas disponibles.
2. **Encuesta (`survey.js`)**: Pantalla donde el usuario contesta. Requiere introducir el **email** primero, muestra una barra de progreso y manda los datos por API.
3. **Login Administrador (`login.js`)**: Pantalla para introducir la clave de admin. Guarda un flag en `sessionStorage` (`admin_auth = true`) si el login es exitoso.
4. **Panel Admin (`admin.js`)**: Muestra todas las encuestas permitiendo crear nuevas (con toggle público/privado), editar, ver resultados y borrar.
5. **Editor (`edit.js`)**: Similar a la creación, carga los datos de una encuesta para modificar su configuración, sus preguntas o si es pública.
6. **Resultados (`results.js`)**: Dashboard de métricas. 
   - Modifica el enlace de volver (hacia Admin o Portal) según quién esté logueado.
   - Las respuestas de texto se agrupan bajo un desplegable (`<details>`) para mantener limpia la interfaz.
   - Si el visor es admin, muestra una sección final de "Respuestas Individuales".

---

## 5. Flujos Clave de la Aplicación

### A. Flujo de Privacidad y Resultados
1. Cuando un admin crea una encuesta, decide si es "Pública". Esto guarda `is_public = 1` en la DB.
2. Si es pública, cualquier persona que acabe la encuesta verá un botón "Ver resultados". Si es privada, el botón no existe.
3. Si alguien intenta forzar la URL `/results/123` en una encuesta privada, el frontend llamará a la API, el backend detectará que `is_public = 0` y que no es admin, y devolverá un error. El frontend mostrará un mensaje de "No se pudieron cargar los resultados".

### B. Flujo de Respuestas Individuales
1. Al responder, el usuario mete su email en `survey.js`. Este se envía a la API.
2. La base de datos lo guarda en la tabla `responses`.
3. Al ver los resultados, la API comprueba si eres admin (`?admin=true`).
4. Si lo eres, consulta en la base de datos agrupando qué respondió cada persona y adjuntando su correo.
5. El frontend (`results.js`) detecta que el JSON devuelto contiene la propiedad `individual_responses` y pinta la sección detallada al final de la pantalla.

---

## 6. Siguientes Pasos (Mantenimiento)

- **Despliegue (Hosting):** 
  - La aplicación está preparada para ser desplegada en plataformas como **Railway**, **Render** o un VPS. 
  - El servidor lee el puerto dinámicamente (`process.env.PORT || 3000`) para ser compatible con la nube. 
  - Utiliza **Express 4.x** por su altísima estabilidad y soporte en todos los hostings. El SPA fallback está configurado correctamente con el middleware `app.use()` atrapalotodo.
  - **IMPORTANTE:** Como se usa SQLite (archivo local `survey.db`), si se sube a Railway o similares, es **obligatorio configurar un Volumen Persistente** (Persistent Volume) montado en la carpeta de la app (ej: `/app`) para evitar que la base de datos se borre con cada nuevo despliegue.
- **Cambio de BD:** Como se ha mencionado, la lógica está en el objeto `DAO`. Para implementar otra base de datos, no hay que tocar las rutas, solo la declaración de `DAO.getSurveyById`, `DAO.createResponse`, etc.
- **Estilos:** Toda modificación de colores, márgenes o botones debe realizarse editando las clases base (`.btn`, `.card`, etc.) en `main.css` para no romper la uniformidad del diseño.
