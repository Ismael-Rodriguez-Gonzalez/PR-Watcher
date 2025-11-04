# 🚀 GitHub PR Watcher

Aplicación de escritorio Electron para visualizar, gestionar y analizar Pull Requests de múltiples repositorios de GitHub de forma centralizada.

![GitHub PR Watcher](https://img.shields.io/badge/Electron-28.0.0-blue) ![React](https://img.shields.io/badge/React-18.2.0-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso de la Aplicación](#-uso-de-la-aplicación)
- [Dashboard de Estadísticas](#-dashboard-de-estadísticas)
- [Configuración SAML SSO](#-configuración-saml-sso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Scripts Disponibles](#-scripts-disponibles)
- [Solución de Problemas](#-solución-de-problemas)
- [Documentación Técnica](#-documentación-técnica)
- [Contribuir](#-contribuir)

## ✨ Características Principales

### 📊 **Visualización Avanzada de PRs**
- Lista unificada de PRs de múltiples repositorios
- Información detallada: título, autor, estado, fechas, comentarios
- Indicadores visuales para PRs en draft
- **Colores personalizables por repositorio** para identificación rápida
- **Estado de merge visual**: ✅ Ready, ⚠️ Conflicts, 🚫 Blocked, ❓ Checking
- **Copy URL**: Botón para copiar enlace de PR al portapapeles
- **Ramas con colores**: Verde para rama origen, amarillo para destino, rojo para master

### 👥 **Sistema de Reviews**
- Visualización completa del estado de reviews
- Estados soportados: ✅ Approved, ❌ Changes Requested, 💬 Commented, 🚫 Dismissed
- Solo muestra el review más reciente de cada usuario
- Avatares y nombres de reviewers
- Identificación rápida de PRs listas para merge

### 🔍 **Búsqueda y Filtros Avanzados**
- **Búsqueda inteligente**: Por título, autor, repositorio o nombres de ramas
- **Filtros de estado**: Todas, Abiertas, Borradores, Sin asignar
- **Filtros aditivos por repositorio**: Persistencia de selección con contadores
- **Ordenamiento flexible**: Por fecha, título, repositorio (ascendente/descendente)

### 👤 **Gestión de Asignaciones**
- Asignar/desasignar usuarios directamente desde la interfaz
- Lista de 34+ usuarios configurados del equipo
- Actualización automática en GitHub vía API
- **Búsqueda de usuarios**: Filtro por nombre sin tildes ni caracteres especiales

### 📈 **Dashboard de Estadísticas Completo**
- **3 pestañas especializadas**: Resumen General, Por Usuario, Por Repositorio
- **Datos reales de GitHub API**: Reviews auténticas, no estimaciones
- **Filtros temporales**: 7 días, 30 días, 3 meses, 6 meses
- **Cache inteligente**: TTL de 5 minutos con refresh manual
- **Sistema de carga dual**: PRs abiertas (vista) + todas las PRs (estadísticas)

### ⚡ **Auto-actualización y Performance**
- Actualización automática cada 60 segundos (configurable)
- Refresh manual independiente para estadísticas
- Optimización de API calls con cache
- Manejo inteligente de rate limits de GitHub

## 🛠 Stack Tecnológico

- **Frontend**: React 18.2.0 + TypeScript 5.3.3
- **Desktop**: Electron 28.0.0
- **Build Tool**: Vite 5.0.8 con HMR
- **GitHub API**: Octokit (@octokit/rest 20.0.2)
- **Fechas**: date-fns 2.30.0 (locale español)
- **Styling**: CSS personalizado con tema oscuro
- **IPC**: Comunicación segura Electron con contextBridge

## 🚀 Instalación y Configuración

### Requisitos Previos
- **Node.js** v18 o superior
- **npm** o yarn
- **Token de GitHub** con permisos de lectura/escritura

### 1. Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd PR-Watcher

# Instalar dependencias
npm install
```

### 2. Configuración de GitHub Token

#### Generar Token
1. Ve a GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token (classic)**
3. Nombre: "GitHub PR Watcher"
4. Selecciona scope: ✅ **`repo`** (todos los sub-permisos)
5. **Generate token** y cópialo

#### Configurar Token
```bash
# Copia el archivo de configuración
cp config/config.example.json config/config.json
```

Edita `config/config.json`:
```json
{
  "githubToken": "tu_token_aqui",
  "refreshInterval": 60
}
```

#### ⚠️ IMPORTANTE - Organizaciones con SAML SSO
Si trabajas con organizaciones que usan SAML SSO (como `masorange`):

1. Después de crear el token, haz clic en **"Configure SSO"**
2. **Autoriza la organización** correspondiente
3. Confirma la autorización

**Ver guía completa**: [Configuración SAML SSO](#-configuración-saml-sso) o [docs/SAML_SETUP.md](docs/SAML_SETUP.md)

### 3. Configurar Repositorios

Edita `config/repos.json`:
```json
{
  "repos": [
    {
      "name": "Nombre Personalizado",
      "url": "https://github.com/owner/repo",
      "backgroundColor": "#0969da"
    }
  ]
}
```

### 4. Configurar Usuarios del Equipo

Edita `config/users.json`:
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

## 🎯 Uso de la Aplicación

### Iniciar en Desarrollo
```bash
npm run dev
```
Esto iniciará:
- Servidor Vite en `http://localhost:5173`
- Aplicación Electron con auto-reload

### Funcionalidades Principales

#### **Vista Principal de PRs**
- **Header**: Filtros, búsqueda, contador total de PRs
- **Filtro de repos**: Dropdown con checkboxes y contadores
- **Lista de PRs**: Cards con toda la información relevante
- **Auto-refresh**: Actualización cada 60 segundos

#### **Información por PR**
- **Título con estado de merge**: ✅ Ready, ⚠️ Conflicts, 🚫 Blocked
- **Copy URL**: Botón 📋 siempre visible para copiar enlace
- **Ramas codificadas por color**:
  - 🟢 Verde: Rama origen (head)
  - 🟡 Amarillo: Rama destino (base)
  - 🔴 Rojo: Ramas master/main
- **Reviews**: Estado completo con avatares e iconos
- **Asignaciones**: Lista de usuarios asignados con opciones

#### **Interacciones con PRs**
- **Click en título**: Abre PR en navegador predeterminado
- **Copy URL**: Botón 📋 para copiar enlace
- **Asignar usuarios**: Menú dropdown "+ Asignar"
- **Ver estado de merge**: Indicadores visuales en el título

#### **Dashboard de Estadísticas**
- **Acceso**: Botón "📊 Estadísticas" en header
- **Pestaña Resumen**: Métricas generales del equipo
- **Pestaña Por Usuario**: Estadísticas individuales con tabla ordenable
- **Pestaña Por Repo**: Métricas por repositorio
- **Refresh**: Botón 🔄 para actualizar datos

## 📊 Dashboard de Estadísticas

### Pestaña 📊 Resumen General
**Métricas del equipo:**
- Total PRs, PRs Cerradas, PRs Mergeadas
- PRs en Draft, PRs Pendientes
- Tiempo promedio de review y merge
- PRs antiguas (>30 días) y conflictos pendientes

### Pestaña 👥 Por Usuario
**Estadísticas individuales:**
- PRs creadas, Reviews dadas, PRs asignadas
- Tiempo promedio, PR más antigua
- **Tabla ordenable** por cualquier columna
- Datos de todos los usuarios configurados (34+)

### Pestaña 🏪 Por Repositorio
**Métricas por repo:**
- Total PRs, PRs Cerradas, PRs Mergeadas
- PRs en Draft, PRs Pendientes
- Visualización en tarjetas por repositorio

### Características Técnicas
- **Datos reales**: Reviews cargadas desde GitHub API
- **Cache inteligente**: 5 minutos TTL, refresh manual
- **Filtros temporales**: 7 días, 30 días, 3 meses, 6 meses
- **Optimización**: ~909 requests máximo (18% del rate limit)

## 🔐 Configuración SAML SSO

### Problema: Token no autorizado
Si ves **"0 PRs"** y errores SAML en consola:

### Solución: Autorizar Token
1. Ve a GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. Encuentra tu token y haz clic en **"Configure SSO"**
3. Busca tu organización (ej: `masorange`)
4. Click en **"Authorize"** y confirma
5. Reinicia la aplicación con `npm run dev`

### Verificación
Después de autorizar deberías ver:
- ✅ Número correcto de PRs en header
- ✅ Lista completa de PRs
- ✅ Sin errores SAML en consola

**Más información**: [Documentación oficial de GitHub](https://docs.github.com/es/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on)

## � Documentación Técnica

### Archivos de Documentación Técnica
- **[docs/CONTEXT.md](docs/CONTEXT.md)**: Contexto completo del proyecto, arquitectura, decisiones técnicas, y estado actual del desarrollo
- **[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)**: Especificaciones detalladas, casos de uso, requisitos funcionales y no funcionales
- **[docs/SAML_SETUP.md](docs/SAML_SETUP.md)**: Guía paso a paso para configurar autenticación SAML con organizaciones GitHub

### Recursos para Desarrolladores
- **Stack completo**: Electron + React + TypeScript + Vite
- **Arquitectura**: IPC seguro, dual loading system, cache inteligente
- **API Integration**: GitHub REST API con Octokit, manejo de rate limits
- **Estado del proyecto**: Completamente funcional con dashboard de estadísticas

## �📁 Estructura del Proyecto

```
PR-Watcher/
├── 📁 electron/                 # Código Electron (proceso principal)
│   ├── main.ts                 # Ventana principal + IPC handlers
│   ├── preload.ts              # Bridge seguro (contextBridge)
│   └── *.js                    # Archivos compilados
├── 📁 src/                     # Código React
│   ├── 📁 components/          # Componentes UI
│   │   ├── App.tsx            # Componente raíz + estado global
│   │   ├── PullRequestList.tsx # Lista con filtros
│   │   ├── PullRequestItem.tsx # Card individual de PR
│   │   ├── StatsModal.tsx     # Dashboard de estadísticas
│   │   └── *.css              # Estilos componentes
│   ├── 📁 services/           # Servicios
│   │   ├── github.ts          # GitHub API + dual loading
│   │   └── statsService.ts    # Cálculo de métricas + cache
│   ├── 📁 types/              # Definiciones TypeScript
│   │   └── index.ts           # Interfaces y tipos
│   ├── electron.d.ts          # Tipos Electron API
│   └── main.tsx               # Entry point React
├── 📁 config/                 # Configuración
│   ├── config.json           # Token + settings (no versionado)
│   ├── config.example.json   # Ejemplo de configuración
│   ├── repos.json            # Lista de repositorios (9 repos)
│   └── users.json            # Lista de usuarios (34+ usuarios)
├── 📁 release/               # Builds de producción
├── package.json              # Dependencias + scripts
├── vite.config.ts           # Config Vite + Electron
├── tsconfig.json            # Config TypeScript (React)
├── tsconfig.node.json       # Config TypeScript (Electron)
└── README.md                # Esta documentación
```

## 🏗 Scripts Disponibles

### Desarrollo
```bash
npm run dev              # Desarrollo completo (Vite + Electron)
npm run dev:vite         # Solo servidor Vite
npm run dev:electron     # Solo proceso Electron
npm run build:electron   # Compilar archivos Electron
```

### Producción
```bash
npm run build           # Build completo
npm run build:win       # Build para Windows (.exe)
npm run build:mac       # Build para macOS (.dmg)
npm run build:linux     # Build para Linux (.AppImage)
```

### Utilidades
```bash
npm run preview         # Preview del build
npm run clean           # Limpiar archivos compilados
```

Los instaladores se generan en la carpeta `release/`.

## 🔧 Solución de Problemas

### Error: "Por favor, configura tu token de GitHub"
**Causa**: Archivos TypeScript de Electron no compilados
**Solución**:
```bash
rm -rf dist
npm run build:electron
npm run dev
```

### No se cargan las PRs
**Verificar**:
- Token válido en `config/config.json`
- Token autorizado para SAML SSO si es necesario
- URLs correctas en `config/repos.json`
- Permisos `repo` en el token

### Comentarios mostrando 0
**Causa**: GitHub API `pulls.list()` no incluye conteos
**Solución**: Ya implementada - usa `pulls.get()` individual para cada PR

### Reviews mostrando 0
**Causa**: Reviews requieren endpoint separado
**Solución**: Ya implementada - carga real de reviews en dashboard

### Performance con muchos repos
**Actual**: Optimizado para ~100 PRs across 9 repos
**Si escala**: Considerar paginación GitHub API, cache persistente

### DevTools no abren
**Manual**: `Ctrl+Shift+I` o `Cmd+Option+I`
**Auto**: Descomentar línea 20 en `electron/main.ts`

### Rate Limit GitHub
**Límite**: 5,000 requests/hora con autenticación
**Uso actual**: ~18% del límite para estadísticas completas
**Mitigación**: Cache inteligente, calls paralelas, ETags

## 🤝 Contribuir

### Configuración para Desarrollo
```bash
# Instalar dependencias
npm install

# Compilar Electron
npm run build:electron

# Iniciar desarrollo
npm run dev
```

### Estructura de Commits
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato/estilo
- `refactor:` Refactoring de código
- `perf:` Mejoras de performance
- `test:` Añadir/modificar tests

### Roadmap de Funcionalidades

#### ✅ Completado
- [x] Dashboard de Estadísticas completo
- [x] Sistema de Reviews real
- [x] Copy URL functionality
- [x] Filtros aditivos avanzados
- [x] Estado de merge visual
- [x] Cache inteligente
- [x] Dual loading system
- [x] Ramas con colores codificados
- [x] Flecha de merge mejorada

#### 🔄 En Progreso
- [ ] Notificaciones de escritorio
- [ ] Configuración desde UI
- [ ] Filtro Por labels

#### 📋 Pendiente
- [ ] Drill-down en estadísticas
- [ ] Exportación de datos (CSV/JSON)
- [ ] GitHub Enterprise support
- [ ] Dashboard personalizable
- [ ] Modo offline con cache persistente
- [ ] Métricas avanzadas (patrones horarios)

## 📄 Licencia

MIT License - Ver archivo `LICENSE` para detalles.

## 🆘 Soporte

Para problemas, preguntas o sugerencias:
1. Revisar esta documentación completa
2. Verificar [Solución de Problemas](#-solución-de-problemas)
3. Crear un issue con logs y pasos para reproducir

---

**🚀 ¡Happy coding!** - Desarrollado con ❤️ para mejorar la productividad del equipo.
