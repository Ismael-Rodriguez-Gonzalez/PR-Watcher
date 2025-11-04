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
│   ├── main.ts           # Proceso principal de Electron + IPC handlers
│   ├── main.js           # Compilado de main.ts
│   ├── preload.ts        # Bridge seguro (contextBridge)
│   └── preload.js        # Compilado de preload.ts
├── src/
│   ├── components/
│   │   ├── App.tsx              # Componente raíz, gestiona estado global
│   │   ├── App.css              # Estilos principales con tema oscuro
│   │   ├── PullRequestList.tsx  # Lista con filtros y ordenamiento
│   │   ├── PullRequestList.css  # Estilos de lista
│   │   ├── PullRequestItem.tsx  # Card individual de PR + Copy URL
│   │   ├── PullRequestItem.css  # Estilos de cards
│   │   ├── StatsModal.tsx       # Dashboard de estadísticas completo
│   │   └── StatsModal.css       # Estilos del modal y componentes
│   ├── services/
│   │   ├── github.ts            # Integración con GitHub API (dual loading)
│   │   └── statsService.ts      # Servicio de cálculo de métricas
│   ├── types/
│   │   └── index.ts      # Interfaces TypeScript
│   ├── electron.d.ts     # Definiciones de tipos para Electron API
│   └── main.tsx          # Entry point de React
├── config/
│   ├── config.json       # Configuración (token, refreshInterval)
│   ├── repos.json        # Lista de repositorios (9 repos con URLs y colores)
│   └── users.json        # Lista de usuarios para asignación (34 usuarios)
├── release/              # Build outputs (electron-builder)
├── tsconfig.json         # Config TypeScript para React
├── tsconfig.node.json    # Config TypeScript para Electron
├── vite.config.ts        # Config Vite + build settings
├── CONTEXT.md            # Este documento de contexto
├── REQUIREMENTS.md       # Especificaciones del proyecto
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
{
  "repos": [
    {
      "name": "Orange Hub",
      "url": "https://github.com/masorange/federacionesosp-orangefederationhub-application-typescript",
      "backgroundColor": "#cf7807"
    },
    {
      "name": "Core",
      "url": "https://github.com/masorange/federacionesosp-corefederationhub-application-typescript",
      "backgroundColor": "#0969da"
    },
    {
      "name": "Orange 12 Hub",
      "url": "https://github.com/masorange/federacionesosp-orange12federationhub-application-typescript",
      "backgroundColor": "#8250df"
    },
    {
      "name": "Ficha Orange",
      "url": "https://github.com/masorange/fichacliente-fdc-spa-typescript",
      "backgroundColor": "#d1242f"
    },
    {
      "name": "Pangea Orange",
      "url": "https://github.com/masorange/pangea-pdv-spa-typescript",
      "backgroundColor": "#1f883d"
    },
    {
      "name": "Shellstore Library",
      "url": "https://github.com/masorange/federacionesosp-shellstore-library-typescript",
      "backgroundColor": "#6f42c1"
    },
    {
      "name": "Jazztel Hub",
      "url": "https://github.com/masorange/federacionesosp-jzzmcfederationhub-application-typescript",
      "backgroundColor": "#d73a49"
    },
    {
      "name": "Ficha multi marca",
      "url": "https://github.com/masorange/fichaclientemmosp-fichaclientemm-spa-typescript",
      "backgroundColor": "#0550ae"
    },
    {
      "name": "Pangea Jzz",
      "url": "https://github.com/masorange/pangea-pdvjzz-spa-typescript",
      "backgroundColor": "#28a745"
    }
  ]
}
```

#### config/users.json
```json
{
  "users": [
    {
      "username": "Ismael-Rodriguez-Gonzalez",
      "name": "Ismael Rodriguez Gonzalez"
    },
    {
      "username": "JBARRGOM",
      "name": "Juan Antonio Barroso"
    },
    {
      "username": "HammamBoutafantMouhib",
      "name": "Hammam Boutafant Mouhib"
    },
    {
      "username": "JavierAparisiV",
      "name": "Francisco Javier Aparisi Valdés"
    },
    {
      "username": "rodorb",
      "name": "Rodolfo Rodriguez Bárcena"
    }
    // ... (34 usuarios totales)
  ]
}
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
  - Nombre del repositorio (fondo con color personalizable por repo)
  - Botón "Copy URL" para copiar enlace al portapapeles

### ✅ Búsqueda y Filtros
- **Búsqueda**: Por título, autor, repositorio o nombres de ramas
- **Filtros**:
  - Todos
  - Abiertas (excluye drafts)
  - Borradores
  - Sin asignar
- **Filtro de Repositorios**: Menú desplegable en header con checkboxes
- **Filtro Aditivo**: Persistencia de selección, UI optimizada con contadores
- **Ordenamiento**:
  - Por fecha (más reciente primero)
  - Por título (alfabético)
  - Por repositorio (alfabético)
  - Toggle para invertir orden

