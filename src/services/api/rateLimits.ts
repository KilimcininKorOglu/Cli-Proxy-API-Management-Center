import { apiClient } from './client';
import type {
  ApiKeyConfig,
  ApiKeyConfigsResponse,
  ApiKeyConfigMutationResponse,
  RateLimitingConfig,
  ApiKeyUsageResponse,
  ApiKeyUsage,
  ApiKeyUsageResetResponse,
} from '@/types';

export const rateLimitsApi = {
  // API Key Configs
  getConfigs: (): Promise<ApiKeyConfigsResponse> => {
    return apiClient.get<ApiKeyConfigsResponse>('/api-key-configs');
  },

  addConfig: (config: ApiKeyConfig): Promise<ApiKeyConfigMutationResponse> => {
    return apiClient.post<ApiKeyConfigMutationResponse>('/api-key-configs', config);
  },

  getConfig: (key: string): Promise<ApiKeyConfig> => {
    return apiClient.get<ApiKeyConfig>(`/api-key-configs/${encodeURIComponent(key)}`);
  },

  updateConfig: (key: string, config: Partial<ApiKeyConfig>): Promise<ApiKeyConfigMutationResponse> => {
    return apiClient.put<ApiKeyConfigMutationResponse>(`/api-key-configs/${encodeURIComponent(key)}`, config);
  },

  deleteConfig: (key: string): Promise<ApiKeyConfigMutationResponse> => {
    return apiClient.delete<ApiKeyConfigMutationResponse>(`/api-key-configs/${encodeURIComponent(key)}`);
  },

  // Global Rate Limiting Config
  getRateLimiting: (): Promise<RateLimitingConfig> => {
    return apiClient.get<RateLimitingConfig>('/rate-limiting');
  },

  updateRateLimiting: (config: RateLimitingConfig): Promise<ApiKeyConfigMutationResponse> => {
    return apiClient.put<ApiKeyConfigMutationResponse>('/rate-limiting', config);
  },

  // Usage Monitoring
  getAllUsage: (): Promise<ApiKeyUsageResponse> => {
    return apiClient.get<ApiKeyUsageResponse>('/rate-limits/usage');
  },

  getUsage: (key: string): Promise<ApiKeyUsage> => {
    return apiClient.get<ApiKeyUsage>(`/rate-limits/usage/${encodeURIComponent(key)}`);
  },

  resetUsage: (key: string): Promise<ApiKeyUsageResetResponse> => {
    return apiClient.delete<ApiKeyUsageResetResponse>(`/rate-limits/usage/${encodeURIComponent(key)}`);
  },
};
