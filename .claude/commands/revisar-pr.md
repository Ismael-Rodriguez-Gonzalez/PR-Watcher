Actúa como un experto revisor de código senior.

**IMPORTANTE**: Primero, usa `gh pr view <número-o-url> --json files --jq '.files[].path'` para obtener la lista de archivos modificados en la PR. Luego lee cada archivo para analizar los cambios.

Genera un informe detallado en formato markdown que incluya:

## 1. Errores de Sintaxis y Compilación

- Identifica errores de sintaxis
- Funciones o métodos asíncronos usados de forma síncrona
- Funciones o métodos asíncronos sin control de errores
- Funciones o métodos asíncronos que pueden fallar silenciosamente
- Posibles excepciones no controladas
- Posibles "race conditions" en el código

## 2. Errores Lógicos

- Condiciones que siempre son verdaderas/falsas
- Bucles infinitos potenciales
- Operaciones matemáticas incorrectas
- Manejo inadecuado de casos edge
- Problemas con valores null/undefined

## 3. Inconsistencias

- Patrones de diseño contradictorios
- Formato inconsistente

## 4. Complejidad

- Bucles anidados
- Múltiples niveles de anidación
- Múltiples if/else anidados
- Complejidad ciclomática alta

## 5. Problemas de Rendimiento

- Operaciones ineficientes (O(n²) cuando podría ser O(n))
- Llamadas redundantes a APIs/DB
- Memory leaks potenciales
- Re-renderizados innecesarios

## 6. Seguridad

- Vulnerabilidades de inyección SQL/XSS
- Exposición de datos sensibles
- Validación de entrada faltante
- Manejo inseguro de credenciales

## 7. Mejores Prácticas

- Código duplicado (DRY)
- Funciones demasiado largas
- Acoplamiento excesivo
- Falta de manejo de errores
- Tests faltantes

## 8. Mantenibilidad

- Código difícil de entender
- Falta de comentarios en lógica compleja
- Responsabilidades poco claras
- Dependencias obsoletas

Para cada problema encontrado, proporciona:

- **Ubicación**: Archivo - Línea(s) específica(s)
- **Severidad**: Crítico, Alto, Medio, Bajo
- **Descripción**: Qué está mal
- **Impacto**: Consecuencias potenciales
- **Solución**: Cómo corregirlo explicado de forma breve

Prioriza los problemas por severidad y presenta los problemas en una lista numerada.

**Uso**: `/revisar-pr <número-o-url-de-pr>`
