import { apiClient } from './client';
import type {
  RoutingConfig,
  RoutingStrategyResponse,
  RoutingPriorityResponse,
  RoutingMutationResponse,
  RoutingStrategy,
  PriorityRule,
} from '@/types';

const BASE_PATH = '/routing';

export const routingApi = {
  getConfig: (): Promise<RoutingConfig> => {
    return apiClient.get<RoutingConfig>(BASE_PATH);
  },

  updateConfig: (config: RoutingConfig): Promise<RoutingMutationResponse> => {
    return apiClient.put<RoutingMutationResponse>(BASE_PATH, config);
  },

  getStrategy: (): Promise<RoutingStrategyResponse> => {
    return apiClient.get<RoutingStrategyResponse>(`${BASE_PATH}/strategy`);
  },

  updateStrategy: (strategy: RoutingStrategy): Promise<RoutingMutationResponse> => {
    return apiClient.put<RoutingMutationResponse>(`${BASE_PATH}/strategy`, { strategy });
  },

  getPriority: (): Promise<RoutingPriorityResponse> => {
    return apiClient.get<RoutingPriorityResponse>(`${BASE_PATH}/priority`);
  },

  updatePriority: (priority: PriorityRule[]): Promise<RoutingMutationResponse> => {
    return apiClient.put<RoutingMutationResponse>(`${BASE_PATH}/priority`, { priority });
  },

  addPriorityRule: (rule: PriorityRule): Promise<RoutingMutationResponse> => {
    return apiClient.post<RoutingMutationResponse>(`${BASE_PATH}/priority`, rule);
  },

  getPriorityRule: (index: number): Promise<PriorityRule> => {
    return apiClient.get<PriorityRule>(`${BASE_PATH}/priority/${index}`);
  },

  updatePriorityRule: (index: number, rule: PriorityRule): Promise<RoutingMutationResponse> => {
    return apiClient.put<RoutingMutationResponse>(`${BASE_PATH}/priority/${index}`, rule);
  },

  deletePriorityRule: (index: number): Promise<RoutingMutationResponse> => {
    return apiClient.delete<RoutingMutationResponse>(`${BASE_PATH}/priority/${index}`);
  },
};
