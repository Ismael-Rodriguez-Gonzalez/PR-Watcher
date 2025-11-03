import React, { useState, useEffect } from 'react';
import { PullRequest, Repository, User } from '../types';
import { githubService, loadConfig, loadRepositories, loadUsers } from '../services/github';
import { PullRequestList } from './PullRequestList';
import './App.css';

export const App: React.FC = () => {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [showRepoMenu, setShowRepoMenu] = useState(false);
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
      return newSet;
    });
  };

  const toggleAllRepos = () => {
    if (selectedRepos.size === repositories.length) {
      setSelectedRepos(new Set());
    } else {
      setSelectedRepos(new Set(repositories.map(repo => repo.name)));
    }
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

      // Inicializar repos seleccionados con todos
      setSelectedRepos(new Set(repos.map(r => r.name)));

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
      const prs = await githubService.getAllPullRequests(repos);
      console.log(`Total PRs loaded: ${prs.length}`, prs);
      setPullRequests(prs);
      setError(null);
    } catch (err) {
      console.error('Error loading PRs:', err);
      setError(`Error al cargar PRs: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (pr: PullRequest, username: string) => {
    try {
      const urlParts = pr.repository.url.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repo = urlParts[1];

      await githubService.assignUserToPR(owner, repo, pr.number, [username]);

      // Recargar PRs
      await loadPullRequests(repositories);
    } catch (err) {
      alert(`Error al asignar usuario: ${err}`);
    }
  };

  const handleRemoveAssignee = async (pr: PullRequest, username: string) => {
    try {
      const urlParts = pr.repository.url.replace('https://github.com/', '').split('/');
      const owner = urlParts[0];
      const repo = urlParts[1];

      await githubService.removeAssigneeFromPR(owner, repo, pr.number, [username]);

      // Recargar PRs
      await loadPullRequests(repositories);
    } catch (err) {
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
    </div>
  );
};
