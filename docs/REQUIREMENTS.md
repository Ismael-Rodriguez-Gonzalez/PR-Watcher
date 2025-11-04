# Requisitos - GitHub PR Watcher

## 1. Visión General
Aplicación para visualizar y gestionar pull requests de múltiples repositorios de GitHub de forma centralizada, facilitando el seguimiento y la interacción con PRs de diferentes proyectos.

## 2. Objetivos
- Centralizar la visualización de PRs de múltiples repositorios
- Facilitar el seguimiento del estado de los PRs
- Permitir interacciones básicas sin salir de la aplicación
- Mejorar la productividad del equipo de desarrollo

## 3. Requisitos Funcionales

### 3.1 Gestión de Repositorios
- **RF-001**: Configurar múltiples repositorios de GitHub para monitorear
- **RF-002**: Añadir/eliminar repositorios de la lista de seguimiento
- **RF-003**: Asignar nombres personalizados a los repositorios
- **RF-004**: Guardar configuración de repositorios de forma persistente

### 3.2 Visualización de Pull Requests
- **RF-005**: Listar todos los PRs abiertos de los repositorios configurados
- **RF-006**: Mostrar información clave de cada PR:
  - Título y descripción
  - Autor
  - Estado (open, draft, ready for review)
  - Número de PR
  - Fecha de creación/actualización
  - Labels/etiquetas
  - Número de comentarios
  - Número de aprobaciones/rechazos
  - Checks de CI/CD (status)
  - Conflictos de merge
  - Reviewers asignados

### 3.3 Filtros y Búsqueda
- **RF-007**: Filtrar PRs por repositorio
- **RF-008**: Filtrar PRs por estado (open, draft, ready, approved, changes requested)
- **RF-009**: Filtrar PRs por autor
- **RF-010**: Filtrar PRs por reviewer
- **RF-011**: Filtrar PRs por labels
- **RF-012**: Buscar PRs por título o número
- **RF-013**: Ordenar PRs por fecha, actualizaciones, o prioridad

### 3.4 Interacciones con Pull Requests
- **RF-014**: Abrir PR en GitHub (navegador externo)
- **RF-015**: Ver detalles completos del PR
- **RF-016**: Ver archivos modificados y diff
- **RF-017**: Leer comentarios existentes
- **RF-018**: Añadir comentarios generales al PR
- **RF-019**: Añadir comentarios en líneas específicas del código
- **RF-020**: Aprobar un PR
- **RF-021**: Solicitar cambios en un PR
- **RF-022**: Mergear un PR (si se tienen permisos)
- **RF-023**: Cerrar un PR
- **RF-024**: Asignar reviewers
- **RF-025**: Añadir/eliminar labels

### 3.5 Notificaciones y Actualizaciones
- **RF-026**: Actualizar automáticamente la lista de PRs (polling o webhooks)
- **RF-027**: Notificar cuando hay nuevos PRs
- **RF-028**: Notificar cuando un PR es actualizado
- **RF-029**: Notificar cuando se solicita review
- **RF-030**: Destacar PRs que requieren atención del usuario

### 3.6 Dashboard y Estadísticas
- **RF-031**: Mostrar contador de PRs por repositorio
- **RF-032**: Mostrar PRs que requieren mi review
- **RF-033**: Mostrar mis PRs creados
- **RF-034**: Métricas básicas (tiempo promedio de review, PRs mergeados, etc.)

### 3.7 Configuración
- **RF-035**: Configurar token de GitHub para autenticación
- **RF-036**: Configurar intervalo de actualización
- **RF-037**: Configurar notificaciones (activar/desactivar)
- **RF-038**: Tema claro/oscuro

## 4. Requisitos No Funcionales

### 4.1 Rendimiento
- **RNF-001**: La aplicación debe cargar los PRs en menos de 3 segundos
- **RNF-002**: Las actualizaciones deben ser eficientes (usar cache y ETags de GitHub)
- **RNF-003**: Manejar correctamente los límites de rate de la API de GitHub

### 4.2 Usabilidad
- **RNF-004**: Interfaz intuitiva y fácil de usar
- **RNF-005**: Diseño responsive (desktop y móvil)
- **RNF-006**: Indicadores visuales claros del estado de cada PR
- **RNF-007**: Accesos rápidos mediante atajos de teclado

### 4.3 Seguridad
- **RNF-008**: El token de GitHub debe almacenarse de forma segura
- **RNF-009**: No exponer credenciales en logs o interfaz
- **RNF-010**: Usar HTTPS para todas las comunicaciones

### 4.4 Compatibilidad
- **RNF-011**: Compatible con GitHub API v3/v4 (REST/GraphQL)
- **RNF-012**: Funcionar en navegadores modernos (Chrome, Firefox, Safari, Edge)
- **RNF-013**: Soporte para GitHub Enterprise (opcional)

