# 🔍 Ejemplos de Búsqueda por Número de PR

## ✨ Nueva Funcionalidad: Búsqueda por Número de PR

Ahora puedes buscar Pull Requests por su número de diferentes maneras:

### 📝 Formatos Soportados:

1. **Solo números**: `424`
2. **Con símbolo hash**: `#424`
3. **Con prefijo PR**: `PR424`
4. **Con prefijo pr**: `pr424`
5. **Búsqueda parcial**: `42` (encontrará 424, 142, 342, etc.)

### 🎯 Cómo Funciona:

- **Prioridad inteligente**: Si escribes solo números, se priorizará la búsqueda por número de PR
- **Búsqueda mixta**: Si incluyes texto y números, buscará en todos los campos incluyendo números
- **Casos de uso común**:
  - Cuando un compañero dice "revisa la PR 424"
  - Cuando compartes una URL como `https://github.com/repo/pull/424`
  - Cuando quieres encontrar rápidamente una PR específica

### 🔧 Implementación:

- Extrae automáticamente números de cualquier texto
- Busca coincidencias exactas y parciales
- Mantiene la funcionalidad de búsqueda original en título, autor, repositorio y ramas

### 💡 Ejemplos de Búsqueda:

| Búsqueda | Encuentra |
|----------|-----------|
| `424` | PRs con número 424, 4240, 1424, etc. |
| `#424` | PRs con número que contengan 424 |
| `PR424` | PRs con número que contengan 424 |
| `fix 424` | PRs con "fix" en título/rama Y que contengan 424 |
| `ismael` | PRs del autor "ismael" |
| `feature` | PRs con "feature" en título o rama |

### 🚀 Uso:

1. Abre la aplicación PR Watcher
2. Ve al campo de búsqueda (arriba de la lista de PRs)
3. Escribe el número de PR que necesitas encontrar
4. Los resultados se filtrarán automáticamente

¡Ahora es mucho más fácil encontrar PRs específicas cuando tus compañeros las mencionan por número!