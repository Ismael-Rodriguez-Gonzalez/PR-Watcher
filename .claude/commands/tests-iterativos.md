# Generación Iterativa de Tests

Este comando genera tests de forma iterativa, caso por caso, con validación continua de cobertura.

## Flujo de Trabajo

Actúa de la siguiente forma:

1. **Propón un caso de uso a testear**
2. **Espera confirmación del usuario**
3. **Crea ÚNICAMENTE UN NUEVO TEST** en el archivo de testing ⬅️ ESTO ES IMPORTANTE
4. El test no es válido si no ejecuta código real del elemento a testear
5. Itera sobre este único test si tiene errores o no satisface correctamente el caso de uso
6. **Vuelve al paso 1**

## Objetivo

- Generar tests para el archivo actual que cubran todos los casos de uso, incluyendo casos límite y errores esperados.
- Si ya existe un archivo de test, ejecútalo y comprueba su correcto funcionamiento y cobertura antes de modificarlo.
- Intenta conseguir la máxima cobertura de código posible (statements, branches, functions y lines).
- Limpia cualquier estado global, mocks o spies entre tests para evitar interferencias.
- Realiza las correcciones necesarias en los tests sin preguntar.

## Características de los Tests

- **Cada test debe cubrir un único caso de uso**
- Todos los textos en los archivos de testing (nombres, descripciones, comentarios, etc.) deben estar en **inglés**.
- Los tests deben ser autocontenidos y no depender de otros archivos o estados previos.
- Los tests deben ejecutar el **código real** del elemento a testear.
- En los archivos de testing se permite un tipado de TypeScript relajado para poder probar los casos, usando por ejemplo `any` o aserciones.
- No se aplican restricciones de número de líneas a los archivos de testing.
- No debe haber más de un archivo de testing para el archivo que estamos testeando.

## Patrón de Tests

Siempre que sea posible, sigue el siguiente patrón (adapta los nombres al framework de testing):

```typescript
describe('name of the method, function or element to test', () => {
  test('descriptive name', () => {
    /* rest of the test */

    const actual = value to test;
    const expected = expected value;

    expect(actual).toBe(expected);
  });
});
```

## Instrucciones Generales

- Responde siempre en el mismo idioma de la pregunta.
- Al finalizar cada test, presenta de forma resumida las mejoras obtenidas respecto al test anterior y propón un nuevo caso de uso a testear, si lo hay.
- Si necesitas más información, presenta las opciones de forma numerada para que pueda responder directamente con un número.
- **No modifiques el archivo a testear**; si requiere alguna corrección, para y pregunta siempre antes.

## Verificación

Comprueba el funcionamiento de los tests ejecutando el comando de test del proyecto con flags de cobertura (ej: `npm test -- --coverage`).

**Uso**: `/tests-iterativos` sobre el archivo que quieres testear
