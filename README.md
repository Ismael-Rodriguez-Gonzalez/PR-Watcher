# GitHub PR Watcher

Aplicación de escritorio Electron para visualizar y gestionar Pull Requests de múltiples repositorios de GitHub.

## Características

✅ **Visualización de PRs**
- Ver todas las PRs abiertas y drafts de múltiples repositorios
- Información detallada: autor, asignados, ramas, comentarios, fecha de creación

✅ **Gestión de Asignaciones**
- Asignar usuarios a PRs desde una lista configurada
- Eliminar asignaciones existentes

✅ **Filtros y Búsqueda**
- Filtrar por estado: Todas, Abiertas, Draft
- Búsqueda por título, autor o repositorio

✅ **Auto-actualización**
- Actualización automática de PRs según intervalo configurado

## Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Token de GitHub con permisos de lectura/escritura en repositorios

## Instalación

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar GitHub Token**

   **Opción A: Variables de Entorno (Recomendada)**
   ```bash
   # Copia el archivo de ejemplo
   cp .env.example .env

   # Edita .env y añade tu token
   GITHUB_TOKEN=tu_token_aqui
   REFRESH_INTERVAL=60
   ```

   **Opción B: Archivo de Configuración**
   ```bash
   cp config/config.example.json config/config.json
   ```

   Luego edita `config/config.json`:
   ```json
   {
     "githubToken": "tu_token_aqui",
     "refreshInterval": 60
   }
   ```

   **Generar Token GitHub:**
   - Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Genera un nuevo token con permisos: `repo` (todos los sub-permisos)

   **⚠️ IMPORTANTE - Organizaciones con SAML SSO:**
   Si tus repositorios pertenecen a una organización con SAML SSO (como `masorange`), debes **autorizar el token**:
   1. Después de crear el token, haz clic en **"Configure SSO"**
   2. Autoriza la organización correspondiente
   3. Ver guía completa en [SAML_SETUP.md](SAML_SETUP.md)

4. **Configurar Repositorios**

   El archivo `config/repos.json` ya contiene tus repositorios. Puedes añadir más:
   ```json
   {
     "repos": [
       {
         "url": "https://github.com/owner/repo",
         "name": "Nombre Personalizado"
       }
     ]
   }
   ```

5. **Configurar Usuarios para Asignar**

   Edita `config/users.json` con los usuarios de tu equipo:
   ```json
   {
     "users": [
       {
         "username": "github-username",
         "name": "Nombre Completo"
       }
     ]
   }
   ```

## Uso

### Modo Desarrollo

```bash
npm run dev
```

Esto iniciará:
- Servidor de desarrollo Vite en `http://localhost:5173`
- Aplicación Electron

### Construir para Producción

```bash
# Para Windows
npm run build:win

# Para macOS
npm run build:mac

# Para Linux
npm run build:linux
```

Los instaladores se generarán en la carpeta `release/`.

## Estructura del Proyecto

```
github-pr-watcher/
├── electron/              # Código de Electron (proceso principal)
│   ├── main.ts           # Ventana principal
│   └── preload.ts        # Script preload
├── src/                   # Código React
│   ├── components/       # Componentes de la UI
│   │   ├── App.tsx
│   │   ├── PullRequestList.tsx
│   │   └── PullRequestItem.tsx
│   ├── services/         # Servicios (GitHub API)
│   │   └── github.ts
│   ├── types/            # Definiciones TypeScript
│   │   └── index.ts
│   └── main.tsx          # Punto de entrada
├── config/               # Archivos de configuración
│   ├── config.json       # Configuración (token, intervalo) - No versionado
│   ├── config.example.json  # Ejemplo de configuración
│   ├── repos.json        # Repositorios a monitorear
│   └── users.json        # Usuarios del equipo
└── package.json
```

## Funcionalidades

### Visualización de PRs

La aplicación muestra para cada PR:
- **Título** (clickeable para abrir en GitHub)
- **Número de PR y repositorio**
- **Estado**: Badge "DRAFT" para PRs en draft
- **Autor**: Avatar y nombre de usuario
- **Ramas**: Rama origen → rama destino
- **Fecha**: Tiempo transcurrido desde creación
- **Comentarios**: Número de comentarios
- **Asignados**: Lista de usuarios asignados

### Asignar Usuarios

1. Click en el botón **"+ Asignar"** de cualquier PR
2. Selecciona un usuario del menú desplegable
3. El usuario se añade automáticamente a la PR en GitHub

### Eliminar Asignaciones

Click en la **"✕"** junto al nombre del usuario asignado

### Filtros

- **Todas**: Muestra todas las PRs (abiertas y draft)
- **Abiertas**: Solo PRs abiertas (no draft)
- **Draft**: Solo PRs en draft

### Búsqueda

Escribe en el campo de búsqueda para filtrar por:
- Título de la PR
- Nombre del autor
- Nombre del repositorio

## Solución de Problemas

### Error de autenticación
- Verifica que tu token de GitHub sea válido
- Asegúrate de que el token tenga permisos `repo`

### No se cargan las PRs
- Verifica que las URLs de los repositorios en `repos.json` sean correctas
- Comprueba que tengas acceso a esos repositorios

### Límites de rate de GitHub
- GitHub tiene límites de 5000 requests/hora con autenticación
- La aplicación usa cache y actualización eficiente para minimizar requests

## Tecnologías

- **Electron**: Framework para aplicaciones de escritorio
- **React**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool y dev server
- **Octokit**: Cliente oficial de GitHub API
- **date-fns**: Formateo de fechas

## Gestión de Configuración

### Variables de Entorno (Recomendado)

La aplicación soporta configuración via variables de entorno:

```bash
# Desarrollo local
GITHUB_TOKEN=tu_token_aqui npm run dev

# O usando archivo .env
echo "GITHUB_TOKEN=tu_token_aqui" > .env
npm run dev
```

### Compatibilidad con GitHub CLI

Si tienes GitHub CLI instalado, la aplicación automáticamente detectará el token:

```bash
# Si ya tienes gh configurado
gh auth login
npm run dev  # Usará automáticamente GH_TOKEN
```

### Despliegue en Diferentes Entornos

**Docker:**
```dockerfile
ENV GITHUB_TOKEN=tu_token_aqui
ENV REFRESH_INTERVAL=60
```

**Sistemas CI/CD:**
- Usar secrets del sistema (GitHub Actions, GitLab CI, etc.)
- No commitear tokens en el código

**Distribución de la App:**
- Variables de entorno del sistema
- Configuración via interfaz gráfica (futuro)

## Próximas Mejoras

- [ ] Ver detalles y diff del código de cada PR
- [ ] Añadir comentarios desde la aplicación
- [ ] Aprobar o solicitar cambios
- [ ] Notificaciones de escritorio
- [ ] Dashboard con métricas
- [ ] Modo offline con cache
- [ ] Configuración via interfaz gráfica

## Licencia

MIT
