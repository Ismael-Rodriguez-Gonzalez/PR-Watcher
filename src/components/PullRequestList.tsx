import React, { useState } from 'react';
import { PullRequest, User } from '../types';
import { PullRequestItem } from './PullRequestItem';

interface Props {
  pullRequests: PullRequest[];
  users: User[];
  onAssignUser: (pr: PullRequest, username: string) => Promise<void>;
  onRemoveAssignee: (pr: PullRequest, username: string) => Promise<void>;
  onRefreshPR: (pr: PullRequest) => Promise<void>;
  prLastUpdate: Record<string, number>;
  loading: boolean;
  selectedRepos: Set<string>;
}

export const PullRequestList: React.FC<Props> = ({
  pullRequests,
  users,
  onAssignUser,
  onRemoveAssignee,
  onRefreshPR,
  prLastUpdate,
  loading,
  selectedRepos
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'draft'>('open');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'repo'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredPRs = pullRequests.filter(pr => {
    // Filtro por repositorio
    if (!selectedRepos.has(pr.repository.name)) return false;

    // Filtro por estado
    if (filter === 'open' && pr.draft) return false;
    if (filter === 'draft' && !pr.draft) return false;

    // Filtro adicional: solo sin asignar
    if (showUnassignedOnly && pr.assignees.length > 0) return false;

    // Filtro por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase().trim();

      // Extraer números del término de búsqueda (para "#424", "PR424", "424", etc.)
      const numberMatch = search.match(/\d+/);
      const hasNumbers = numberMatch !== null;

      // Si el término contiene números, buscar también por número de PR
      if (hasNumbers) {
        const numberPart = numberMatch[0];
        if (pr.number.toString().includes(numberPart)) {
          return true;
        }
      }

      // Si es solo números, priorizar búsqueda por número
      const isOnlyNumbers = /^\d+$/.test(search);
      if (isOnlyNumbers) {
        return pr.number.toString().includes(search);
      }

      // Búsqueda general en todos los campos
      return (
        pr.title.toLowerCase().includes(search) ||
        pr.user.login.toLowerCase().includes(search) ||
        pr.repository.name.toLowerCase().includes(search) ||
        pr.head.ref.toLowerCase().includes(search) ||
        pr.base.ref.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Filtrar PRs por repositorios seleccionados para calcular contadores correctos
  const prsFromSelectedRepos = pullRequests.filter(pr => selectedRepos.has(pr.repository.name));

  // Calcular contadores para los botones
  const totalCount = prsFromSelectedRepos.length;
  const openCount = prsFromSelectedRepos.filter(pr => !pr.draft).length;
  const draftCount = prsFromSelectedRepos.filter(pr => pr.draft).length;

  // Calcular contador de "sin asignar" según el filtro actual
  const getUnassignedCountForCurrentFilter = () => {
    let baseSet = prsFromSelectedRepos;

    // Aplicar filtro por estado según el filtro seleccionado
    if (filter === 'open') {
      baseSet = baseSet.filter(pr => !pr.draft);
    } else if (filter === 'draft') {
      baseSet = baseSet.filter(pr => pr.draft);
    }
    // Si filter === 'all', no aplicamos filtro adicional

    return baseSet.filter(pr => pr.assignees.length === 0).length;
  };

  const unassignedCount = getUnassignedCountForCurrentFilter();

  // Ordenar PRs
  const sortedPRs = [...filteredPRs].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'repo':
        comparison = a.repository.name.localeCompare(b.repository.name);
        break;
      default:
        comparison = 0;
    }

    // Invertir el orden si es ascendente
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  return (
    <div className="bg-github-gray-800 rounded-github p-5">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex gap-5 items-start flex-wrap">
          <div className="flex gap-2.5">
            <button
              className={`px-4 py-2 border border-github-gray-600 rounded-github cursor-pointer text-sm transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-blue-400 border-blue-400 text-white'
                  : 'bg-github-gray-700 text-github-gray-100 hover:bg-github-gray-600 hover:border-blue-400'
              }`}
              onClick={() => setFilter('all')}
            >
              Todas ({totalCount})
            </button>
            <button
              className={`px-4 py-2 border border-github-gray-600 rounded-github cursor-pointer text-sm transition-all duration-200 ${
                filter === 'open'
                  ? 'bg-blue-400 border-blue-400 text-white'
                  : 'bg-github-gray-700 text-github-gray-100 hover:bg-github-gray-600 hover:border-blue-400'
              }`}
              onClick={() => setFilter('open')}
            >
              Abiertas ({openCount})
            </button>
            <button
              className={`px-4 py-2 border border-github-gray-600 rounded-github cursor-pointer text-sm transition-all duration-200 ${
                filter === 'draft'
                  ? 'bg-blue-400 border-blue-400 text-white'
                  : 'bg-github-gray-700 text-github-gray-100 hover:bg-github-gray-600 hover:border-blue-400'
              }`}
              onClick={() => setFilter('draft')}
            >
              Draft ({draftCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-github-gray-400 text-sm whitespace-nowrap">Ordenar por:</label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'repo')}
              className="px-3 py-2 bg-github-gray-900 border border-github-gray-600 rounded-github text-github-gray-100 text-sm cursor-pointer min-w-[180px] focus:outline-none focus:border-blue-400 hover:bg-github-gray-800"
            >
              <option value="date">Fecha</option>
              <option value="title">Título</option>
              <option value="repo">Repositorio</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 bg-github-gray-700 border border-github-gray-600 rounded-github text-github-gray-100 text-lg font-bold cursor-pointer transition-all duration-200 min-w-[40px] hover:bg-github-gray-600 hover:border-blue-400 active:scale-95"
              title={sortOrder === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer text-sm text-github-gray-100 select-none hover:text-blue-300">
            <input
              type="checkbox"
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="cursor-pointer w-4 h-4"
            />
            Solo sin asignar ({unassignedCount})
          </label>
        </div>

        <input
          type="text"
          placeholder="Buscar por título, autor, repositorio, rama o #número (ej: 424, #424, PR424)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[300px] px-4 py-2 bg-github-gray-900 border border-github-gray-600 rounded-github text-github-gray-100 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {loading && (
        <div className="text-center py-2.5 bg-blue-600 rounded-github mb-2.5 text-white">
          Actualizando...
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sortedPRs.length === 0 ? (
          <div className="text-center py-15 px-5 text-github-gray-400 text-base">
            No se encontraron pull requests
          </div>
        ) : (
          sortedPRs.map(pr => {
            const prKey = `${pr.repository.url}:${pr.number}`;
            const lastUpdate = prLastUpdate[prKey];
            return (
              <PullRequestItem
                key={`${pr.repository.name}-${pr.number}`}
                pullRequest={pr}
                users={users}
                onAssignUser={onAssignUser}
                onRemoveAssignee={onRemoveAssignee}
                onRefreshPR={onRefreshPR}
                lastUpdateTimestamp={lastUpdate}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
