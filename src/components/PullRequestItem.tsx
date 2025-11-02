import React, { useState } from 'react';
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

  const handleAssign = async (username: string) => {
    setAssigning(true);
    try {
      await onAssignUser(pr, username);
    } finally {
      setAssigning(false);
      setShowAssignMenu(false);
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

  return (
    <div className={`pr-item ${pr.draft ? 'draft' : ''}`}>
      <div className="pr-header">
        <div className="pr-title-section">
          <h3 className="pr-title" onClick={openInGitHub}>
            {pr.title}
          </h3>
          <div className="pr-meta">
            <span className="pr-number">#{pr.number}</span>
            <span className="pr-repo">{pr.repository.name}</span>
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
            <div className="assign-container">
              <button
                className="assign-btn"
                onClick={() => setShowAssignMenu(!showAssignMenu)}
                disabled={assigning}
              >
                {assigning ? 'Asignando...' : '+ Asignar'}
              </button>

              {showAssignMenu && (
                <div className="assign-menu">
                  {users.map(user => (
                    <button
                      key={user.username}
                      className="user-option"
                      onClick={() => handleAssign(user.username)}
                      disabled={pr.assignees.some(a => a.login === user.username)}
                    >
                      {user.name} (@{user.username})
                      {pr.assignees.some(a => a.login === user.username) && ' ✓'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
