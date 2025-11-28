// Tipos para la configuración
export interface Config {
  githubToken: string;
  refreshInterval: number;
}

export interface Repository {
  url: string;
  name: string;
  owner?: string;
  repo?: string;
  enabled?: boolean;
  backgroundColor?: string;
  refreshInterval?: number; // Intervalo de actualización en segundos (debería estar siempre presente, fallback: 7200s)
}

export interface User {
  username: string;
  name: string;
}

// Tipos para Reviews
export interface Review {
  id: number;
  user: {
    login: string;
    avatar_url: string;
  };
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submitted_at: string;
}

// Tipos para Pull Requests
export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed';
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  base: {
    ref: string;
    repo: {
      name: string;
      full_name: string;
    };
  };
  head: {
    ref: string;
  };
  created_at: string;
  updated_at: string;
  comments: number;
  review_comments: number;
  html_url: string;
  repository: Repository;
  reviews?: Review[];
  mergeable?: boolean | null;
  mergeable_state?: 'clean' | 'dirty' | 'unstable' | 'blocked' | 'behind' | 'draft' | 'unknown';
}

export interface PRListItem extends PullRequest {
  repositoryName: string;
}

// Tipos para el estado de los repositorios
export interface RepoState {
  lastUpdates: Record<string, number>; // URL del repo -> timestamp (ms)
}
