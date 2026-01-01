export interface AuthPriorityPattern {
  pattern: string;
}

export interface PriorityRule {
  models: string[];
  order: AuthPriorityPattern[];
  fallback?: boolean;
}

export type RoutingStrategy = 'round-robin' | 'fill-first';

export interface RoutingConfig {
  strategy: RoutingStrategy;
  priority: PriorityRule[];
}

export interface RoutingStrategyResponse {
  strategy: RoutingStrategy;
}

export interface RoutingPriorityResponse {
  priority: PriorityRule[];
}

export interface RoutingMutationResponse {
  ok: boolean;
  changed?: string[];
  index?: number;
}
