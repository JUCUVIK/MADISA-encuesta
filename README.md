# 🎯 Pulso — Encuestas de Satisfacción

Aplicación completa de encuestas con backend Node.js + frontend HTML/CSS/JS vanilla.

## Requisitos
- Node.js 18+

## Instalación

```bash
npm install
node server.js
```

Abre http://localhost:3000

## Vistas
| Ruta | Descripción |
|------|-------------|
| `/admin` | Panel principal: crear y gestionar encuestas |
| `/survey/:id` | Formulario de encuesta para el usuario final |
| `/results/:id` | Dashboard con resultados y gráficas |

## API
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/surveys` | Listar encuestas |
| POST | `/api/surveys` | Crear encuesta |
| GET | `/api/surveys/:id` | Detalle de encuesta |
| POST | `/api/surveys/:id/responses` | Enviar respuestas |
| GET | `/api/surveys/:id/results` | Ver resultados |
| DELETE | `/api/surveys/:id` | Eliminar encuesta |

## Estructura
```
survey-app/
├── server.js          ← Backend Express
├── survey.db          ← Base de datos SQLite (se crea automáticamente)
├── frontend/
│   ├── index.html
│   ├── css/main.css
│   └── js/
│       ├── app.js     ← Bootstrap y rutas
│       ├── api.js     ← Cliente API
│       ├── router.js  ← SPA Router
│       └── pages/
│           ├── survey.js   ← Formulario de encuesta
│           ├── results.js  ← Dashboard
│           └── admin.js    ← Panel admin
```
