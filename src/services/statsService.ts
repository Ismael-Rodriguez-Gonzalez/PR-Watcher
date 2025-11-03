// Tipos para las métricas del dashboard
export interface UserStats {
  username: string;
  name: string;
  avatar: string;
  prsCreated: number;
  reviewsGiven: number;
  avgReviewTime: number; // en días
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
  avgReviewTime: number;
  avgMergeTime: number;
  approvalRate: number;
  oldPrsCount: number; // PRs >30 días
  conflictsCount: number;
}

export interface TrendData {
  date: string;
  prsCreated: number;
  prsMerged: number;
  prsReviewed: number;
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

    // Calcular tiempos promedio (simulado por ahora)
    const avgReviewTime = this.calculateAverageReviewTime(prsInRange);
    const avgMergeTime = this.calculateAverageMergeTime(prsInRange);

    // PRs antiguas (>30 días)
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const oldPrsCount = pullRequests.filter(pr =>
      pr.state === 'open' && new Date(pr.created_at) < thirtyDaysAgo
    ).length;

    // Tasa de aprobación (simulada)
    const approvalRate = Math.round(85 + Math.random() * 10); // 85-95%

    // Conflictos pendientes (simulado)
    const conflictsCount = Math.floor(pullRequests.length * 0.1); // ~10%

    const stats: OverviewStats = {
      totalPrs,
      openPrs,
      closedPrs,
      mergedPrs,
      draftPrs,
      pendingReview,
      avgReviewTime,
      avgMergeTime,
      approvalRate,
      oldPrsCount,
      conflictsCount
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



      return {
        username: user.username,
        name: user.name,
        avatar: user.avatar || `https://github.com/${user.username}.png`,
        prsCreated: userPrs.length,
        reviewsGiven,
        avgReviewTime: Math.round((Math.random() * 5 + 1) * 10) / 10, // 1-6 días
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
      const urlMatch = repo.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
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

  /**
   * Genera datos de tendencias temporales
   */
  static calculateTrendData(pullRequests: any[], timeRange: string = '30d'): TrendData[] {
    const cacheKey = `trends-${timeRange}-${pullRequests.length}`;
    const cached = metricsCache.get(cacheKey);
    if (cached) return cached;

    const rangeConfig = TIME_RANGES.find(r => r.value === timeRange) || TIME_RANGES[1];
    const days = rangeConfig.days;
    const trends: TrendData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Simular datos de tendencias
      trends.push({
        date: dateStr,
        prsCreated: Math.floor(Math.random() * 5 + 1),
        prsMerged: Math.floor(Math.random() * 3 + 1),
        prsReviewed: Math.floor(Math.random() * 7 + 2)
      });
    }

    metricsCache.set(cacheKey, trends);
    return trends;
  }

  // Métodos auxiliares privados
  private static calculateAverageReviewTime(_prs: any[]): number {
    // Simulación - en implementación real calcularíamos basado en timestamps
    return Math.round((Math.random() * 3 + 2) * 10) / 10; // 2-5 días
  }

  private static calculateAverageMergeTime(_prs: any[]): number {
    // Simulación - en implementación real calcularíamos basado en timestamps
    return Math.round((Math.random() * 5 + 3) * 10) / 10; // 3-8 días
  }

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