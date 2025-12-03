# Slash Commands de Claude Code

Este directorio contiene comandos reutilizables para Claude Code. Son equivalentes a los prompts de GitHub Copilot pero funcionan de manera diferente.

## Cómo Usar

En lugar de usar `@workspace` + prompt de Copilot, usa `/comando` en el chat de Claude Code:

### Ejemplo:

```
/revisar-codigo
```

Claude ejecutará el comando sobre el contexto actual (archivo abierto, selección, o puedes especificar archivos).

## Comandos Disponibles

### `/revisar-codigo`
Revisa el código actual buscando errores de sintaxis, lógicos, de rendimiento, seguridad, etc.

**Uso**:
- Abre un archivo y ejecuta `/revisar-codigo`
- O menciona archivos: `/revisar-codigo` y luego especifica qué archivos revisar

### `/documentar`
Genera documentación JSDoc para funciones, clases y archivos siguiendo las mejores prácticas.

**Uso**:
- Abre un archivo y ejecuta `/documentar`

### `/revisar-pr <número-o-url>`
Revisa una Pull Request completa usando `gh` CLI.

**Uso**:
```
/revisar-pr 123
```
o
```
/revisar-pr https://github.com/owner/repo/pull/123
```

### `/generar-tests`
Genera tests unitarios con máxima cobertura para el archivo actual en una sola pasada.

**Uso**:
- Abre un archivo y ejecuta `/generar-tests`

### `/tests-iterativos`
Genera tests de forma iterativa, caso por caso, con confirmación manual en cada paso. Ideal para ir construyendo tests progresivamente.

**Uso**:
- Abre un archivo y ejecuta `/tests-iterativos`
- Confirma cada caso de uso propuesto antes de que se genere el test

### `/auditar-interfaces`
Audita el uso de constantes e interfaces en el código TypeScript. Detecta código no usado, valores hardcodeados y problemas de coherencia.

**Uso**:
- Ejecuta `/auditar-interfaces` sobre archivo actual o especifica archivos/directorios

## Diferencias con Copilot

| Aspecto | GitHub Copilot | Claude Code |
|---------|----------------|-------------|
| **Ubicación** | `.github/prompts/` | `.claude/commands/` |
| **Extensión** | `.prompt.md` | `.md` |
| **Frontmatter** | `---`<br>`agent: agent`<br>`---` | No necesario |
| **Invocación** | `@workspace` + selección | `/comando` |
| **Argumentos** | `$VARIABLE` | Se pasan después del comando |

## Crear Nuevos Comandos

1. Crea un archivo `.md` en `.claude/commands/`
2. Escribe las instrucciones en markdown
3. No necesitas frontmatter especial
4. El nombre del archivo será el nombre del comando

**Ejemplo**: `mi-comando.md` → `/mi-comando`

## Consejos

- Los comandos tienen acceso a todo el contexto de la conversación
- Puedes mencionar archivos específicos después de invocar un comando
- Los comandos pueden usar herramientas como `Read`, `Edit`, `Bash`, etc.
- Escribe instrucciones claras y específicas en los archivos `.md`
