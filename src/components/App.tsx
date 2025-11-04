import React, { useState, useEffect } from 'react';
import { PullRequest, Repository, User } from '../types';
import { githubService, loadConfig, loadRepositories, loadUsers } from '../services/github';
import { StatsService } from '../services/statsService';
import { PullRequestList } from './PullRequestList';
import { StatsModal } from './StatsModal';

// Funciones para manejar localStorage de repositorios seleccionados
const SELECTED_REPOS_KEY = 'pr-watcher-selected-repos';

const saveSelectedReposToStorage = (selectedRepos: Set<string>) => {
  try {
    const reposArray = Array.from(selectedRepos);
    localStorage.setItem(SELECTED_REPOS_KEY, JSON.stringify(reposArray));
  } catch (error) {
    console.warn('Error saving selected repos to localStorage:', error);
  }
};

const loadSelectedReposFromStorage = (): Set<string> | null => {
  try {
    const saved = localStorage.getItem(SELECTED_REPOS_KEY);
    if (saved) {
      const reposArray = JSON.parse(saved);
      return new Set(reposArray);
    }
  } catch (error) {
    console.warn('Error loading selected repos from localStorage:', error);
  }
  return null;
};

export const App: React.FC = () => {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [allPullRequestsForStats, setAllPullRequestsForStats] = useState<PullRequest[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [showRepoMenu, setShowRepoMenu] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const repoMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (repoMenuRef.current && !repoMenuRef.current.contains(event.target as Node)) {
        setShowRepoMenu(false);
      }
    };

    if (showRepoMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showRepoMenu]);

  const toggleRepo = (repoName: string) => {
    setSelectedRepos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(repoName)) {
        newSet.delete(repoName);
      } else {
        newSet.add(repoName);
      }
      // Guardar configuración en localStorage
      saveSelectedReposToStorage(newSet);
      return newSet;
    });
  };

  const toggleAllRepos = () => {
    let newSelectedRepos: Set<string>;
    if (selectedRepos.size === repositories.length) {
      newSelectedRepos = new Set();
    } else {
      newSelectedRepos = new Set(repositories.map(repo => repo.name));
    }
    setSelectedRepos(newSelectedRepos);
    // Guardar configuración en localStorage
    saveSelectedReposToStorage(newSelectedRepos);
  };

  const initializeApp = async () => {
    try {
      // Cargar configuración (ahora son funciones asíncronas)
      const config = await loadConfig();
      const repos = await loadRepositories();
      const availableUsers = await loadUsers();

      console.log('Config loaded:', { hasToken: !!config.githubToken, refreshInterval: config.refreshInterval });
      console.log('Repositories loaded:', repos);
      console.log('Users loaded:', availableUsers);

      setRepositories(repos);
      setUsers(availableUsers);

      // Cargar configuración guardada de repositorios seleccionados
      const savedSelectedRepos = loadSelectedReposFromStorage();
      if (savedSelectedRepos && savedSelectedRepos.size > 0) {
        // Filtrar solo los repositorios que aún existen
        const validSavedRepos = new Set(
          Array.from(savedSelectedRepos).filter(repoName =>
            repos.some(r => r.name === repoName)
          )
        );
        setSelectedRepos(validSavedRepos.size > 0 ? validSavedRepos : new Set(repos.map(r => r.name)));
      } else {
        // Si no hay configuración guardada, seleccionar todos por defecto
        setSelectedRepos(new Set(repos.map(r => r.name)));
      }

      if (!config.githubToken) {
        setError('Por favor, configura tu token de GitHub en config.json');
        setLoading(false);
        return;
      }

      // Inicializar servicio de GitHub
      githubService.initialize(config.githubToken);
      setInitialized(true);

      // Cargar PRs
      console.log('Starting to load pull requests...');
      await loadPullRequests(repos);

      // Configurar auto-refresh
      const interval = setInterval(() => {
        loadPullRequests(repos);
      }, config.refreshInterval * 1000);

      return () => clearInterval(interval);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(`Error al inicializar: ${err}`);
      setLoading(false);
    }
  };

  const loadPullRequests = async (repos: Repository[]) => {
    try {
      setLoading(true);
      console.log(`Loading PRs from ${repos.length} repositories...`);

      // Cargar PRs abiertas para la vista principal
      const openPrs = await githubService.getAllPullRequests(repos);
      console.log(`Open PRs loaded: ${openPrs.length}`);
      setPullRequests(openPrs);

      // Cargar todas las PRs para estadísticas (en paralelo)
      const allPrsForStats = await githubService.getAllPullRequestsForStats(repos);
      console.log(`All PRs for stats loaded: ${allPrsForStats.length}`);
      setAllPullRequestsForStats(allPrsForStats);

      setError(null);
    } catch (err) {
      console.error('Error loading PRs:', err);
      setError(`Error al cargar PRs: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatsOnly = async () => {
    try {
      console.log('Refreshing statistics data...');

      // Limpiar cache de métricas para forzar recálculo
      StatsService.clearCache();

      // Solo recargar datos para estadísticas (con reviews)
      const allPrsForStats = await githubService.getAllPullRequestsForStats(repositories);
      console.log(`Stats refreshed: ${allPrsForStats.length} PRs loaded`);
      setAllPullRequestsForStats(allPrsForStats);

    } catch (err) {
      console.error('Error refreshing stats:', err);
      throw err; // Re-throw para que el modal pueda manejar el error
    }
  };

  const handleAssignUser = async (pr: PullRequest, username: string) => {
    try {
      // Actualización optimista: actualizar el estado local inmediatamente
      setPullRequests(prevPRs =>
        prevPRs.map(p =>
          p.repository.name === pr.repository.name && p.number === pr.number
            ? {
                ...p,
                assignees: [
                  ...p.assignees.filter(assignee => assignee.login !== username), // Evitar duplicados
                  {
                    login: username,
                    avatar_url: `https://github.com/${username}.png` // URL por defecto
                  }
                ]
              }
            : p
        )
      );

      const urlParts = pr.repository.url.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repo = urlParts[1];

      await githubService.assignUserToPR(owner, repo, pr.number, [username]);

      // No recargar inmediatamente para evitar sobrescribir la actualización optimista
      // Los datos se sincronizarán en la próxima actualización automática
    } catch (err) {
      // En caso de error, revertir la actualización optimista
      await loadPullRequests(repositories);
      alert(`Error al asignar usuario: ${err}`);
    }
  };

  const handleRemoveAssignee = async (pr: PullRequest, username: string) => {
    try {
      // Actualización optimista: actualizar el estado local inmediatamente
      setPullRequests(prevPRs =>
        prevPRs.map(p =>
          p.repository.name === pr.repository.name && p.number === pr.number
            ? {
                ...p,
                assignees: p.assignees.filter(assignee => assignee.login !== username)
              }
            : p
        )
      );

      const urlParts = pr.repository.url.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repo = urlParts[1];

      await githubService.removeAssigneeFromPR(owner, repo, pr.number, [username]);

      // No recargar inmediatamente para evitar sobrescribir la actualización optimista
      // Los datos se sincronizarán en la próxima actualización automática
    } catch (err) {
      // En caso de error, revertir la actualización optimista
      await loadPullRequests(repositories);
      alert(`Error al eliminar asignación: ${err}`);
    }
  };

  if (error) {
    const isSamlError = error.includes('SAML') || error.includes('SSO');

    return (
      <div className="min-h-screen p-5 bg-github-gray-900 text-github-gray-100">
        <div className="bg-red-900/30 border border-red-600 rounded-github p-5 m-5">
          <h2 className="text-red-400 mb-2.5 text-lg">{isSamlError ? '🔐 Error de Autenticación SAML' : 'Error'}</h2>
          <p className="text-red-300">{error}</p>
          {isSamlError && (
            <div className="mt-5 p-4 bg-gray-800 rounded-github border-l-4 border-blue-500">
              <h3 className="text-blue-400 mb-2.5 text-base font-medium">¿Cómo solucionarlo?</h3>
              <ol className="my-2.5 pl-5 text-github-gray-100 list-decimal">
                <li className="my-2 leading-6">Ve a <strong className="text-white">GitHub → Settings → Developer settings → Personal access tokens</strong></li>
                <li className="my-2 leading-6">Busca tu token y haz click en <strong className="text-white">"Configure SSO"</strong></li>
                <li className="my-2 leading-6">Autoriza la organización <strong className="text-white">"masorange"</strong></li>
                <li className="my-2 leading-6">Reinicia esta aplicación</li>
              </ol>
              <p>
                <a href="https://docs.github.com/es/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-blue-400 underline">
                  Ver documentación completa de GitHub
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-github-gray-900 text-github-gray-100">
      <header className="flex justify-between items-center p-5 bg-github-gray-800 rounded-github mb-5">
        <h1 className="text-blue-400 text-2xl font-semibold">GitHub PR Watcher</h1>
        <div className="flex gap-5 items-center">
          <span className="px-4 py-2 bg-github-gray-700 rounded-github text-sm">
            {pullRequests.length} PRs
          </span>

          <button
            className="px-4 py-2 bg-github-green border border-green-600 text-white rounded-github cursor-pointer text-sm font-medium transition-all duration-200 flex items-center gap-1.5 hover:bg-green-600 hover:border-green-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-600/20 active:translate-y-0 active:shadow-md active:shadow-green-600/20"
            onClick={() => setShowStatsModal(true)}
            title="Ver estadísticas del equipo"
          >
            📊 Estadísticas
          </button>

          <div className="relative" ref={repoMenuRef}>
            <button
              className="px-4 py-2 bg-github-gray-700 border border-github-gray-600 text-white rounded-github cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-github-gray-600 hover:border-github-gray-500"
              onClick={() => setShowRepoMenu(!showRepoMenu)}
            >
              📁 {repositories.length} repositorios ({selectedRepos.size})
            </button>
            {showRepoMenu && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-github-gray-800 border border-github-gray-600 rounded-github shadow-github-lg z-50">
                <div className="p-3 border-b border-github-gray-600 flex justify-between items-center">
                  <strong className="text-sm">Filtrar por repositorio</strong>
                  <button
                    onClick={toggleAllRepos}
                    className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    {selectedRepos.size === repositories.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin">
                  {repositories.map(repo => {
                    const repoCount = pullRequests.filter(pr => pr.repository.name === repo.name).length;
                    return (
                      <label key={repo.name} className="flex items-center p-2 hover:bg-github-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRepos.has(repo.name)}
                          onChange={() => toggleRepo(repo.name)}
                          className="mr-2"
                        />
                        <span
                          className="px-2 py-1 rounded text-xs font-medium mr-2 text-white"
                          style={{
                            backgroundColor: repo.backgroundColor || '#30363d'
                          }}
                        >
                          {repo.name}
                        </span>
                        <span className="text-xs text-github-gray-400">({repoCount})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {loading && !initialized ? (
        <div className="text-center py-10 text-lg text-github-gray-400">Cargando...</div>
      ) : (
        <PullRequestList
          pullRequests={pullRequests}
          users={users}
          onAssignUser={handleAssignUser}
          onRemoveAssignee={handleRemoveAssignee}
          loading={loading}
          selectedRepos={selectedRepos}
        />
      )}

      <StatsModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        pullRequests={allPullRequestsForStats}
        users={users}
        repositories={repositories}
        onRefreshStats={refreshStatsOnly}
      />
    </div>
  );
};
