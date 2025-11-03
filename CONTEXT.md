# GitHub PR Watcher - Contexto del Proyecto

## Descripción General
Aplicación de escritorio desarrollada en **Electron + React + TypeScript** para visualizar y gestionar Pull Requests de GitHub de múltiples repositorios de forma centralizada.

## Stack Tecnológico
- **Electron** 28.0.0 - Framework de escritorio
- **React** 18.2.0 - Librería UI
- **TypeScript** 5.3.3 - Tipado estático
- **Vite** 5.0.8 - Build tool con HMR
- **Octokit** (@octokit/rest 20.0.2) - Cliente GitHub API
- **date-fns** 2.30.0 - Formato de fechas (locale español)

## Arquitectura del Proyecto

### Estructura de Archivos
```
github-pr-watcher/
├── electron/
│   ├── main.ts           # Proceso principal de Electron
│   └── preload.ts        # Bridge seguro (contextBridge)
├── src/
│   ├── components/
│   │   ├── App.tsx              # Componente raíz, gestiona estado global
│   │   ├── PullRequestList.tsx  # Lista con filtros y ordenamiento
│   │   ├── PullRequestItem.tsx  # Card individual de PR
│   │   └── *.css                # Estilos de componentes
│   ├── services/
│   │   └── github.ts     # Integración con GitHub API
│   ├── types/
│   │   └── index.ts      # Interfaces TypeScript
│   ├── electron.d.ts     # Definiciones de tipos para Electron API
│   └── main.tsx          # Entry point de React
├── config.json           # Configuración (token, refreshInterval)
├── repos.json            # Lista de repositorios a monitorear
├── users.json            # Lista de usuarios para asignación
└── package.json          # Dependencias y scripts
```

### Archivos de Configuración

Todos los archivos de configuración están organizados en la carpeta `/config/`:

#### config/config.json
```json
{
  "githubToken": "",
  "refreshInterval": 60
}
```
**Nota**: Token con autorización SAML para organización `masorange`

#### config/repos.json
```json
[
  {
    "owner": "masorange",
    "repo": "federacionesosp-orangefederationhub-application-typescript",
    "name": "orangeHub"
  },
  {
    "owner": "masorange",
    "repo": "federacionesosp-orangefederationhub-core-typescript",
    "name": "core"
  },
  {
    "owner": "masorange",
    "repo": "federacionesosp-orange12hub-application",
    "name": "orange12Hub"
  },
  {
    "owner": "masorange",
    "repo": "federacionesosp-orangefederationhub-ficha-orange-typescript",
    "name": "Ficha Orange"
  },
  {
    "owner": "masorange",
    "repo": "federacionesosp-orangefederationhub-pangea-orange-typescript",
    "name": "Pangea Orange"
  }
]
```

#### config/users.json
```json
[
  {
    "login": "danilopezmoya",
    "name": "Danilo López"
  }
]
```

## Funcionalidades Implementadas

