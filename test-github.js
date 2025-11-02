const { Octokit } = require('@octokit/rest');
const fs = require('fs');

// Leer configuración
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const repos = JSON.parse(fs.readFileSync('./repos.json', 'utf-8'));

console.log('Token:', config.githubToken ? '✅ Configurado' : '❌ Falta');
console.log('Repositorios:', repos.repos.length);

const octokit = new Octokit({ auth: config.githubToken });

async function testAll() {
  let totalPRs = 0;

  for (const repo of repos.repos) {
    const urlParts = repo.url.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repoName = urlParts[urlParts.length - 1];

    try {
      const { data } = await octokit.pulls.list({
        owner,
        repo: repoName,
        state: 'open',
        per_page: 100
      });

      console.log(`✅ ${repo.name}: ${data.length} PRs`);
      totalPRs += data.length;

      // Mostrar un ejemplo de PR
      if (data.length > 0) {
        const pr = data[0];
        console.log(`   Ejemplo: #${pr.number} - ${pr.title.substring(0, 50)}...`);
        console.log(`   Autor: ${pr.user.login}`);
        console.log(`   Draft: ${pr.draft ? 'Sí' : 'No'}`);
      }
    } catch (error) {
      console.error(`❌ ${repo.name}:`, error.message);
    }
  }

  console.log(`\n📊 Total: ${totalPRs} PRs encontrados`);
}

testAll().catch(console.error);
