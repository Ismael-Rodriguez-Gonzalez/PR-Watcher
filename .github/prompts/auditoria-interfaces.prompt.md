---
agent: agent
---

# Prompt para Auditoría de Constantes e Interfaces

Actúa como un auditor de código TypeScript. Analiza el código proporcionado y genera un informe exhaustivo sobre el uso de constantes e interfaces.

## 1. Análisis de Constantes

### Constantes Definidas pero No Utilizadas

- Lista todas las constantes declaradas (const, enum, readonly)
- Identifica cuáles NO están siendo referenciadas en el código
- Indica su ubicación exacta (archivo y línea)
- Sugiere si deben eliminarse o si falta su implementación

### Constantes Duplicadas

- Detecta valores literales repetidos que deberían ser constantes
- Identifica constantes con el mismo valor en diferentes archivos
- Sugiere consolidación en un archivo de constantes compartidas

### Uso Inconsistente

- Encuentra lugares donde se usan valores hardcodeados en vez de constantes existentes
- Detecta constantes usadas solo una vez (¿realmente necesarias?)

## 2. Análisis de Interfaces

### Interfaces Definidas pero No Utilizadas

- Lista todas las interfaces/types declaradas
- Identifica cuáles NO están siendo implementadas ni usadas como tipos
- Indica archivos y líneas donde están definidas
- Evalúa si son interfaces "huérfanas" o pendientes de usar

### Interfaces Redundantes

- Detecta interfaces con la misma estructura
- Identifica interfaces que podrían extender de otras
- Sugiere refactorización usando generics o utility types

### Uso Incompleto de Propiedades

- Para cada interface usada, verifica qué propiedades se están utilizando
- Identifica propiedades opcionales que nunca se usan
- Detecta propiedades que siempre son undefined/null

## 3. Análisis de Coherencia

### Naming Conventions

- Verifica que constantes sigan UPPER_SNAKE_CASE o camelCase consistentemente
- Verifica que interfaces sigan PascalCase
- Detecta inconsistencias de nomenclatura

### Exportaciones

- Lista constantes/interfaces exportadas pero no importadas en ningún lado
- Identifica exportaciones que deberían ser privadas
- Detecta re-exportaciones innecesarias

## 4. Formato del Informe

Para cada hallazgo proporciona:

### Constantes No Utilizadas

```
📦 CONSTANTE: NOMBRE_CONSTANTE
📍 Ubicación: archivo.ts:línea
⚠️ Estado: No utilizada
💡 Recomendación: [Eliminar | Implementar uso | Revisar]
```

### Interfaces No Utilizadas

```
🔷 INTERFACE: INombreInterface
📍 Ubicación: archivo.ts:línea
📊 Propiedades: X propiedades definidas
⚠️ Estado: No implementada ni usada
💡 Recomendación: [Eliminar | Implementar | Documentar razón]
```

### Valores Hardcodeados

```
🔢 VALOR LITERAL: "valor" o 123
📍 Ubicación: archivo.ts:línea
✨ Sugerencia: Crear constante NOMBRE_SUGERIDA
📝 Motivo: Se repite X veces o tiene significado semántico
```

## 5. Métricas Generales

Proporciona un resumen con:

- Total de constantes definidas vs utilizadas (% de uso)
- Total de interfaces definidas vs utilizadas (% de uso)
- Número de valores hardcodeados que deberían ser constantes
- Score de salud del código (0-100)

## 6. Plan de Limpieza

Genera una lista priorizada de acciones:

1. **Crítico**: Eliminar código muerto (constantes/interfaces nunca usadas)
2. **Alto**: Reemplazar valores hardcodeados con constantes existentes
3. **Medio**: Consolidar constantes duplicadas
4. **Bajo**: Refactorizar interfaces redundantes

Incluye comandos o regex para facilitar la búsqueda y limpieza.
