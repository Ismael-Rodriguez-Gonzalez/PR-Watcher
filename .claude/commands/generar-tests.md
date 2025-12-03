Genera tests para el archivo actual que cubran todos los casos de uso, incluyendo casos límite y errores esperados.

## Reglas de Generación de Tests

- Genera la cantidad mínima de tests para obtener el máximo de cobertura, no más.
- Si ya existe un archivo de test, ejecútalo y comprueba su correcto funcionamiento y cobertura antes de modificarlo.
- Intenta conseguir la máxima cobertura de código posible (statements, branches, functions y lines).
- Limpia cualquier estado global, mocks o spies entre tests para evitar interferencias.
- Los tests deben ejecutar el código real del elemento a testear.
- Realiza las correcciones necesarias en los tests sin preguntar.
- Añade nuevos tests si es necesario, sin preguntar.
- Todos los textos en los archivos de testing (nombres, descripciones, comentarios, etc.) deben estar en inglés.
- Los tests deben ser autocontenidos y no depender de otros archivos o estados previos.
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
- No crees un archivo con el sumario de las acciones realizadas.
- Si necesitas más información, presenta las opciones de forma numerada para que pueda responder directamente con un número.
- No modifiques el archivo a testear; si requiere alguna corrección, para y pregunta siempre antes.

## Verificación de Cobertura

Para comprobar el funcionamiento y la cobertura de los tests, usa comandos de test del proyecto con flags de cobertura como `--coverage` o `--collectCoverage`.