### 4.5 Mantenibilidad
- **RNF-014**: Código modular y bien documentado
- **RNF-015**: Tests unitarios y de integración
- **RNF-016**: Manejo de errores robusto

## 5. Tecnologías Sugeridas

### 5.1 Frontend
- **React** / Vue / Angular para la interfaz
- **TypeScript** para type safety
- **Tailwind CSS** / Material-UI para estilos
- **React Query** / SWR para gestión de estado y cache

### 5.2 Backend (Opcional)
- **Node.js** + Express si necesitas un proxy
- O una aplicación completamente cliente usando GitHub API directamente

### 5.3 Librerías Útiles
- **Octokit** (@octokit/rest) - Cliente oficial de GitHub API
- **date-fns** o **dayjs** - Manejo de fechas
- **React Router** - Navegación
- **Zustand** / Redux - Estado global

## 6. Estructura de Datos

### 6.1 Configuración (config.json)
```json
{
  "githubToken": "string",
  "refreshInterval": "number (segundos)",
  "notifications": {
    "enabled": boolean,
    "newPR": boolean,
    "prUpdated": boolean,
    "reviewRequested": boolean
  },
  "theme": "light" | "dark"
}
```

### 6.2 Repositorios (repos.json)
```json
{
  "repos": [
    {
      "url": "string",
      "name": "string",
      "owner": "string",
      "repo": "string",
      "enabled": boolean,
      "color": "string (opcional)"
    }
  ]
}
```

### 6.3 Modelo de PR (en memoria)
```typescript
interface PullRequest {
  id: number;
  number: number;
  title: string;
  description: string;
  state: 'open' | 'closed' | 'draft';
  author: User;
  repository: Repository;
  createdAt: Date;
  updatedAt: Date;
  labels: Label[];
  reviewers: User[];
  reviews: Review[];
  comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  mergeable: boolean;
  checks: Check[];
  url: string;
}
```

## 7. Casos de Uso Principales

### 7.1 Ver PRs Pendientes
**Actor**: Desarrollador
**Flujo**:
1. Usuario abre la aplicación
2. Sistema carga PRs de todos los repositorios configurados
3. Sistema muestra lista ordenada por fecha
4. Usuario puede filtrar o buscar PRs específicos

### 7.2 Revisar un PR
**Actor**: Reviewer
**Flujo**:
1. Usuario selecciona un PR de la lista
2. Sistema muestra detalles completos del PR
3. Usuario revisa cambios en el código
4. Usuario añade comentarios
5. Usuario aprueba o solicita cambios
6. Sistema actualiza el estado del PR

### 7.3 Mergear un PR
**Actor**: Maintainer
**Flujo**:
1. Usuario selecciona un PR aprobado
2. Sistema verifica que el PR es mergeable
3. Usuario confirma el merge
4. Sistema ejecuta el merge en GitHub
5. Sistema actualiza la lista de PRs

## 8. Fases de Desarrollo Sugeridas

### Fase 1 - MVP (Mínimo Producto Viable)
- Autenticación con GitHub
- Listar PRs abiertos
- Ver detalles básicos
- Abrir en GitHub
- Filtros básicos

### Fase 2 - Interacciones Básicas
- Añadir comentarios
- Aprobar PRs
- Solicitar cambios
- Ver archivos modificados

### Fase 3 - Características Avanzadas
- Notificaciones
- Dashboard con métricas
- Merge desde la aplicación
- Gestión de labels y reviewers

### Fase 4 - Mejoras y Optimización
- Cache inteligente
- Modo offline
- Búsqueda avanzada
- Personalización avanzada

## 9. Métricas de Éxito
- Reducción del 50% en tiempo de navegación entre PRs
- Incremento en velocidad de review
- Satisfacción del usuario > 4/5
- Tasa de adopción del equipo > 80%

## 10. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Límites de rate de GitHub API | Alto | Media | Implementar cache agresivo y uso eficiente de ETags |
| Cambios en la API de GitHub | Medio | Baja | Usar librerías oficiales y mantenerlas actualizadas |
| Problemas de seguridad con tokens | Alto | Media | Almacenamiento seguro, nunca en código fuente |
| Rendimiento con muchos repos | Medio | Media | Paginación, carga lazy, virtualización de listas |

## 11. Próximos Pasos
1. ✅ Definir requisitos (este documento)
2. Diseñar mockups/wireframes de la interfaz
3. Configurar proyecto y estructura
4. Implementar autenticación con GitHub
5. Desarrollar listado de PRs (MVP)
6. Iterar según feedback del equipo
