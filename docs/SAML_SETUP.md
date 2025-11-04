# 🔐 Configuración de Token GitHub con SAML SSO

## Problema Detectado

Si ves el mensaje **"0 PRs"** y en la consola aparece un error de SAML, significa que tu token de GitHub necesita ser autorizado para acceder a la organización `masorange`.

## Solución: Autorizar el Token para SAML SSO

### Paso 1: Ir a la configuración de tokens
1. Ve a GitHub.com
2. Click en tu avatar (esquina superior derecha)
3. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**

### Paso 2: Encontrar tu token
1. Busca el token que creaste (el que pusiste en `config.json`)
2. Al lado del token verás un botón **"Configure SSO"**

### Paso 3: Autorizar la organización
1. Click en **"Configure SSO"**
2. Busca la organización **"masorange"**
3. Click en **"Authorize"**
4. Confirma la autorización

### Paso 4: Reiniciar la aplicación
1. Cierra la aplicación
2. Ejecuta `npm run dev` de nuevo
3. Ahora deberías ver las PRs correctamente

## Alternativa: Crear un nuevo token con SSO autorizado

Si prefieres crear un nuevo token:

1. Ve a GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click en **"Generate new token (classic)"**
3. Dale un nombre descriptivo: "GitHub PR Watcher"
4. Selecciona los scopes:
   - ✅ `repo` (todos los sub-permisos)
5. Click en **"Generate token"**
6. **COPIA EL TOKEN** (solo se muestra una vez)
7. Click en **"Configure SSO"** junto al token recién creado
8. Autoriza la organización **"masorange"**
9. Pega el nuevo token en `config.json`:
   ```json
   {
     "githubToken": "tu_nuevo_token_aqui",
     "refreshInterval": 60
   }
   ```
10. Reinicia la aplicación

## Verificación

Una vez autorizado, deberías ver:
- ✅ Número correcto de PRs en la cabecera
- ✅ Lista de PRs con toda su información
- ✅ Sin mensajes de error en la consola

## Notas de Seguridad

- ⚠️ **NUNCA** compartas tu token con nadie
- ⚠️ **NUNCA** subas el archivo `config.json` a un repositorio público
- ⚠️ El archivo `config.json` está en `.gitignore` por seguridad
- 🔄 Los tokens expiran, si dejas de ver PRs, verifica que tu token siga activo

## Más información

Para más detalles sobre SAML SSO con tokens:
https://docs.github.com/es/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on
