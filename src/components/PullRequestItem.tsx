import React, { useState, useEffect, useRef } from 'react';
import { PullRequest, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import './PullRequestItem.css';

interface Props {
  pullRequest: PullRequest;
  users: User[];
  onAssignUser: (pr: PullRequest, username: string) => Promise<void>;
  onRemoveAssignee: (pr: PullRequest, username: string) => Promise<void>;
}

export const PullRequestItem: React.FC<Props> = ({
  pullRequest: pr,
  users,
  onAssignUser,
  onRemoveAssignee
}) => {
  const [showAssignMenu, setShowAssignMenu] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [menuAlignment, setMenuAlignment] = useState<'left' | 'right'>('left');
  const assignContainerRef = useRef<HTMLDivElement>(null);

  // Calcular posición del menú para evitar que se salga de la pantalla
  const calculateMenuPosition = () => {
    if (assignContainerRef.current) {
      const container = assignContainerRef.current;
      const rect = container.getBoundingClientRect();
      const menuWidth = 280; // Ancho mínimo del menú
      const viewportWidth = window.innerWidth;

      // Si el menú se saldría por la derecha, alinearlo a la derecha
      if (rect.left + menuWidth > viewportWidth - 20) {
        setMenuAlignment('right');
      } else {
        setMenuAlignment('left');
      }
    }
  };

  // Cerrar menú al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignContainerRef.current && !assignContainerRef.current.contains(event.target as Node)) {
        setShowAssignMenu(false);
        setUserFilter('');
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAssignMenu(false);
        setUserFilter('');
      }
    };

    const handleResize = () => {
      if (showAssignMenu) {
        calculateMenuPosition();
      }
    };

    if (showAssignMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [showAssignMenu, calculateMenuPosition]);

  const handleAssign = async (username: string) => {
    setAssigning(true);
    try {
      await onAssignUser(pr, username);
    } finally {
      setAssigning(false);
      setShowAssignMenu(false);
      setUserFilter('');
    }
  };

  const handleRemove = async (username: string) => {
    setAssigning(true);
    try {
      await onRemoveAssignee(pr, username);
    } finally {
      setAssigning(false);
    }
  };

  const openInGitHub = () => {
    window.electronAPI.openExternal(pr.html_url);
  };

  // Función para normalizar texto (eliminar tildes y signos de puntuación)
  // Ejemplos: "José María" -> "jose maria", "Ángel-García" -> "angel garcia"
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD') // Descompone caracteres acentuados (á -> a + ´)
      .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (tildes, acentos)
      .replace(/ñ/g, 'n') // Reemplaza ñ por n
      .replace(/[^\w\s]/g, '') // Elimina signos de puntuación, mantiene solo letras, números y espacios
      .replace(/\s+/g, ' ') // Normaliza espacios múltiples a uno solo
      .trim();
  };

  // Filtrar usuarios según el término de búsqueda (sin tildes ni puntuación)
  const filteredUsers = users.filter(user => {
    // Si no hay filtro, mostrar todos los usuarios
    if (!userFilter.trim()) {
      return true;
    }

    const normalizedFilter = normalizeText(userFilter);
    const normalizedName = normalizeText(user.name);
    const normalizedUsername = normalizeText(user.username);

    return normalizedName.includes(normalizedFilter) ||
           normalizedUsername.includes(normalizedFilter);
  });

  return (
    <div className={`pr-item ${pr.draft ? 'draft' : ''}`}>
      <div className="pr-header">
        <div className="pr-title-section">
          <h3 className="pr-title" onClick={openInGitHub}>
            {pr.title}
          </h3>
          <div className="pr-meta">
            <span className="pr-number">#{pr.number}</span>
            <span
              className="pr-repo"
              style={{
                backgroundColor: pr.repository.backgroundColor || '#30363d',
                color: '#ffffff'
              }}
            >
              {pr.repository.name}
            </span>
            {pr.draft && <span className="draft-badge">DRAFT</span>}
          </div>
        </div>
      </div>

      <div className="pr-info">
        <div className="info-row">
          <div className="info-item">
            <strong>Autor:</strong>
            <div className="user-info">
              <img src={pr.user.avatar_url} alt={pr.user.login} className="avatar" />
              <span>{pr.user.login}</span>
            </div>
          </div>

          <div className="info-item">
            <strong>Rama:</strong>
            <span className="branch-info">
              {pr.head.ref} → {pr.base.ref}
            </span>
          </div>
        </div>

        <div className="info-row">
          <div className="info-item">
            <strong>Creada:</strong>
            <span>
              {formatDistanceToNow(new Date(pr.created_at), {
                addSuffix: true,
                locale: es
              })}
            </span>
          </div>

          <div className="info-item">
            <strong>Comentarios:</strong>
            <span className="comments-count">
              💬 {(pr.comments || 0) + (pr.review_comments || 0)} {pr.review_comments > 0 && `(${pr.review_comments} en código)`}
            </span>
          </div>
        </div>

        <div className="info-row">
          <div className="info-item assignees-section">
            <strong>Asignados:</strong>
            <div className="assignees">
              {pr.assignees.length === 0 ? (
                <span className="no-assignees">Sin asignar</span>
              ) : (
                pr.assignees.map(assignee => (
                  <div key={assignee.login} className="assignee">
                    <img src={assignee.avatar_url} alt={assignee.login} className="avatar-small" />
                    <span>{assignee.login}</span>
                    <button
                      className="remove-btn"
                      onClick={() => handleRemove(assignee.login)}
                      disabled={assigning}
                      title="Eliminar asignación"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="info-item">
            <div className="assign-container" ref={assignContainerRef}>
              <button
                className="assign-btn"
                onClick={() => {
                  if (!showAssignMenu) {
                    calculateMenuPosition(); // Calcular posición antes de abrir
                    setUserFilter(''); // Limpiar filtro al abrir el menú
                  }
                  setShowAssignMenu(!showAssignMenu);
                }}
                disabled={assigning}
              >
                {assigning ? 'Asignando...' : '+ Asignar'}
              </button>

              {showAssignMenu && (
                <div className={`assign-menu ${menuAlignment === 'right' ? 'align-right' : ''}`}>
                  <div className="assign-menu-header">
                    <input
                      type="text"
                      placeholder="Buscar usuario (sin tildes)..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="user-filter-input"
                      autoFocus
                    />
                    {userFilter && (
                      <div className="filter-results">
                        {filteredUsers.length} de {users.length} usuarios
                      </div>
                    )}
                  </div>
                  <div className="assign-menu-users">
                    {filteredUsers.length === 0 ? (
                      <div className="no-users-found">
                        No se encontraron usuarios
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.username}
                          className="user-option"
                          onClick={() => handleAssign(user.username)}
                          disabled={pr.assignees.some(a => a.login === user.username)}
                        >
                          {user.name} (@{user.username})
                          {pr.assignees.some(a => a.login === user.username) && ' ✓'}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
