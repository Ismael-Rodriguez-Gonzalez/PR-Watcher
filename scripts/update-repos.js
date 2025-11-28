#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env y .env.local
require('dotenv').config(); // Carga .env
require('dotenv').config({ path: '.env.local', override: true }); // Carga .env.local (prioridad)

// Colores predefinidos para repos
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#FAD7A0',
  '#ABEBC6', '#F9E79F', '#D7BDE2', '#A9CCE3', '#A3E4D7'
];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    pattern: null,
    org: 'masorange',
    add: true,  // Por defecto AÑADE (modo seguro)
    replace: false,  // Solo reemplaza si se especifica explícitamente
    color: null,
    refreshInterval: null,
    removeArchived: false,  // Eliminar repos archivados
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pattern':
      case '-p':
        config.pattern = args[++i];
        break;
      case '--org':
      case '-o':
        config.org = args[++i];
        break;
      case '--add':
      case '-a':
        config.add = true;
        config.replace = false;
        break;
      case '--replace':
        config.add = false;
        config.replace = true;
        break;
      case '--color':
      case '-c':
        config.color = args[++i];
        break;
      case '--refresh-interval':
      case '-r':
        config.refreshInterval = parseInt(args[++i], 10);
        break;
      case '--remove-archived':
        config.removeArchived = true;
        break;
      case '--help':
      case '-h':
        config.help = true;
        break;
    }
  }

  return config;
}

function showHelp() {
  console.log(`
📦 Update Repos - Generador de repos.json

Uso:
  npm run update-repos -- [opciones]

Opciones:
  -p, --pattern <patrón>         Patrón de búsqueda (ej: "componenteslegacy-*")
  -o, --org <org>                Organización de GitHub (default: masorange)
  -a, --add                      Añadir a repos existentes (DEFAULT, modo seguro)
  --replace                      ⚠️  REEMPLAZAR lista completa (destructivo)
  -c, --color <color>            Color para todos los repos (default: aleatorio)
  -r, --refresh-interval <segs>  Intervalo de refresco en segundos (default: 7200)
  --remove-archived              🗑️  Eliminar repos archivados de repos.json
  -h, --help                     Mostrar esta ayuda

Ejemplos:
  # Añadir repos (MODO POR DEFECTO - seguro)
  npm run update-repos -- --pattern "componenteslegacy-*"

  # Repos activos con refresco de 60 segundos
  npm run update-repos -- --pattern "active-project-*" --refresh-interval 60

  # Especificar color personalizado
  npm run update-repos -- --pattern "nuevos-*" --color "#ff6b35"

  # 🗑️ Limpiar repos archivados
  npm run update-repos -- --remove-archived

  # ⚠️ REEMPLAZAR todo (cuidado!)
  npm run update-repos -- --pattern "solo-estos-*" --replace

  # Buscar en otra organización
  npm run update-repos -- --pattern "my-prefix-*" --org otra-org

Notas:
  - Por defecto AÑADE a la lista existente (no machaca)
  - Siempre preserva defaultRefreshInterval
  - Evita duplicados por URL
  - --remove-archived revisa TODOS los repos y elimina archivados
`);
}

async function fetchReposByPattern(octokit, org, pattern) {
  console.log(`\n🔍 Buscando repos en ${org} con patrón: ${pattern}`);

  // Convertir patrón wildcard a regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);

  const allRepos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const { data } = await octokit.repos.listForOrg({
        org,
        per_page: 100,
        page,
        type: 'all'
      });

      if (data.length === 0) {
        hasMore = false;
      } else {
        allRepos.push(...data);
        page++;
        process.stdout.write(`\r📊 Repos encontrados: ${allRepos.length}`);
      }
    } catch (error) {
      console.error(`\n❌ Error al obtener repos: ${error.message}`);
      throw error;
    }
  }

  // Filtrar por patrón
  const matchedRepos = allRepos.filter(repo => regex.test(repo.name));

  console.log(`\n✅ ${matchedRepos.length} repos coinciden con el patrón`);

  return matchedRepos;
}

function convertToRepoConfig(repos, color, refreshInterval, defaultRefreshInterval) {
  return repos.map(repo => {
    // SIEMPRE incluir refreshInterval (obligatorio)
    const repoConfig = {
      url: repo.html_url,
      name: repo.name,
      backgroundColor: color || getRandomColor(),
      refreshInterval: refreshInterval !== null && refreshInterval !== undefined
        ? refreshInterval
        : defaultRefreshInterval
    };

    return repoConfig;
  });
}

async function checkArchivedRepos(octokit, repos) {
  console.log(`\n🔍 Verificando ${repos.length} repos para detectar archivados...`);
  console.log('⏳ Esto puede tardar varios minutos...\n');

  const archivedRepos = [];
  const activeRepos = [];
  let processed = 0;

  for (const repo of repos) {
    try {
      // Extraer owner y repo name de la URL
      const urlParts = repo.url.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repoName = urlParts[1];

      const { data } = await octokit.repos.get({
        owner,
        repo: repoName
      });

      processed++;

      if (data.archived) {
        archivedRepos.push(repo);
        console.log(`[${processed}/${repos.length}] 📦 ${repo.name} - ARCHIVADO`);
      } else {
        activeRepos.push(repo);
        // Mostrar progreso cada 100 repos activos
        if (processed % 100 === 0) {
          process.stdout.write(`\r[${processed}/${repos.length}] Procesando... (${archivedRepos.length} archivados encontrados)`);
        }
      }
    } catch (error) {
      processed++;
      // Si falla (repo eliminado, sin acceso, etc.), considerarlo para eliminación
      console.log(`\n[${processed}/${repos.length}] ❌ ${repo.name} - ERROR (${error.message})`);
      archivedRepos.push(repo);
    }
  }

  console.log('\n'); // Nueva línea al final

  return { archivedRepos, activeRepos };
}

