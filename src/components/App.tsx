import React, { useState, useEffect } from 'react';
import { PullRequest, Repository, User } from '../types';
import { githubService, loadConfig, loadRepositories, loadUsers } from '../services/github';
import { StatsService } from '../services/statsService';
import { PullRequestList } from './PullRequestList';
import { StatsModal } from './StatsModal';
import { TokenSetupModal } from './TokenSetupModal';
import { SettingsModal } from './SettingsModal';

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
  const [showTokenSetup, setShowTokenSetup] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentConfig, setCurrentConfig] = useState({ githubToken: '', refreshInterval: 60 });
  const [defaultRefreshInterval, setDefaultRefreshInterval] = useState(7200); // 2 horas por defecto
  const [repoLastUpdate, setRepoLastUpdate] = useState<Record<string, number>>({}); // Timestamps de última actualización
  const [prLastUpdate, setPrLastUpdate] = useState<Record<string, number>>({}); // Timestamps de última actualización por PR (key: repo.url:pr.number)
  const [repoSearchFilter, setRepoSearchFilter] = useState(''); // Filtro de búsqueda para repos
  const [refreshingRepos, setRefreshingRepos] = useState<Set<string>>(new Set()); // Repos que se están actualizando
  const repoMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (repoMenuRef.current && !repoMenuRef.current.contains(event.target as Node)) {
        setShowRepoMenu(false);
        setRepoSearchFilter(''); // Limpiar filtro al cerrar
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

  const formatTimeSinceUpdate = (timestamp: number | undefined): string => {
    if (!timestamp) return 'Nunca';

    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const initializeApp = async () => {
    try {
      // Cargar configuración (ahora son funciones asíncronas)
      const config = await loadConfig();
      const { repos, defaultRefreshInterval } = await loadRepositories();
      const availableUsers = await loadUsers();
      const repoState = await window.electronAPI.loadRepoState();

      console.log('Config loaded:', { hasToken: !!config.githubToken, refreshInterval: config.refreshInterval });
      console.log('Repositories loaded:', repos.length);
      console.log('Default refresh interval:', defaultRefreshInterval);
      console.log('Users loaded:', availableUsers);
      console.log('Repo state loaded:', Object.keys(repoState.lastUpdates || {}).length, 'repos');

      setCurrentConfig(config);
      setDefaultRefreshInterval(defaultRefreshInterval);
      setRepositories(repos);
      setUsers(availableUsers);

      // Cargar timestamps persistidos
      setRepoLastUpdate(repoState.lastUpdates || {});

      // Cargar PRs cacheadas si existen
      if (repoState.cachedPRs && Object.keys(repoState.cachedPRs).length > 0) {
        const cachedPRsList = Object.values(repoState.cachedPRs).flat();
        console.log('[Cache] Loading', cachedPRsList.length, 'cached PRs from previous session');
        setPullRequests(cachedPRsList);
        setLoading(false); // Mostrar PRs cacheadas inmediatamente
      }

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
        setShowTokenSetup(true);
        setLoading(false);
        return;
      }

      // Inicializar servicio de GitHub
      githubService.initialize(config.githubToken);
      setInitialized(true);

      // Cargar PRs (forzar refresco inicial)
      console.log('Starting to load pull requests...');
      await loadPullRequests(repos, true);

      // Configurar auto-refresh (verificar cada 30 segundos qué repos necesitan actualización)
      const interval = setInterval(() => {
        loadPullRequests(repos, false);
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(`Error al inicializar: ${err}`);
      setLoading(false);
    }
  };

  const loadPullRequests = async (repos: Repository[], forceRefresh = false) => {
    try {
      const now = Date.now();
      const MAX_REPOS_PER_CYCLE = 50; // Limitar repos por ciclo para evitar spikes

      // Determinar qué repos necesitan actualización
      let reposToUpdate = repos.filter(repo => {
        if (forceRefresh) return true;

        const lastUpdate = repoLastUpdate[repo.url] || 0;
        // Cada repo debe tener refreshInterval, fallback a 7200 por seguridad
        const repoInterval = (repo.refreshInterval || 7200) * 1000; // Convertir a ms

        // Añadir jitter (±10% aleatorio) para evitar sincronización
        const jitter = (Math.random() * 0.2 - 0.1) * repoInterval; // -10% a +10%
        const effectiveInterval = repoInterval + jitter;

        const shouldUpdate = (now - lastUpdate) >= effectiveInterval;

        if (shouldUpdate) {
          console.log(`[Refresh] ${repo.name} needs update (last: ${Math.floor((now - lastUpdate) / 1000)}s ago, interval: ${Math.floor(effectiveInterval / 1000)}s)`);
        }

        return shouldUpdate;
      });

      // Limitar cantidad de repos a actualizar por ciclo
      if (reposToUpdate.length > MAX_REPOS_PER_CYCLE) {
        console.log(`[Refresh] Limiting update to ${MAX_REPOS_PER_CYCLE} repos (${reposToUpdate.length} pending)`);
        reposToUpdate = reposToUpdate.slice(0, MAX_REPOS_PER_CYCLE);
      }

      if (reposToUpdate.length === 0 && !forceRefresh) {
        console.log('[Refresh] No repositories need update at this time');
        return;
      }

      setLoading(reposToUpdate.length > 10); // Solo mostrar loading si son muchos repos
      console.log(`[Refresh] Loading PRs from ${reposToUpdate.length}/${repos.length} repositories...`);

      // Cargar PRs solo de los repos que necesitan actualización
      const newOpenPrs = await githubService.getAllPullRequests(reposToUpdate);
      console.log(`[Refresh] New PRs loaded: ${newOpenPrs.length}`);

      // Actualizar timestamps de PRs individuales
      const prTimestamps: Record<string, number> = {};
      newOpenPrs.forEach(pr => {
        const prKey = `${pr.repository.url}:${pr.number}`;
        prTimestamps[prKey] = now;
      });

      setPrLastUpdate(prev => ({
        ...prev,
        ...prTimestamps
      }));

      // Combinar con PRs existentes de repos que no se actualizaron
      setPullRequests(prevPRs => {
        // Filtrar PRs de repos que se están actualizando
        const repoNamesToUpdate = new Set(reposToUpdate.map(r => r.name));
        const unchangedPRs = prevPRs.filter(pr => !repoNamesToUpdate.has(pr.repository.name));

        // Combinar PRs no cambiadas con las nuevas
        const updatedPRs = [...unchangedPRs, ...newOpenPrs];

        // Guardar PRs en cache organizadas por repo
        const prsByRepo: Record<string, PullRequest[]> = {};
        updatedPRs.forEach(pr => {
          if (!prsByRepo[pr.repository.url]) {
            prsByRepo[pr.repository.url] = [];
          }
          prsByRepo[pr.repository.url].push(pr);
        });

        return updatedPRs;
      });

      // Actualizar timestamps con distribución aleatoria en primer refresco
      setRepoLastUpdate(prev => {
        const updated = { ...prev };
        reposToUpdate.forEach(repo => {
          if (forceRefresh && !prev[repo.url]) {
            // Primera carga: distribuir aleatoriamente dentro del intervalo
            const repoInterval = (repo.refreshInterval || 7200) * 1000;
            const randomOffset = Math.random() * repoInterval;
            updated[repo.url] = now - randomOffset;
            console.log(`[Init] ${repo.name} (${repo.refreshInterval || 7200}s) scheduled for next update in ${Math.floor(randomOffset / 1000)}s`);
          } else {
            // Actualización normal
            updated[repo.url] = now;
          }
        });

        return updated;
      });

      // Guardar estado persistente (necesitamos esperar a que setPullRequests termine)
      // Usamos setTimeout para asegurar que el estado se actualice primero
      setTimeout(() => {
        setPullRequests(currentPRs => {
          // Organizar PRs por repo para guardar en cache
          const prsByRepo: Record<string, PullRequest[]> = {};
          currentPRs.forEach(pr => {
            if (!prsByRepo[pr.repository.url]) {
              prsByRepo[pr.repository.url] = [];
            }
            prsByRepo[pr.repository.url].push(pr);
          });

          // Guardar timestamps y PRs cacheadas
          setRepoLastUpdate(currentTimestamps => {
            window.electronAPI.saveRepoState({
              lastUpdates: currentTimestamps,
              cachedPRs: prsByRepo
            }).catch(err => {
              console.warn('[Refresh] Error saving repo state:', err);
            });
            return currentTimestamps;
          });

          return currentPRs;
        });
      }, 0);

      setError(null);
    } catch (err) {
      console.error('[Refresh] Error loading PRs:', err);
      setError(`Error al cargar PRs: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshSingleRepo = async (repo: Repository) => {
    try {
      setRefreshingRepos(prev => new Set(prev).add(repo.url));
      console.log(`[Manual Refresh] Updating ${repo.name}...`);

      // Cargar PRs del repositorio específico
      const newPRs = await githubService.getPullRequests(repo);
      console.log(`[Manual Refresh] ${newPRs.length} PRs loaded for ${repo.name}`);

      // Actualizar lista de PRs (reemplazar PRs de este repo)
      setPullRequests(prevPRs => {
        const otherPRs = prevPRs.filter(pr => pr.repository.url !== repo.url);
        return [...otherPRs, ...newPRs];
      });

      // Actualizar timestamp
      const now = Date.now();
      setRepoLastUpdate(prev => {
        const updated = { ...prev, [repo.url]: now };
        return updated;
      });

      // Guardar estado persistente con PRs actualizadas
      setTimeout(() => {
        setPullRequests(currentPRs => {
          // Organizar PRs por repo para guardar en cache
          const prsByRepo: Record<string, PullRequest[]> = {};
          currentPRs.forEach(pr => {
            if (!prsByRepo[pr.repository.url]) {
              prsByRepo[pr.repository.url] = [];
            }
            prsByRepo[pr.repository.url].push(pr);
          });

          // Guardar timestamps y PRs cacheadas
          setRepoLastUpdate(currentTimestamps => {
            window.electronAPI.saveRepoState({
              lastUpdates: currentTimestamps,
              cachedPRs: prsByRepo
            }).catch(err => {
              console.warn('[Manual Refresh] Error saving repo state:', err);
            });
            return currentTimestamps;
          });

          return currentPRs;
        });
      }, 0);

      console.log(`[Manual Refresh] ${repo.name} updated successfully`);
    } catch (err) {
      console.error(`[Manual Refresh] Error updating ${repo.name}:`, err);
      alert(`Error al actualizar ${repo.name}: ${err}`);
    } finally {
      setRefreshingRepos(prev => {
        const newSet = new Set(prev);
        newSet.delete(repo.url);
        return newSet;
      });
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
      await loadPullRequests(repositories, true);
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
      await loadPullRequests(repositories, true);
      alert(`Error al eliminar asignación: ${err}`);
    }
  };

  const refreshSinglePR = async (pr: PullRequest): Promise<void> => {
    try {
      console.log(`[Manual Refresh] Updating PR #${pr.number} from ${pr.repository.name}...`);

      // Cargar los datos actualizados de la PR
      const updatedPR = await githubService.getSinglePullRequest(pr.repository, pr.number);

      // Actualizar timestamp de esta PR
      const prKey = `${pr.repository.url}:${pr.number}`;
      const now = Date.now();
      setPrLastUpdate(prev => ({
        ...prev,
        [prKey]: now
      }));

      // Si la PR está cerrada, removerla de la lista
      if (updatedPR.state === 'closed') {
        setPullRequests(prevPRs =>
          prevPRs.filter(p =>
            !(p.repository.url === pr.repository.url && p.number === pr.number)
          )
        );
        console.log(`[Manual Refresh] PR #${pr.number} is now closed and has been removed from the list`);
        alert(`La PR #${pr.number} está cerrada y ha sido eliminada de la lista.`);
      } else {
        // Actualizar solo esta PR en el estado
        setPullRequests(prevPRs =>
          prevPRs.map(p =>
            p.repository.url === pr.repository.url && p.number === pr.number
              ? updatedPR
              : p
          )
        );
        console.log(`[Manual Refresh] PR #${pr.number} updated successfully`);
      }
    } catch (err) {
      console.error(`[Manual Refresh] Error updating PR #${pr.number}:`, err);
      throw err; // Re-lanzar el error para que el componente pueda manejarlo
    }
  };

  const handleTokenSaved = async (token: string) => {
    setShowTokenSetup(false);
    setLoading(true);

    try {
      // Inicializar servicio de GitHub con el nuevo token
      githubService.initialize(token);
      setInitialized(true);

      // Cargar PRs (forzar refresco)
      console.log('Starting to load pull requests with new token...');
      await loadPullRequests(repositories, true);

      // Configurar auto-refresh
      const config = await loadConfig();
      setCurrentConfig(config);
      const interval = setInterval(() => {
        loadPullRequests(repositories, false);
      }, 30000); // 30 segundos

      return () => clearInterval(interval);
    } catch (err) {
      console.error('Error initializing with new token:', err);
      setError(`Error al inicializar con el token: ${err}`);
      setLoading(false);
    }
  };

  const handleSettingsSaved = async (config: { githubToken: string; refreshInterval: number }) => {
    setLoading(true);

    try {
      // Actualizar configuración en el estado
      setCurrentConfig(config);

      // Reinicializar servicio de GitHub con el nuevo token
      githubService.initialize(config.githubToken);
      setInitialized(true);

      // Recargar PRs (forzar refresco)
      console.log('Reloading pull requests with updated config...');
      await loadPullRequests(repositories, true);

      setError(null);
    } catch (err) {
      console.error('Error applying new config:', err);
      setError(`Error al aplicar la configuración: ${err}`);
    } finally {
      setLoading(false);
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

          <button
            className="px-4 py-2 bg-github-gray-700 border border-github-gray-600 text-white rounded-github cursor-pointer text-sm font-medium transition-all duration-200 flex items-center gap-1.5 hover:bg-github-gray-600 hover:border-github-gray-500"
            onClick={() => setShowSettingsModal(true)}
            title="Configuración"
          >
            ⚙️ Configuración
          </button>

          <div className="relative" ref={repoMenuRef}>
            <button
              className="px-4 py-2 bg-github-gray-700 border border-github-gray-600 text-white rounded-github cursor-pointer text-sm font-medium transition-all duration-200 hover:bg-github-gray-600 hover:border-github-gray-500"
              onClick={() => setShowRepoMenu(!showRepoMenu)}
            >
              📁 {repositories.length} repositorios ({selectedRepos.size})
            </button>
{showRepoMenu && (
              <div ref={repoMenuRef} className="absolute right-0 top-full mt-2 w-80 bg-github-gray-800 border border-github-gray-600 rounded-github shadow-github-lg z-50">
                <div className="p-3 border-b border-github-gray-600 flex justify-between items-center">
                  <strong className="text-sm">Filtrar por repositorio</strong>
                  <button
                    onClick={toggleAllRepos}
                    className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    {selectedRepos.size === repositories.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="p-2 border-b border-github-gray-600">
                  <input
                    type="text"
                    placeholder="Buscar repositorio..."
                    value={repoSearchFilter}
                    onChange={(e) => setRepoSearchFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-github-gray-900 border border-github-gray-600 rounded text-sm text-white placeholder-github-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin">
{repositories
                    .filter(repo =>
                      repo.name.toLowerCase().includes(repoSearchFilter.toLowerCase()) ||
                      repo.url.toLowerCase().includes(repoSearchFilter.toLowerCase())
                    )
                    .map(repo => {
                      const repoCount = pullRequests.filter(pr => pr.repository.name === repo.name).length;
                      const isRefreshing = refreshingRepos.has(repo.url);
                      const lastUpdate = repoLastUpdate[repo.url];
                      const timeSinceUpdate = formatTimeSinceUpdate(lastUpdate);
                      return (
                        <div key={repo.name} className="flex items-center p-2 hover:bg-github-gray-700 group">
                          <label className="flex items-center flex-1 cursor-pointer">
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
                            <span className="text-xs text-github-gray-400 mr-2">({repoCount})</span>
                            <span className="text-xs text-github-gray-500" title={`Última actualización: ${lastUpdate ? new Date(lastUpdate).toLocaleString() : 'Nunca'}`}>
                              {timeSinceUpdate}
                            </span>
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              refreshSingleRepo(repo);
                            }}
                            disabled={isRefreshing}
                            className={`ml-2 p-1 rounded text-xs transition-all ${
                              isRefreshing
                                ? 'text-github-gray-500 cursor-not-allowed'
                                : 'text-github-gray-400 hover:text-blue-400 hover:bg-github-gray-600 cursor-pointer'
                            }`}
                            title="Actualizar repositorio"
                          >
                            <span className={isRefreshing ? 'animate-spin inline-block' : ''}>
                              🔄
                            </span>
                          </button>
                        </div>
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
          onRefreshPR={refreshSinglePR}
          prLastUpdate={prLastUpdate}
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

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSettingsSaved}
        currentConfig={currentConfig}
      />

      {showTokenSetup && (
        <TokenSetupModal onTokenSaved={handleTokenSaved} />
      )}
    </div>
  );
};
