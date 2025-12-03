---
agent: agent
argument-hint: URL=<url>
---

Actúa como un experto revisor de código senior. Analiza la PULL REQUEST proporcionada $URL y genera un informe detallado en el archivo PR-[NUMERO_DE_PR].md que incluya:

## 1. Errores de Sintaxis y Compilación

- Identifica errores de sintaxis
- Funciones o metodos asincronos usados de forma sincrona
- Funciones o metodos asincronos sin control de errores
- Funciones o metodos asincronos que pueden fallar silenciosamente
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
- Multiples niveles de anidación
- Multiples if/else anidados
- Complejidad ciclomatica alta

## 4. Problemas de Rendimiento

- Operaciones ineficientes (O(n²) cuando podría ser O(n))
- Llamadas redundantes a APIs/DB
- Memory leaks potenciales
- Re-renderizados innecesarios

## 5. Seguridad

- Vulnerabilidades de inyección SQL/XSS
- Exposición de datos sensibles
- Validación de entrada faltante
- Manejo inseguro de credenciales

## 6. Mejores Prácticas

- Código duplicado (DRY)
- Funciones demasiado largas
- Acoplamiento excesivo
- Falta de manejo de errores
- Tests faltantes

## 7. Mantenibilidad

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