async function main() {
  const config = parseArgs();

  if (config.help) {
    showHelp();
    process.exit(0);
  }

  // Obtener token de GitHub
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.error('❌ Error: No se encontró token de GitHub');
    console.error('Configura la variable de entorno GITHUB_TOKEN o GH_TOKEN');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  try {
    // Modo: Eliminar repos archivados
    if (config.removeArchived) {
      const reposJsonPath = path.join(__dirname, '../config/repos.json');

      if (!fs.existsSync(reposJsonPath)) {
        console.error('❌ Error: No se encontró repos.json');
        process.exit(1);
      }

      const content = fs.readFileSync(reposJsonPath, 'utf-8');
      const existingData = JSON.parse(content);

      if (!existingData.repos || existingData.repos.length === 0) {
        console.log('⚠️  No hay repos en repos.json');
        process.exit(0);
      }

      const { archivedRepos, activeRepos } = await checkArchivedRepos(octokit, existingData.repos);

      if (archivedRepos.length === 0) {
        console.log('\n✅ No se encontraron repos archivados');
        process.exit(0);
      }

      console.log(`\n📊 Resumen:`);
      console.log(`   ✅ Repos activos: ${activeRepos.length}`);
      console.log(`   📦 Repos archivados: ${archivedRepos.length}`);
      console.log(`\n🗑️  Eliminando repos archivados...`);

      // Guardar solo los repos activos
      const outputData = {
        defaultRefreshInterval: existingData.defaultRefreshInterval || 7200,
        repos: activeRepos
      };

      fs.writeFileSync(reposJsonPath, JSON.stringify(outputData, null, 2), 'utf-8');
      console.log(`\n✅ Archivo actualizado: ${reposJsonPath}`);
      console.log(`📊 Repos restantes: ${activeRepos.length}`);

      // Mostrar repos eliminados
      if (archivedRepos.length > 0) {
        console.log(`\n📦 Repos archivados eliminados:`);
        archivedRepos.forEach(repo => console.log(`   - ${repo.name}`));
      }

      process.exit(0);
    }

    // Modo normal: Buscar y añadir repos
    if (!config.pattern) {
      console.error('❌ Error: Debes especificar un patrón con --pattern');
      console.log('Usa --help para ver las opciones disponibles');
      process.exit(1);
    }

    // Buscar repos
    const repos = await fetchReposByPattern(octokit, config.org, config.pattern);

    if (repos.length === 0) {
      console.log('\n⚠️  No se encontraron repos que coincidan con el patrón');
      process.exit(0);
    }

    // Leer repos.json existente para obtener defaultRefreshInterval
    const reposJsonPath = path.join(__dirname, '../config/repos.json');
    let existingData = { repos: [], defaultRefreshInterval: 7200 };

    if (fs.existsSync(reposJsonPath)) {
      const content = fs.readFileSync(reposJsonPath, 'utf-8');
      existingData = JSON.parse(content);
      // Asegurar que defaultRefreshInterval existe
      if (!existingData.defaultRefreshInterval) {
        existingData.defaultRefreshInterval = 7200;
      }
    }

    // Convertir a formato de configuración (SIEMPRE con refreshInterval)
    const newRepos = convertToRepoConfig(
      repos,
      config.color,
      config.refreshInterval,
      existingData.defaultRefreshInterval
    );

    console.log(`📝 Todos los repos tendrán refreshInterval: ${config.refreshInterval !== null ? config.refreshInterval : existingData.defaultRefreshInterval}s`);

    // Combinar o reemplazar
    let finalRepos;
    if (config.add) {
      console.log(`\n➕ Añadiendo ${newRepos.length} repos a la lista existente`);

      // Evitar duplicados por URL
      const existingUrls = new Set((existingData.repos || []).map(r => r.url));
      const uniqueNewRepos = newRepos.filter(r => !existingUrls.has(r.url));

      finalRepos = [...(existingData.repos || []), ...uniqueNewRepos];
      console.log(`📝 ${uniqueNewRepos.length} repos nuevos añadidos (${newRepos.length - uniqueNewRepos.length} duplicados omitidos)`);
    } else {
      console.log(`\n⚠️  REEMPLAZANDO lista completa con ${newRepos.length} repos`);
      finalRepos = newRepos;
    }

    // Guardar SIEMPRE preservando defaultRefreshInterval
    const outputData = {
      defaultRefreshInterval: existingData.defaultRefreshInterval,
      repos: finalRepos
    };

    fs.writeFileSync(reposJsonPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(`\n✅ Archivo guardado: ${reposJsonPath}`);
    console.log(`📊 Total de repos en el archivo: ${finalRepos.length}`);

    // Mostrar muestra de los repos
    console.log('\n📋 Muestra de repos añadidos:');
    newRepos.slice(0, 5).forEach(repo => {
      console.log(`   - ${repo.name}`);
    });
    if (newRepos.length > 5) {
      console.log(`   ... y ${newRepos.length - 5} más`);
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