### ✅ Visualización de PRs
- Lista de PRs de múltiples repositorios
- Información mostrada por PR:
  - Título y número
  - Autor
  - Estado (Open/Draft)
  - Rama origen → destino
  - Fecha de creación (formato español)
  - Asignados
  - Comentarios totales + comentarios en código
  - Nombre del repositorio (fondo azul #1f6feb, texto blanco)

### ✅ Búsqueda y Filtros
- **Búsqueda**: Por título, autor, repositorio o nombres de ramas
- **Filtros**:
  - Todos
  - Abiertas (excluye drafts)
  - Borradores
  - Sin asignar
- **Filtro de Repositorios**: Menú desplegable en header con checkboxes
- **Ordenamiento**:
  - Por fecha (más reciente primero)
  - Por título (alfabético)
  - Por repositorio (alfabético)
  - Toggle para invertir orden

### ✅ Gestión de Asignaciones
- Asignar/desasignar usuarios desde la interfaz
- Menú dropdown por PR con lista de usuarios
- Actualización automática en GitHub via API

### ✅ Interacciones
- Click en título de PR: Abre en navegador predeterminado (usando `shell.openExternal`)
- Auto-refresh cada 60 segundos (configurable)
- Botón de refresh manual

## Decisiones Técnicas Importantes

### 1. Conteo de Comentarios
**Problema**: La API `pulls.list()` no devuelve los campos `comments` y `review_comments`.

**Solución**:
```typescript
// En src/services/github.ts
const detailedPRs = await Promise.all(
  pullsData.map(async (pr) => {
    try {
      const { data: detailedPR } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: pr.number,
      });
      return {
        ...pr,
        comments: detailedPR.comments || 0,
        review_comments: detailedPR.review_comments || 0,
      };
    } catch (error) {
      return { ...pr, comments: 0, review_comments: 0 };
    }
  })
);
```
Se usa `pulls.get()` para cada PR individualmente para obtener los conteos exactos.

### 2. Enlaces Externos
Para evitar abrir PRs en ventanas de Electron sin autenticación:
```typescript
// electron/main.ts
ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
});

// src/components/PullRequestItem.tsx
const openInGitHub = () => {
  window.electronAPI.openExternal(pr.html_url);
};
```

### 3. DevTools
La línea de apertura automática está comentada en desarrollo:
```typescript
// electron/main.ts - línea 20
// mainWindow.webContents.openDevTools(); // Descomentala si necesitas la consola
```
**Atajo manual**: `Ctrl+Shift+I`

## Comandos Principales

### Desarrollo
```bash
npm run dev  # Inicia Vite + Electron en modo desarrollo
```

### Build
```bash
npm run build         # Build completo
npm run build:win     # Build para Windows
npm run build:linux   # Build para Linux
npm run build:mac     # Build para macOS
```

### Recompilar Electron
```bash
rm -rf dist && npx tsc --project tsconfig.node.json && npm run dev
```

## Problemas Resueltos

### 1. Autenticación SAML
- **Problema**: Token sin autorización para organización con SAML
- **Solución**: Autorizar token en configuración de SSO de GitHub

### 2. Estructura de Datos
- **Problema**: Campo `author` no existía en respuesta API, causaba errores
- **Solución**: Cambiar a `user.login` que es el campo correcto

### 3. Comentarios Mostrando NaN
- **Problema**: Valores `undefined` en comentarios
- **Solución**: Usar `|| 0` como fallback

### 4. Comentarios Mostrando 0 Incorrectamente
- **Problema**: `pulls.list()` no incluye conteos de comentarios
- **Solución**: Fetch individual con `pulls.get()` para cada PR

### 5. Visibilidad del Repositorio
- **Problema**: Nombre de repositorio difícil de leer
- **Solución**: CSS con fondo azul y texto blanco
```css
.pr-repo {
  color: #ffffff;
  background-color: #1f6feb;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}
```

### 6. Error "Por favor, configura tu token de GitHub"
- **Problema**: Archivos TypeScript de Electron no compilados
- **Causa**: `electron/main.ts` y `electron/preload.ts` no se compilaron a JavaScript
- **Solución**: Ejecutar `npx tsc --project tsconfig.node.json` antes de `npm run dev`
- **Prevención**: Modificado script `dev` para compilar automáticamente Electron

## Estado Actual
- ✅ Aplicación completamente funcional
- ✅ 15 PRs cargándose correctamente de 5 repositorios
- ✅ Comentarios mostrando formato: "💬 8 (3 en código)"
- ✅ Todos los enlaces abren en navegador predeterminado
- ✅ DevTools no se abre automáticamente
- ✅ Compilación automática de Electron en `npm run dev`

## Consideraciones de Rendimiento
- Actualmente se hacen N+1 llamadas a la API por refresh (1 para lista + N para detalles de cada PR)
- Para 15 PRs esto es manejable
- Si el número de PRs crece significativamente (>50), considerar:
  - Caché de comentarios
  - Paginación
  - Throttling de requests
  - Refresh parcial solo de PRs modificados

## Próximos Pasos Potenciales
- [ ] Notificaciones de escritorio para nuevas PRs
- [ ] Filtro por labels
- [ ] Estadísticas (tiempo promedio de review, etc.)
- [ ] Modo oscuro
- [ ] Configuración de usuarios y repos desde la UI
- [ ] Caché local para reducir llamadas API
- [ ] Soporte para GitHub Enterprise

## Notas de Desarrollo
- El proyecto usa `concurrently` para ejecutar Vite y Electron simultáneamente
- `wait-on` asegura que Vite esté listo antes de iniciar Electron
- HMR de Vite funciona perfectamente en desarrollo
- Los archivos JSON de configuración están en la raíz del proyecto
