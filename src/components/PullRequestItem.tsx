import React, { useState, useEffect, useRef } from 'react';
import { PullRequest, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [copyFeedback, setCopyFeedback] = useState(false);
  const assignContainerRef = useRef<HTMLDivElement>(null);

  const getMergeStatus = (pr: PullRequest): { status: string; icon: string; text: string } => {
    if (pr.mergeable === null || pr.mergeable_state === 'unknown') {
      return { status: 'unknown', icon: '❓', text: 'Checking' };
    }

    if (pr.mergeable === false || pr.mergeable_state === 'dirty') {
      return { status: 'conflicts', icon: '⚠️', text: 'Conflicts' };
    }

    if (pr.mergeable_state === 'blocked') {
      return { status: 'blocked', icon: '🚫', text: 'Blocked' };
    }

    if (pr.mergeable === true && pr.mergeable_state === 'clean') {
      return { status: 'mergeable', icon: '✅', text: 'Ready' };
    }

    // Para otros estados como 'behind', 'unstable', etc.
    return { status: 'unknown', icon: '⏳', text: pr.mergeable_state || 'Unknown' };
  };

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

  const handleCopyURL = async () => {
    try {
      await navigator.clipboard.writeText(pr.html_url);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000); // Ocultar feedback después de 2 segundos
    } catch (error) {
      console.error('Error copying URL:', error);
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = pr.html_url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
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

  // Función para obtener clases de Tailwind para ramas
  const getBranchClasses = (branchName: string, isBase: boolean): string => {
    if (branchName === 'master' || branchName === 'main') {
      return 'px-1.5 py-0.5 rounded text-xs font-bold bg-red-900/30 text-red-400 border border-red-400/40';
    }
    return isBase
      ? 'px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-400/40'
      : 'px-1.5 py-0.5 rounded text-xs font-bold bg-green-900/30 text-green-400 border border-green-400/40';
  };

  const getMergeStatusClasses = (status: string): string => {
    const baseClasses = 'inline-flex items-center px-1.5 py-0.5 text-xs font-bold rounded-full ml-2 uppercase tracking-wider';
    switch (status) {
      case 'mergeable':
        return `${baseClasses} bg-green-900/30 text-green-400 border border-green-400/30`;
      case 'conflicts':
        return `${baseClasses} bg-red-900/30 text-red-400 border border-red-400/30`;
      case 'blocked':
        return `${baseClasses} bg-yellow-900/30 text-yellow-400 border border-yellow-400/30`;
      default:
        return `${baseClasses} bg-github-gray-700 text-github-gray-400 border border-github-gray-400/30`;
    }
  };

  return (
    <div className={`bg-github-gray-900 border border-github-gray-600 rounded-github p-3 transition-all duration-200 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-400/10 ${pr.draft ? 'border-l-4 border-l-github-gray-500' : ''}`}>
      <div className="mb-2.5">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-blue-400 text-sm font-semibold cursor-pointer m-0 leading-tight hover:underline" onClick={openInGitHub}>
            {pr.title}
            <button
              className={`ml-2 bg-transparent border-none cursor-pointer text-sm p-1 rounded transition-all duration-200 opacity-70 inline-flex items-center justify-center min-w-[18px] h-[18px] ${copyFeedback ? 'text-green-400 bg-green-400/10 opacity-100' : 'text-github-gray-400 hover:text-blue-400 hover:bg-blue-400/10 hover:opacity-100'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyURL();
              }}
              title="Copiar URL de la PR"
            >
              {copyFeedback ? '✓' : '📋'}
            </button>
            {(() => {
              const mergeStatus = getMergeStatus(pr);
              return (
                <span className={getMergeStatusClasses(mergeStatus.status)} title={`Merge status: ${mergeStatus.text}`}>
                  <span className="mr-1 text-xs">{mergeStatus.icon}</span>
                  {mergeStatus.text}
                </span>
              );
            })()}
          </h3>
          <div className="flex gap-2 items-center flex-wrap mt-0.5">
            <span className="text-github-gray-400 text-sm">#{pr.number}</span>
            <span
              className="text-white text-xs font-semibold px-2 py-0.5 rounded shadow-sm border border-white/10"
              style={{
                backgroundColor: pr.repository.backgroundColor || '#30363d'
              }}
            >
              {pr.repository.name}
            </span>
            <div className="font-mono inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-bold shadow-sm">
              <span className={getBranchClasses(pr.head.ref, false)}>
                {pr.head.ref}
              </span>
              <span className="font-bold text-base text-blue-400 mx-1.5 select-none">→</span>
              <span className={getBranchClasses(pr.base.ref, true)}>
                {pr.base.ref}
              </span>
            </div>
            {pr.draft && <span className="bg-github-gray-500 text-white px-2 py-0.5 rounded text-xs font-semibold">DRAFT</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex gap-1.5 items-center text-sm">
            <div className="flex gap-2 items-center">
              <img src={pr.user.avatar_url} alt={pr.user.login} className="w-5 h-5 rounded-full" />
              <span>{pr.user.login}</span>
            </div>
          </div>

          <div className="flex gap-1.5 items-center text-sm">
            <span>
              {formatDistanceToNow(new Date(pr.created_at), {
                addSuffix: true,
                locale: es
              })}
            </span>
          </div>

          <div className="flex gap-1.5 items-center text-sm">
            <span className="bg-github-gray-700 px-1.5 py-0.5 rounded text-xs">
              💬 {(pr.comments || 0) + (pr.review_comments || 0)} {pr.review_comments > 0 && `(${pr.review_comments} en código)`}
            </span>
          </div>
        </div>

        {/* Reviews y Approvals */}
        {pr.reviews && pr.reviews.length > 0 && (
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex gap-1.5 items-center text-sm min-h-auto">
              <strong className="text-github-gray-400">Reviews:</strong>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {(() => {
                  // Filtrar solo los reviews más recientes por usuario
                  const latestReviews = new Map();
                  pr.reviews
                    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
                    .forEach(review => {
                      if (!latestReviews.has(review.user.login)) {
                        latestReviews.set(review.user.login, review);
                      }
                    });

                  const getReviewClasses = (state: string): string => {
                    const baseClasses = 'flex items-center gap-1 px-1.5 py-1 rounded text-xs border border-transparent';
                    switch (state.toLowerCase()) {
                      case 'approved':
                        return `${baseClasses} bg-green-600/15 border-green-600/30`;
                      case 'changes_requested':
                        return `${baseClasses} bg-red-600/15 border-red-600/30`;
                      case 'commented':
                        return `${baseClasses} bg-blue-600/15 border-blue-600/30`;
                      case 'dismissed':
                        return `${baseClasses} bg-github-gray-500/15 border-github-gray-500/30`;
                      default:
                        return baseClasses;
                    }
                  };

                  const getReviewStatusClasses = (state: string): string => {
                    const baseClasses = 'text-base flex items-center';
                    switch (state.toLowerCase()) {
                      case 'approved':
                        return `${baseClasses} text-green-600`;
                      case 'changes_requested':
                        return `${baseClasses} text-red-600`;
                      case 'commented':
                        return `${baseClasses} text-blue-600`;
                      case 'dismissed':
                        return `${baseClasses} text-github-gray-500`;
                      default:
                        return baseClasses;
                    }
                  };

                  return Array.from(latestReviews.values()).map(review => (
                    <div key={`${review.user.login}-${review.id}`} className={getReviewClasses(review.state)}>
                      <img src={review.user.avatar_url} alt={review.user.login} className="w-4 h-4 rounded-full" />
                      <span className="text-github-gray-100 font-medium">{review.user.login}</span>
                      <span className={getReviewStatusClasses(review.state)}>
                        {review.state === 'APPROVED' && '✅'}
                        {review.state === 'CHANGES_REQUESTED' && '❌'}
                        {review.state === 'COMMENTED' && '💬'}
                        {review.state === 'DISMISSED' && '🚫'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex gap-1.5 items-center flex-row flex-1">
            <div className="flex gap-1.5 flex-wrap">
              {pr.assignees.length === 0 ? (
                <span className="text-github-gray-500 italic">Sin asignar</span>
              ) : (
                pr.assignees.map(assignee => (
                  <div key={assignee.login} className="flex gap-1 items-center bg-github-gray-700 px-1.5 py-1 rounded text-xs">
                    <img src={assignee.avatar_url} alt={assignee.login} className="w-4 h-4 rounded-full" />
                    <span>{assignee.login}</span>
                    <button
                      className="bg-transparent border-none text-red-400 cursor-pointer px-1 text-sm font-bold hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
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

          <div className="flex gap-1.5 items-center">
            <div className="relative" ref={assignContainerRef}>
              <button
                className="px-2.5 py-1 bg-github-green text-white border-none rounded cursor-pointer text-xs font-medium transition-colors duration-200 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className={`absolute top-full mt-1 bg-github-gray-800 border border-github-gray-600 rounded-github p-0 min-w-[280px] max-w-[350px] w-max z-50 shadow-github-lg overflow-hidden ${menuAlignment === 'right' ? 'right-0' : 'left-0'}`}>
                  <div className="p-3 border-b border-github-gray-600 bg-github-gray-800">
                    <input
                      type="text"
                      placeholder="Buscar usuario (sin tildes)..."
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-github-gray-900 border border-github-gray-600 rounded-github text-github-gray-100 text-sm outline-none focus:border-blue-400 focus:shadow-sm focus:shadow-blue-400/10 placeholder-github-gray-400"
                      autoFocus
                    />
                    {userFilter && (
                      <div className="mt-2 text-xs text-github-gray-400 text-center">
                        {filteredUsers.length} de {users.length} usuarios
                      </div>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin">
                    {filteredUsers.length === 0 ? (
                      <div className="px-3 py-4 text-center text-github-gray-400 text-sm italic">
                        No se encontraron usuarios
                      </div>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.username}
                          className="block w-full px-3 py-2 bg-transparent border-none text-github-gray-100 text-left cursor-pointer rounded text-sm hover:bg-github-gray-600 disabled:opacity-50 disabled:cursor-default disabled:bg-github-gray-700"
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
