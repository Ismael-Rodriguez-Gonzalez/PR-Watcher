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

      // Obtener detalles completos de cada PR (incluyendo comments, review_comments y reviews)
      const detailedPRs = await Promise.all(
        data.map(async (pr: any) => {
          try {
            const [prDetailResponse, reviewsResponse] = await Promise.all([
              this.octokit!.pulls.get({
                owner,
                repo: repoName,
                pull_number: pr.number
              }),
              this.octokit!.pulls.listReviews({
                owner,
                repo: repoName,
                pull_number: pr.number
              })
            ]);

            return {
              ...prDetailResponse.data,
              repository: repo,
              reviews: reviewsResponse.data,
              mergeable: prDetailResponse.data.mergeable,
              mergeable_state: prDetailResponse.data.mergeable_state
            };
          } catch (error) {
            console.error(`Error fetching details for PR #${pr.number}:`, error);
            // Si falla, usar los datos básicos
            return {
              ...pr,
              repository: repo,
              comments: 0,
              review_comments: 0,
              reviews: []
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

  // Función específica para cargar PRs para estadísticas (incluye todas las PRs: abiertas, cerradas, mergeadas)
  async getPullRequestsForStats(repo: Repository): Promise<PullRequest[]> {
    if (!this.octokit) {
      throw new Error('GitHub service not initialized. Please configure your token.');
    }

    // Extraer owner y repo de la URL
    const urlParts = repo.url.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repoName = urlParts[urlParts.length - 1];

    try {
      const { data } = await this.octokit.pulls.list({
        owner,
        repo: repoName,
        state: 'all', // Todas las PRs para estadísticas completas
        per_page: 100,
        sort: 'updated',
        direction: 'desc'
      });

      // Cargar reviews para cada PR (solo para estadísticas)
      const prsWithReviews = await Promise.all(
        data.map(async (pr: any) => {
          let reviews: any[] = [];
          try {
            const { data: reviewsData } = await this.octokit!.pulls.listReviews({
              owner,
              repo: repoName,
              pull_number: pr.number
            });
            reviews = reviewsData;
          } catch (error) {
            console.warn(`Error loading reviews for PR #${pr.number}:`, error);
            reviews = [];
          }

          return {
            id: pr.id,
            number: pr.number,
            title: pr.title,
            body: pr.body || '',
            state: pr.state,
            user: pr.user,
            assignees: pr.assignees || [],
            created_at: pr.created_at,
            updated_at: pr.updated_at,
            closed_at: pr.closed_at,
            merged_at: pr.merged_at,
            draft: pr.draft,
            base: pr.base,
            head: pr.head,
            repository: {
              id: pr.base.repo.id,
              name: repo.name,
              full_name: pr.base.repo.full_name,
              owner: pr.base.repo.owner,
              url: repo.url,
              backgroundColor: repo.backgroundColor
            },
            html_url: pr.html_url,
            mergeable: pr.mergeable,
            mergeable_state: pr.mergeable_state,
            comments: pr.comments || 0,
            review_comments: pr.review_comments || 0,
            reviews: reviews // Reviews reales cargadas desde la API
          };
        })
      );

      return prsWithReviews;
    } catch (error: any) {
      console.error(`Error fetching stats PRs for ${repo.name}:`, error);
      if (error.status === 403 && error.message.includes('SAML')) {
        throw new Error(`SAML enforcement error for ${repo.name}. Please authenticate via SAML.`);
      }
      throw error;
    }
  }

  async getAllPullRequestsForStats(repositories: Repository[]): Promise<PullRequest[]> {
    const promises = repositories.map(repo => this.getPullRequestsForStats(repo));
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
        console.error(`Failed to load stats PRs for ${repoName}:`, result.reason);
      }
    });

    // Si hay errores de SAML, lanzarlos para mostrar al usuario
    const samlErrors = errors.filter(e => e.includes('SAML'));
    if (samlErrors.length > 0) {
      throw new Error(samlErrors[0]);
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

export async function loadRepositories(): Promise<{ repos: Repository[]; defaultRefreshInterval: number }> {
  try {
    if (window.electronAPI) {
      return await window.electronAPI.loadRepositories();
    }
    console.error('electronAPI not available');
    return { repos: [], defaultRefreshInterval: 7200 };
  } catch (error) {
    console.error('Error loading repositories:', error);
    return { repos: [], defaultRefreshInterval: 7200 };
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
