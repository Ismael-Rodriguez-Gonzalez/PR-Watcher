import React, { useState, useEffect } from 'react';
import { PullRequest, Repository, User } from '../types';
import { githubService, loadConfig, loadRepositories, loadUsers } from '../services/github';
import { StatsService } from '../services/statsService';
import { PullRequestList } from './PullRequestList';
import { StatsModal } from './StatsModal';
import './App.css';

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
      <div className="app">
        <div className="error">
          <h2>{isSamlError ? '🔐 Error de Autenticación SAML' : 'Error'}</h2>
          <p>{error}</p>
          {isSamlError && (
            <div className="error-help">
              <h3>¿Cómo solucionarlo?</h3>
              <ol>
                <li>Ve a <strong>GitHub → Settings → Developer settings → Personal access tokens</strong></li>
                <li>Busca tu token y haz click en <strong>"Configure SSO"</strong></li>
                <li>Autoriza la organización <strong>"masorange"</strong></li>
                <li>Reinicia esta aplicación</li>
              </ol>
              <p>
                <a href="https://docs.github.com/es/enterprise-cloud@latest/authentication/authenticating-with-saml-single-sign-on/authorizing-a-personal-access-token-for-use-with-saml-single-sign-on"
                   target="_blank"
                   rel="noopener noreferrer"
                   style={{ color: '#58a6ff', textDecoration: 'underline' }}>
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
    <div className="app">
      <header className="app-header">
        <h1>GitHub PR Watcher</h1>
        <div className="stats">
          <span>{pullRequests.length} PRs</span>

          <button
            className="stats-btn"
            onClick={() => setShowStatsModal(true)}
            title="Ver estadísticas del equipo"
          >
            📊 Estadísticas
          </button>

          <div className="repo-filter" ref={repoMenuRef}>
            <button
              className="repo-filter-btn"
              onClick={() => setShowRepoMenu(!showRepoMenu)}
            >
              📁 {repositories.length} repositorios ({selectedRepos.size})
            </button>
            {showRepoMenu && (
              <div className="repo-menu">
                <div className="repo-menu-header">
                  <strong>Filtrar por repositorio</strong>
                  <button onClick={toggleAllRepos} className="toggle-all-btn">
                    {selectedRepos.size === repositories.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="repo-list">
                  {repositories.map(repo => {
                    const repoCount = pullRequests.filter(pr => pr.repository.name === repo.name).length;
                    return (
                      <label key={repo.name} className="repo-item">
                        <input
                          type="checkbox"
                          checked={selectedRepos.has(repo.name)}
                          onChange={() => toggleRepo(repo.name)}
                        />
                        <span
                          className="repo-name"
                          style={{
                            backgroundColor: repo.backgroundColor || '#30363d',
                            color: '#ffffff'
                          }}
                        >
                          {repo.name}
                        </span>
                        <span className="repo-count">({repoCount})</span>
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
        <div className="loading">Cargando...</div>
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
