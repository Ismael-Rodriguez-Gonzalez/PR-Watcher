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
}

export interface PRListItem extends PullRequest {
  repositoryName: string;
}
