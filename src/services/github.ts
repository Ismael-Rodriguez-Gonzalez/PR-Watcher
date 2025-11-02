import { Octokit } from '@octokit/rest';
import { Repository, PullRequest, Config, User } from '../types';

class GitHubService {
  private octokit: Octokit | null = null;

  initialize(token: string) {
    this.octokit = new Octokit({
      auth: token
    });
  }

  async getPullRequests(repo: Repository): Promise<PullRequest[]> {
    if (!this.octokit) {
      throw new Error('GitHub service not initialized. Please configure your token.');
    }

    // Extraer owner y repo de la URL
    const urlParts = repo.url.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repoName = urlParts[urlParts.length - 1]; // Tomar el último elemento por si hay más partes

    console.log(`Fetching PRs for ${owner}/${repoName} (${repo.name})`);

    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo: repoName,
        state: 'open',
        per_page: 100
      });

      console.log(`Found ${data.length} PRs for ${repo.name}`);

      // Obtener detalles completos de cada PR (incluyendo comments y review_comments)
      const detailedPRs = await Promise.all(
        data.map(async (pr: any) => {
          try {
            const { data: prDetail } = await this.octokit!.pulls.get({
              owner,
              repo: repoName,
              pull_number: pr.number
            });
            return {
              ...prDetail,
              repository: repo
            };
          } catch (error) {
            console.error(`Error fetching details for PR #${pr.number}:`, error);
            // Si falla, usar los datos básicos
            return {
              ...pr,
              repository: repo,
              comments: 0,
              review_comments: 0
            };
          }
        })
      );

      return detailedPRs as PullRequest[];
    } catch (error: any) {
      console.error(`Error fetching PRs for ${repo.name}:`, error.message || error);
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data:`, error.response.data);
      }

      // Re-lanzar errores de autenticación SAML para mostrarlos al usuario
      if (error.message && error.message.includes('SAML')) {
        throw new Error(`⚠️ Token no autorizado para ${owner}/${repoName}. Necesitas autorizar tu token para la organización en GitHub Settings → Developer settings → Personal access tokens → Configure SSO`);
      }

      return [];
    }
  }

  async getAllPullRequests(repositories: Repository[]): Promise<PullRequest[]> {
    const promises = repositories.map(repo => this.getPullRequests(repo));
    const results = await Promise.allSettled(promises);

    // Filtrar resultados exitosos y mostrar errores
    const prs: PullRequest[] = [];
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        prs.push(...result.value);
      } else {
        const repoName = repositories[index].name;
        errors.push(`${repoName}: ${result.reason.message}`);
        console.error(`Failed to load PRs for ${repoName}:`, result.reason);
      }
    });

    // Si hay errores de SAML, lanzarlos para mostrar al usuario
    const samlErrors = errors.filter(e => e.includes('SAML'));
    if (samlErrors.length > 0) {
      throw new Error(samlErrors[0]); // Mostrar el primer error SAML
    }

    return prs;
  }

  async assignUserToPR(
    owner: string,
    repo: string,
    prNumber: number,
    usernames: string[]
  ): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub service not initialized');
    }

    await this.octokit.issues.addAssignees({
      owner,
      repo,
      issue_number: prNumber,
      assignees: usernames
    });
  }

  async removeAssigneeFromPR(
    owner: string,
    repo: string,
    prNumber: number,
    usernames: string[]
  ): Promise<void> {
    if (!this.octokit) {
      throw new Error('GitHub service not initialized');
    }

    await this.octokit.issues.removeAssignees({
      owner,
      repo,
      issue_number: prNumber,
      assignees: usernames
    });
  }
}

export const githubService = new GitHubService();

// Funciones para leer configuración usando Electron IPC
export async function loadConfig(): Promise<Config> {
  try {
    if (window.electronAPI) {
      return await window.electronAPI.loadConfig();
    }
    // Fallback para desarrollo web sin Electron
    console.error('electronAPI not available');
    return { githubToken: '', refreshInterval: 60 };
  } catch (error) {
    console.error('Error loading config:', error);
    return { githubToken: '', refreshInterval: 60 };
  }
}

export async function loadRepositories(): Promise<Repository[]> {
  try {
    if (window.electronAPI) {
      return await window.electronAPI.loadRepositories();
    }
    console.error('electronAPI not available');
    return [];
  } catch (error) {
    console.error('Error loading repositories:', error);
    return [];
  }
}

export async function loadUsers(): Promise<User[]> {
  try {
    if (window.electronAPI) {
      return await window.electronAPI.loadUsers();
    }
    console.error('electronAPI not available');
    return [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}
