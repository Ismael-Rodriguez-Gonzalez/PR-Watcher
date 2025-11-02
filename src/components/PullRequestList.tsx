import React, { useState } from 'react';
import { PullRequest, User, Repository } from '../types';
import { PullRequestItem } from './PullRequestItem';
import './PullRequestList.css';

interface Props {
  pullRequests: PullRequest[];
  repositories: Repository[];
  users: User[];
  onAssignUser: (pr: PullRequest, username: string) => Promise<void>;
  onRemoveAssignee: (pr: PullRequest, username: string) => Promise<void>;
  loading: boolean;
  selectedRepos: Set<string>;
}

export const PullRequestList: React.FC<Props> = ({
  pullRequests,
  repositories,
  users,
  onAssignUser,
  onRemoveAssignee,
  loading,
  selectedRepos
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'draft' | 'unassigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'repo'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredPRs = pullRequests.filter(pr => {
    // Filtro por repositorio
    if (!selectedRepos.has(pr.repository.name)) return false;

    // Filtro por estado
    if (filter === 'open' && pr.draft) return false;
    if (filter === 'draft' && !pr.draft) return false;
    if (filter === 'unassigned' && pr.assignees.length > 0) return false;

    // Filtro por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
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
    <div className="pr-list-container">
      <div className="filters">
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Todas ({pullRequests.length})
          </button>
          <button
            className={filter === 'open' ? 'active' : ''}
            onClick={() => setFilter('open')}
          >
            Abiertas ({pullRequests.filter(pr => !pr.draft).length})
          </button>
          <button
            className={filter === 'draft' ? 'active' : ''}
            onClick={() => setFilter('draft')}
          >
            Draft ({pullRequests.filter(pr => pr.draft).length})
          </button>
          <button
            className={filter === 'unassigned' ? 'active' : ''}
            onClick={() => setFilter('unassigned')}
          >
            Sin asignar ({pullRequests.filter(pr => pr.assignees.length === 0).length})
          </button>
        </div>

        <div className="sort-controls">
          <label htmlFor="sort-select">Ordenar por:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'title' | 'repo')}
            className="sort-select"
          >
            <option value="date">Fecha</option>
            <option value="title">Título</option>
            <option value="repo">Repositorio</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="sort-order-btn"
            title={sortOrder === 'desc' ? 'Más reciente primero' : 'Más antiguo primero'}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>

        <input
          type="text"
          placeholder="Buscar por título, autor, repositorio o rama..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading && (
        <div className="loading-overlay">Actualizando...</div>
      )}

      <div className="pr-list">
        {sortedPRs.length === 0 ? (
          <div className="empty-state">
            No se encontraron pull requests
          </div>
        ) : (
          sortedPRs.map(pr => (
            <PullRequestItem
              key={`${pr.repository.name}-${pr.number}`}
              pullRequest={pr}
              users={users}
              onAssignUser={onAssignUser}
              onRemoveAssignee={onRemoveAssignee}
            />
          ))
        )}
      </div>
    </div>
  );
};
