# TeamFlow — Nista Estudio

Workspace de productividad para equipos creativos.

---

## Deploy en Vercel (paso a paso)

### 1. Subir el código a GitHub

1. Entrá a [github.com](https://github.com) y creá una cuenta si no tenés
2. Hacé click en **"New repository"**
3. Nombre: `teamflow` — dejalo en **Private** — click **"Create repository"**
4. En la página del repo vacío, elegí **"uploading an existing file"**
5. Arrastrá **todos los archivos y carpetas** de esta carpeta (incluyendo `src/` y `public/`)
6. Click **"Commit changes"**

### 2. Deployar en Vercel

1. Entrá a [vercel.com](https://vercel.com) y creá una cuenta (podés usar tu cuenta de GitHub directamente)
2. Click en **"Add New Project"**
3. Importá el repositorio `teamflow` que acabás de crear
4. Vercel detecta automáticamente que es un proyecto Vite/React
5. Dejá toda la configuración por defecto — click **"Deploy"**
6. En ~2 minutos te da una URL tipo `teamflow-nista.vercel.app`

### 3. Dominio personalizado (opcional)

Si querés una URL más prolija como `app.nistaestudio.com`:
1. En Vercel → Settings → Domains
2. Agregá tu dominio y seguí las instrucciones de DNS

---

## Usuarios

| Nombre | Email | Contraseña |
|--------|-------|------------|
| Franco | franco@nistaestudio.com | franco123 |
| Pablo  | pablo@nistaestudio.com  | pablo123  |
| Nico   | nico@nistaestudio.com   | nico123   |
| Lucho  | lucho@nistaestudio.com  | lucho123  |

> **Importante:** Cambiá las contraseñas en `src/App.jsx` antes de deployar si querés más seguridad.

---

## Desarrollo local (opcional)

Si querés correrlo en tu computadora antes de subir:

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)