### ✅ Gestión de Asignaciones
- Asignar/desasignar usuarios desde la interfaz (34 usuarios configurados)
- Menú dropdown por PR con lista de usuarios
- Actualización automática en GitHub via API
- Actualización optimista de UI

### ✅ Dashboard de Estadísticas
**Componente**: `StatsModal.tsx` con navegación por pestañas y filtros temporales.

#### Pestañas del Dashboard:
1. **📊 Resumen**: Métricas generales del equipo
   - Total PRs, PRs Cerradas, PRs Mergeadas, PRs en Draft, PRs Pendientes
   - Tiempo promedio de review y merge
   - PRs antiguas (>30 días) y conflictos pendientes

2. **👥 Por Usuario**: Estadísticas individuales con tabla ordenable
   - PRs creadas, Reviews dadas, PRs asignadas
   - Tiempo promedio, PR más antigua
   - Ordenamiento por cualquier columna (ascendente/descendente)
   - Muestra todos los 34 usuarios

3. **🏪 Por Repo**: Métricas por repositorio
   - Total PRs, PRs Cerradas, PRs Mergeadas, PRs en Draft, PRs Pendientes
   - Visualización en tarjetas por repositorio
   - Extracción automática de owner/repo desde URLs de GitHub

#### Características Técnicas:
- **Carga Dual de Datos**:
  - `getAllPullRequests()`: Solo PRs abiertas para vista principal
  - `getAllPullRequestsForStats()`: Todas las PRs (abiertas, cerradas, mergeadas) para estadísticas precisas
- **Carga Real de Reviews**: Integración con `octokit.pulls.listReviews()` para datos reales
- **Sistema de Cache Inteligente**:
  - Cache en memoria con TTL de 5 minutos
  - Actualización manual con botón 🔄 Refresh
  - `StatsService.clearCache()` para limpiar cache
- **Filtros Temporales**: 7 días, 30 días, 3 meses, 6 meses
- **Optimización de API**: ~909 requests máximo (18% del rate limit de 5,000/hora)

#### Servicios:
- **StatsService** (`src/services/statsService.ts`):
  - `calculateOverviewStats()`: Métricas generales
  - `calculateUserStats()`: Estadísticas por usuario con reviews reales
  - `calculateRepoStats()`: Métricas por repositorio
  - Cache con clase `MetricsCache`
- **Interfaces TypeScript**: `OverviewStats`, `UserStats`, `RepoStats`, `TrendData`

### ✅ Interacciones
- Click en título de PR: Abre en navegador predeterminado (usando `shell.openExternal`)
- Auto-refresh cada 60 segundos (configurable) - solo para vista principal
- Botón de refresh manual para PRs principales
- Botón 🔄 Refresh específico para estadísticas (carga independiente)
- Acceso a Dashboard: Botón "📊 Estadísticas" en header principal

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

### 7. Dashboard de Estadísticas - Problemas Resueltos (Nov 2025)

#### 7.1 Iconos Duplicados en Pestañas
- **Problema**: Pestañas mostraban `📊 📊 Resumen` (icono duplicado)
- **Causa**: `label` incluía icono Y se mostraba `icon` por separado
- **Solución**: Eliminado icono del `label`, mantenido solo en `icon`

#### 7.2 Estadísticas Por Repo Mostrando 0s
- **Problema**: Todas las métricas por repositorio mostraban 0
- **Causa**: Match incorrecto entre `pr.base.repo.full_name` (GitHub API) y `${repo.owner}/${repo.name}` (config local)
- **Análisis**: Repositorios en config tienen URL completa, no `owner`/`name` separados
- **Solución**: Extracción con regex de owner/name desde URL:
```typescript
const urlMatch = repo.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
const [, owner, repoName] = urlMatch;
const fullName = `${owner}/${repoName}`;
```

#### 7.3 Reviews Dadas Mostrando 0
- **Problema**: Columna "Reviews Dadas" mostraba 0 para todos los usuarios
- **Causa**: PRs no incluían datos de reviews (endpoint separado en GitHub API)
- **Análisis**: Inicialmente se pensó que sería "costoso" cargar reviews
- **Realidad**: Solo 909 requests máximo (18% del rate limit) - perfectamente viable
- **Solución**: Implementada carga real de reviews en `getPullRequestsForStats()`:
```typescript
const { data: reviewsData } = await this.octokit!.pulls.listReviews({
  owner, repo: repoName, pull_number: pr.number
});
```

#### 7.4 Optimización de Performance
- **Problema**: Necesidad de controlar cuándo se actualizan las estadísticas
- **Solución**: Sistema de cache + refresh manual:
  - Cache en memoria con TTL de 5 minutos
  - Botón 🔄 Refresh específico para estadísticas
  - `StatsService.clearCache()` antes de recargar
  - Carga independiente de vista principal

