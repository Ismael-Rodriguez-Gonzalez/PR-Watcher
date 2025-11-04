import React, { useState, useMemo } from 'react';
import { StatsService, TIME_RANGES } from '../services/statsService';
import './StatsModal.css';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pullRequests: any[]; // PRs para estadísticas (todas: abiertas + cerradas)
  users: any[];
  repositories: any[];
  onRefreshStats: () => Promise<void>; // Función para refrescar estadísticas
}

type StatsTab = 'overview' | 'users' | 'repos';

type SortField = 'name' | 'prsCreated' | 'reviewsGiven' | 'approvalsGiven' | 'prsAssigned' | 'oldestPrDays';
type SortDirection = 'asc' | 'desc';

export const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, pullRequests, users, repositories, onRefreshStats }) => {
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [sortField, setSortField] = useState<SortField>('prsCreated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Función para refrescar estadísticas
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshStats();
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calcular métricas usando el servicio
  const overviewStats = useMemo(() =>
    StatsService.calculateOverviewStats(pullRequests, timeRange),
    [pullRequests, timeRange]
  );

  const userStats = useMemo(() =>
    StatsService.calculateUserStats(pullRequests, users, timeRange),
    [pullRequests, users, timeRange]
  );

  const repoStats = useMemo(() =>
    StatsService.calculateRepoStats(pullRequests, repositories, timeRange),
    [pullRequests, repositories, timeRange]
  );

  // Función para manejar el ordenamiento
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Ordenar usuarios según el campo y dirección seleccionados
  const sortedUserStats = useMemo(() => {
    return [...userStats].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'prsCreated':
          aValue = a.prsCreated;
          bValue = b.prsCreated;
          break;
        case 'reviewsGiven':
          aValue = a.reviewsGiven;
          bValue = b.reviewsGiven;
          break;
        case 'approvalsGiven':
          aValue = a.approvalsGiven;
          bValue = b.approvalsGiven;
          break;
        case 'prsAssigned':
          aValue = a.prsAssigned;
          bValue = b.prsAssigned;
          break;
        case 'oldestPrDays':
          aValue = a.oldestPrDays;
          bValue = b.oldestPrDays;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [userStats, sortField, sortDirection]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const tabs = [
    { id: 'overview' as StatsTab, label: 'Resumen', icon: '📊' },
    { id: 'users' as StatsTab, label: 'Por Usuario', icon: '👥' },
    { id: 'repos' as StatsTab, label: 'Por Repo', icon: '🏪' }
  ];

  return (
    <div className="stats-modal-backdrop" onClick={handleBackdropClick}>
      <div className="stats-modal">
        <div className="stats-modal-header">
          <div className="stats-modal-title">
            <h2>📊 Dashboard de Estadísticas</h2>
            <p className="stats-subtitle">Métricas del equipo y análisis de PRs</p>
          </div>
          <div className="stats-modal-actions">
            <button
              className="stats-refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refrescar estadísticas"
            >
              {isRefreshing ? '⏳' : '🔄'}
            </button>
            <button className="stats-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="stats-modal-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`stats-nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="stats-modal-content">
          {activeTab === 'overview' && (
            <div className="stats-tab-content">
              <div className="stats-tab-header">
                <h3>📊 Resumen Ejecutivo</h3>
                <select
                  className="time-range-selector"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  {TIME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="stats-cards-grid">
                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-icon">📊</span>
                    <span className="stats-card-title">Total PRs</span>
                  </div>
                  <div className="stats-card-value">{overviewStats.totalPrs}</div>
                  <div className="stats-card-subtitle">en período</div>
                </div>

                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-icon">❌</span>
                    <span className="stats-card-title">PRs Cerradas</span>
                  </div>
                  <div className="stats-card-value">{overviewStats.closedPrs}</div>
                  <div className="stats-card-subtitle">sin mergear</div>
                </div>

                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-icon">✅</span>
                    <span className="stats-card-title">PRs Mergeadas</span>
                  </div>
                  <div className="stats-card-value">{overviewStats.mergedPrs}</div>
                  <div className="stats-card-subtitle">completadas</div>
                </div>

                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-icon">�</span>
                    <span className="stats-card-title">PRs en Draft</span>
                  </div>
                  <div className="stats-card-value">{overviewStats.draftPrs}</div>
                  <div className="stats-card-subtitle">en borrador</div>
                </div>

                <div className="stats-card">
                  <div className="stats-card-header">
                    <span className="stats-card-icon">⏳</span>
                    <span className="stats-card-title">PRs Pendientes</span>
                  </div>
                  <div className="stats-card-value">{overviewStats.pendingReview}</div>
                  <div className="stats-card-subtitle">sin reviewers</div>
                </div>


              </div>


            </div>
          )}

          {activeTab === 'users' && (
            <div className="stats-tab-content">
              <div className="stats-tab-header">
                <h3>👥 Estadísticas por Usuario</h3>
                <select
                  className="time-range-selector"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  {TIME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="users-stats-table">
                <div className="table-header">
                  <div
                    className={`table-cell sortable ${sortField === 'name' ? 'active' : ''}`}
                    onClick={() => handleSort('name')}
                  >
                    👤 Usuario
                    {sortField === 'name' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`table-cell sortable ${sortField === 'prsCreated' ? 'active' : ''}`}
                    onClick={() => handleSort('prsCreated')}
                  >
                    📝 PRs Creadas
                    {sortField === 'prsCreated' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`table-cell sortable ${sortField === 'reviewsGiven' ? 'active' : ''}`}
                    onClick={() => handleSort('reviewsGiven')}
                  >
                    👀 Reviews Dadas
                    {sortField === 'reviewsGiven' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`table-cell sortable ${sortField === 'approvalsGiven' ? 'active' : ''}`}
                    onClick={() => handleSort('approvalsGiven')}
                  >
                    ✅ Approvals
                    {sortField === 'approvalsGiven' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`table-cell sortable ${sortField === 'prsAssigned' ? 'active' : ''}`}
                    onClick={() => handleSort('prsAssigned')}
                  >
                    📋 PRs Asignadas
                    {sortField === 'prsAssigned' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <div
                    className={`table-cell sortable ${sortField === 'oldestPrDays' ? 'active' : ''}`}
                    onClick={() => handleSort('oldestPrDays')}
                  >
                    📅 PR Más Antigua
                    {sortField === 'oldestPrDays' && (
                      <span className="sort-indicator">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                </div>

                {sortedUserStats.map(user => (
                  <div key={user.username} className="table-row">
                    <div className="table-cell user-cell">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="user-avatar"
                      />
                      <div className="user-info">
                        <div className="user-name">{user.name}</div>
                        <div className="user-username">@{user.username}</div>
                      </div>
                    </div>
                    <div className="table-cell">{user.prsCreated}</div>
                    <div className="table-cell">{user.reviewsGiven}</div>
                    <div className="table-cell">{user.approvalsGiven}</div>
                    <div className="table-cell">{user.prsAssigned}</div>
                    <div className="table-cell">
                      {user.oldestPrDays > 0 ? `${user.oldestPrDays}d` : 'N/A'}
                    </div>
                  </div>
                ))}

                {sortedUserStats.length === 0 && (
                  <div className="table-empty">
                    <p>No hay datos de usuarios disponibles</p>
                  </div>
                )}
              </div>

              {sortedUserStats.length > 0 && (
                <div className="table-footer">
                  <p>Mostrando {sortedUserStats.length} usuarios del equipo • Haz clic en las columnas para ordenar</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'repos' && (
            <div className="stats-tab-content">
              <div className="stats-tab-header">
                <h3>🏪 Estadísticas por Repositorio</h3>
                <select
                  className="time-range-selector"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  {TIME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="repos-grid">
                {repoStats.map(repo => (
                  <div key={repo.fullName} className="repo-card">
                    <div className="repo-card-header">
                      <div className="repo-name">
                        <span className="repo-icon">📁</span>
                        <div>
                          <div className="repo-title">{repo.name}</div>
                          <div className="repo-owner">{repo.owner}</div>
                        </div>
                      </div>
                      <div className="repo-total-prs">{repo.totalPrs} PRs</div>
                    </div>

                    <div className="repo-metrics">
                      <div className="repo-metric">
                        <span className="metric-label">📊 Total PRs:</span>
                        <span className="metric-value">{repo.totalPrs}</span>
                      </div>
                      <div className="repo-metric">
                        <span className="metric-label">❌ PRs Cerradas:</span>
                        <span className="metric-value">{repo.closedPrs}</span>
                      </div>
                      <div className="repo-metric">
                        <span className="metric-label">✅ PRs Mergeadas:</span>
                        <span className="metric-value">{repo.mergedPrs}</span>
                      </div>
                      <div className="repo-metric">
                        <span className="metric-label">📝 PRs en Draft:</span>
                        <span className="metric-value">{repo.draftPrs}</span>
                      </div>
                      <div className="repo-metric">
                        <span className="metric-label">⏳ PRs Pendientes:</span>
                        <span className="metric-value">{repo.pendingReview}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {repoStats.length === 0 && (
                  <div className="empty-state">
                    <p>No hay datos de repositorios disponibles</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};