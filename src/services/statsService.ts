// Tipos para las métricas del dashboard
export interface UserStats {
  username: string;
  name: string;
  avatar: string;
  prsCreated: number;
  reviewsGiven: number;
  approvalsGiven: number;
  prsAssigned: number;
  oldestPrDays: number;
}

export interface RepoStats {
  name: string;
  owner: string;
  fullName: string;
  totalPrs: number;
  openPrs: number;
  closedPrs: number;
  mergedPrs: number;
  draftPrs: number;
  pendingReview: number;
}

export interface TimeRange {
  value: string;
  label: string;
  days: number;
}

export interface OverviewStats {
  totalPrs: number;
  openPrs: number;
  closedPrs: number;
  mergedPrs: number;
  draftPrs: number;
  pendingReview: number;
  oldPrsCount: number; // PRs >30 días
}

// Rangos de tiempo disponibles
export const TIME_RANGES: TimeRange[] = [
  { value: '7d', label: 'Últimos 7 días', days: 7 },
  { value: '30d', label: 'Últimos 30 días', days: 30 },
  { value: '3m', label: 'Últimos 3 meses', days: 90 },
  { value: '6m', label: 'Últimos 6 meses', days: 180 }
];

// Cache de métricas para evitar recálculos
class MetricsCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const metricsCache = new MetricsCache();

// Servicio principal de métricas
export class StatsService {

  /**
   * Calcula las estadísticas generales del dashboard
   */
  static calculateOverviewStats(pullRequests: any[], timeRange: string = '30d'): OverviewStats {
    const cacheKey = `overview-${timeRange}-${pullRequests.length}`;
    const cached = metricsCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const rangeConfig = TIME_RANGES.find(r => r.value === timeRange) || TIME_RANGES[1];
    const cutoffDate = new Date(now.getTime() - (rangeConfig.days * 24 * 60 * 60 * 1000));

    // Filtrar PRs por rango de tiempo
    const prsInRange = pullRequests.filter(pr =>
      new Date(pr.created_at) >= cutoffDate
    );

    const totalPrs = prsInRange.length;
    const openPrs = prsInRange.filter(pr => pr.state === 'open' && !pr.draft).length;
    const closedPrs = prsInRange.filter(pr => pr.state === 'closed' && !pr.merged_at).length;
    const mergedPrs = prsInRange.filter(pr => pr.merged_at).length;
    const draftPrs = prsInRange.filter(pr => pr.draft).length;
    const pendingReview = prsInRange.filter(pr =>
      pr.state === 'open' && (!pr.reviews || pr.reviews.length === 0)
    ).length;

    // PRs antiguas (>30 días)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const oldPrsCount = pullRequests.filter(pr =>
      pr.state === 'open' && new Date(pr.created_at) < thirtyDaysAgo
    ).length;

    const stats: OverviewStats = {
      totalPrs,
      openPrs,
      closedPrs,
      mergedPrs,
      draftPrs,
      pendingReview,
      oldPrsCount
    };

    metricsCache.set(cacheKey, stats);
    return stats;
  }

  /**
   * Calcula estadísticas por usuario
   */
  static calculateUserStats(pullRequests: any[], users: any[], timeRange: string = '30d'): UserStats[] {
    const cacheKey = `users-${timeRange}-${pullRequests.length}`;
    const cached = metricsCache.get(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const rangeConfig = TIME_RANGES.find(r => r.value === timeRange) || TIME_RANGES[1];
    const cutoffDate = new Date(now.getTime() - (rangeConfig.days * 24 * 60 * 60 * 1000));

    // Filtrar PRs por rango de tiempo
    const prsInRange = pullRequests.filter(pr =>
      new Date(pr.created_at) >= cutoffDate
    );

    const userStats: UserStats[] = users.map(user => {
      const userPrs = prsInRange.filter(pr => pr.user.login === user.username);
      const reviewsGiven = this.countReviewsByUser(prsInRange, user.username);
      const approvalsGiven = this.countApprovalsByUser(prsInRange, user.username);

      return {
        username: user.username,
        name: user.name,
        avatar: user.avatar || `https://github.com/${user.username}.png`,
        prsCreated: userPrs.length,
        reviewsGiven,
        approvalsGiven,
        prsAssigned: prsInRange.filter(pr =>
          pr.assignees && pr.assignees.some((a: any) => a.login === user.username)
        ).length,
        oldestPrDays: this.getOldestPrDays(userPrs)
      };
    });

    metricsCache.set(cacheKey, userStats);
    return userStats;
  }

  /**
   * Calcula estadísticas por repositorio
   */
  static calculateRepoStats(pullRequests: any[], repos: any[], timeRange: string = '30d'): RepoStats[] {
    const cacheKey = `repos-${timeRange}-${pullRequests.length}`;
    const cached = metricsCache.get(cacheKey);
    if (cached) return cached;

    const repoStats: RepoStats[] = repos.map(repo => {
      // Extraer owner/name de la URL de GitHub
      const urlMatch = repo.url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) {
        console.warn(`Invalid GitHub URL: ${repo.url}`);
        return null;
      }

      const [, owner, repoName] = urlMatch;
      const fullName = `${owner}/${repoName}`;

      const repoPrs = pullRequests.filter(pr =>
        pr.base.repo.full_name === fullName
      );

      const openPrs = repoPrs.filter(pr => pr.state === 'open');
      const closedPrs = repoPrs.filter(pr => pr.state === 'closed');
      const mergedPrs = repoPrs.filter(pr => pr.merged_at);
      const draftPrs = repoPrs.filter(pr => pr.draft);
      const pendingReview = openPrs.filter(pr => !pr.draft).length;

      return {
        name: repo.name,
        owner: owner,
        fullName: fullName,
        totalPrs: repoPrs.length,
        openPrs: openPrs.length,
        closedPrs: closedPrs.length,
        mergedPrs: mergedPrs.length,
        draftPrs: draftPrs.length,
        pendingReview: pendingReview
      };
    }).filter(Boolean) as RepoStats[];

    metricsCache.set(cacheKey, repoStats);
    return repoStats;
  }



  // Métodos auxiliares privados
  private static countReviewsByUser(prs: any[], username: string): number {
    return prs.reduce((count, pr) => {
      if (pr.reviews && Array.isArray(pr.reviews)) {
        return count + pr.reviews.filter((review: any) =>
          review.user.login === username
        ).length;
      }
      return count;
    }, 0);
  }

  private static countApprovalsByUser(prs: any[], username: string): number {
    return prs.reduce((count, pr) => {
      if (pr.reviews && Array.isArray(pr.reviews)) {
        return count + pr.reviews.filter((review: any) =>
          review.user.login === username && review.state === 'APPROVED'
        ).length;
      }
      return count;
    }, 0);
  }

  private static getOldestPrDays(prs: any[]): number {
    if (prs.length === 0) return 0;

    const now = new Date();
    const oldestPr = prs.reduce((oldest, pr) => {
      const prDate = new Date(pr.created_at);
      const oldestDate = new Date(oldest.created_at);
      return prDate < oldestDate ? pr : oldest;
    });

    const daysDiff = Math.floor(
      (now.getTime() - new Date(oldestPr.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysDiff;
  }

  /**
   * Limpia el cache de métricas
   */
  static clearCache(): void {
    metricsCache.clear();
  }

  /**
   * Obtiene información de cache para debugging
   */
  static getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: (metricsCache as any).cache.size,
      keys: Array.from((metricsCache as any).cache.keys())
    };
  }
}