## Estado Actual (Noviembre 2025)
- ✅ Aplicación completamente funcional con Dashboard de Estadísticas
- ✅ Monitoreo de 9 repositorios con colores personalizados
- ✅ Gestión de 34 usuarios para asignaciones
- ✅ Comentarios mostrando formato: "💬 8 (3 en código)"
- ✅ Todos los enlaces abren en navegador predeterminado
- ✅ DevTools no se abre automáticamente
- ✅ Compilación automática de Electron en `npm run dev`
- ✅ Dashboard de Estadísticas con datos reales de GitHub API
- ✅ Sistema de cache inteligente con refresh manual
- ✅ Carga dual: PRs abiertas (vista) + todas las PRs (estadísticas)
- ✅ Reviews reales cargadas desde GitHub API para métricas precisas
- ✅ Funcionalidad Copy URL para PRs
- ✅ Filtros aditivos con persistencia de selección
- ✅ UI optimizada con tema oscuro consistente

## Consideraciones de Rendimiento

### Vista Principal (PRs Abiertas)
- N+1 llamadas a la API por refresh (1 para lista + N para detalles de cada PR)
- Auto-refresh cada 60 segundos
- Para el volumen actual (~50-100 PRs) es manejable

### Dashboard de Estadísticas
- **Optimización Implementada**: Carga solo cuando se abre el modal
- **Refresh Manual**: Usuario controla cuándo actualizar (botón 🔄)
- **Cache Inteligente**: TTL de 5 minutos, evita recálculos innecesarios
- **Costo Real**: ~909 requests máximo (9 repos × 100 PRs + reviews)
- **Rate Limit**: 18% del límite de 5,000/hora - perfectamente viable
- **Separación de Concerns**: Estadísticas no afectan vista principal

### Si el volumen crece significativamente (>200 PRs):
- Considerar paginación en GitHub API
- Implementar refresh incremental (solo PRs modificadas)
- Cache persistente (localStorage/SQLite)
- Throttling de requests paralelos

## Próximos Pasos Potenciales
- [ ] **Pestaña Tendencias**: Gráficos temporales de actividad (eliminada temporalmente)
- [ ] **Notificaciones de escritorio**: Para nuevas PRs o cambios de estado
- [ ] **Filtro por labels**: Integración con labels de GitHub
- [ ] **Configuración desde UI**: Editor de repositorios y usuarios desde la aplicación
- [ ] **Métricas avanzadas**: Tiempo real de review, patrones de horarios, detección de PRs obsoletas
- [ ] **Exportación de datos**: CSV/JSON de estadísticas para reporting
- [ ] **Soporte para GitHub Enterprise**: Configuración de custom domains
- [ ] **Drill-down en estadísticas**: Click en métricas para ver PRs específicas
- [ ] **Alertas inteligentes**: Detección de PRs >30 días, conflictos pendientes
- [ ] **Dashboard personalizable**: Widgets arrastrables, métricas customizables

### Funcionalidades Completadas ✅
- [x] Dashboard de Estadísticas completo
- [x] Modo oscuro consistente
- [x] Cache inteligente para reducir llamadas API
- [x] Reviews reales desde GitHub API
- [x] Copy URL functionality
- [x] Filtros aditivos avanzados

## Notas de Desarrollo
- El proyecto usa `concurrently` para ejecutar Vite y Electron simultáneamente
- `wait-on` asegura que Vite esté listo antes de iniciar Electron
- HMR de Vite funciona perfectamente en desarrollo
- Los archivos JSON de configuración están en la carpeta `/config/`

## Sesión de Desarrollo Actual (Nov 3-4, 2025)

### Contexto de la Sesión
Esta conversación desarrolló completamente el **Dashboard de Estadísticas** desde cero, incluyendo:

1. **Infraestructura Base**: StatsModal, StatsService, interfaces TypeScript
2. **Dual Loading System**: Separación de datos para vista principal vs estadísticas
3. **Métricas Reales**: Integración con GitHub API para reviews auténticas
4. **UX Optimizada**: Cache inteligente, refresh manual, iconos limpios
5. **Resolución de Bugs**: Debugging de métricas en 0, iconos duplicados, matching de repositorios

### Evolución de Requerimientos
- **Inicio**: Métricas básicas estimadas
- **Iteración**: Petición de "solo números reales"
- **Optimización**: Análisis de costos de API y implementación de cache
- **Pulido**: Limpieza de UI, eliminación de pestaña Tendencias

### Lecciones Aprendidas
1. **No asumir costos de API**: Análisis real mostró viabilidad (18% del rate limit)
2. **Separación de responsabilidades**: Vista principal ≠ estadísticas
3. **Cache es clave**: Para UX fluida sin spam de API calls
4. **Debug incremental**: Logs temporales ayudaron a identificar root causes
5. **User feedback directo**: "no te inventes nada" llevó a mejor arquitectura

### Próxima Sesión
Para continuar el desarrollo:
1. Leer este CONTEXT.md completamente
2. Verificar que `npm run dev` funciona
3. Probar Dashboard de Estadísticas (botón 📊 Estadísticas)
4. Comprobar que reviews muestran números reales
5. Continuar con funcionalidades pendientes del roadmap
