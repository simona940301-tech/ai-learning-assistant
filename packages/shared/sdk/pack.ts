import type { BaseClient } from './baseClient';
import type {
  Pack,
  PackWithStatus,
  PackFilter,
  PackListResponse,
  PackPreview,
  InstallPackRequest,
  InstallPackResponse,
  UninstallPackRequest,
  QREntryResult,
} from '../types';
import { track } from '../analytics';

/**
 * Module 2: Shop (題包系統) - SDK Methods
 *
 * Provides client-side API for pack browsing, installation, and management
 */

export function createPackAPI(client: BaseClient) {
  return {
    /**
     * Browse packs with filters and search
     * Tracks pack.search event
     */
    async browsePacks(
      filter: PackFilter = {},
      page: number = 1,
      pageSize: number = 20
    ): Promise<PackListResponse> {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(filter.subject && { subject: filter.subject }),
        ...(filter.topic && { topic: filter.topic }),
        ...(filter.skill && { skill: filter.skill }),
        ...(filter.grade && { grade: filter.grade }),
        ...(filter.source && { source: filter.source }), // V2: Source filter
        ...(filter.hasExplanation !== undefined && {
          hasExplanation: filter.hasExplanation.toString(),
        }),
        ...(filter.confidenceBadge && { confidenceBadge: filter.confidenceBadge }),
        ...(filter.sortBy && { sortBy: filter.sortBy }),
        ...(filter.search && { search: filter.search }),
      });

      const response = await client.request<PackListResponse>(`/api/packs?${params.toString()}`);

      // Track search event (V2: Added source to filters)
      track('pack.search', {
        query: filter.search,
        filters: {
          subject: filter.subject,
          topic: filter.topic,
          skill: filter.skill,
          grade: filter.grade,
          source: filter.source, // V2
          hasExplanation: filter.hasExplanation,
          confidenceBadge: filter.confidenceBadge,
          sortBy: filter.sortBy,
        },
        resultsCount: response.total,
      });

      return response;
    },

    /**
     * Get pack details by ID
     * Tracks pack.view event
     */
    async getPack(
      packId: string,
      options?: { listPosition?: number; source?: 'search' | 'qr' | 'recommendation' | 'direct' }
    ): Promise<PackWithStatus> {
      const pack = await client.request<PackWithStatus>(`/api/packs/${packId}`);

      // Track view event
      track('pack.view', {
        packId,
        listPosition: options?.listPosition,
        source: options?.source || 'direct',
      });

      return pack;
    },

    /**
     * Get pack preview with chapters and sample questions
     * Does not track analytics (preview is part of view flow)
     */
    async getPackPreview(packId: string): Promise<PackPreview> {
      return client.request<PackPreview>(`/api/packs/${packId}/preview`);
    },

    /**
     * Install pack to user's library
     * Tracks pack.install event
     */
    async installPack(request: InstallPackRequest): Promise<InstallPackResponse> {
      const response = await client.request<InstallPackResponse>('/api/packs/install', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      // Track install event
      track('pack.install', {
        packId: request.packId,
        source: request.source,
        listPosition: request.listPosition,
      });

      return response;
    },

    /**
     * Uninstall pack from user's library
     * Tracks pack.uninstall event
     */
    async uninstallPack(request: UninstallPackRequest): Promise<{ success: boolean }> {
      // Get installation info for tracking
      const installations = await client.request<Array<{ packId: string; installedAt: string }>>(
        '/api/packs/installed'
      );
      const installation = installations.find(i => i.packId === request.packId);

      const response = await client.request<{ success: boolean }>('/api/packs/uninstall', {
        method: 'POST',
        body: JSON.stringify(request),
      });

      // Track uninstall event
      if (response.success && installation) {
        const installedDuration = Math.floor(
          (new Date().getTime() - new Date(installation.installedAt).getTime()) / 1000
        );

        track('pack.uninstall', {
          packId: request.packId,
          installedDuration,
        });
      }

      return response;
    },

    /**
     * Get user's installed packs
     */
    async getInstalledPacks(): Promise<PackWithStatus[]> {
      return client.request<PackWithStatus[]>('/api/packs/installed');
    },

    /**
     * QR entry point - get pack by alias with fallback
     * Automatically handles not found, expired, archived cases
     */
    async getPackByQR(alias: string): Promise<QREntryResult> {
      return client.request<QREntryResult>(`/api/qr/${alias}`);
    },

    /**
     * Search packs by query (convenience method)
     */
    async searchPacks(
      query: string,
      filters?: Partial<PackFilter>,
      page: number = 1
    ): Promise<PackListResponse> {
      return this.browsePacks(
        {
          search: query,
          ...filters,
          sortBy: filters?.sortBy || 'latest',
        },
        page
      );
    },

    /**
     * Get popular packs (convenience method)
     */
    async getPopularPacks(limit: number = 10): Promise<PackWithStatus[]> {
      const response = await this.browsePacks({ sortBy: 'popular' }, 1, limit);
      return response.packs;
    },

    /**
     * Get high confidence packs (convenience method)
     */
    async getHighConfidencePacks(limit: number = 10): Promise<PackWithStatus[]> {
      const response = await this.browsePacks(
        {
          sortBy: 'confidence',
          confidenceBadge: 'high',
        },
        1,
        limit
      );
      return response.packs;
    },

    /**
     * Get packs by topic (convenience method)
     */
    async getPacksByTopic(topic: string, grade?: string): Promise<PackWithStatus[]> {
      const response = await this.browsePacks(
        {
          topic,
          ...(grade && { grade }),
          sortBy: 'latest',
        },
        1,
        20
      );
      return response.packs;
    },

    /**
     * Get packs by skill (convenience method)
     */
    async getPacksBySkill(skill: string, grade?: string): Promise<PackWithStatus[]> {
      const response = await this.browsePacks(
        {
          skill,
          ...(grade && { grade }),
          sortBy: 'confidence',
        },
        1,
        20
      );
      return response.packs;
    },
  };
}
