export interface AuthPriorityPattern {
  pattern: string;
}

export interface PriorityRule {
  models: string[];
  order: AuthPriorityPattern[];
  fallback?: boolean;
}

export interface AuthBinding {
  'api-key': string;
  'auth-ids': string[];
  fallback?: boolean;
}

export type RoutingStrategy = 'round-robin' | 'fill-first';

export interface RoutingConfig {
  strategy: RoutingStrategy;
  priority: PriorityRule[];
  bindings?: AuthBinding[];
}

export interface RoutingStrategyResponse {
  strategy: RoutingStrategy;
}

export interface RoutingPriorityResponse {
  priority: PriorityRule[];
}

export interface RoutingBindingsResponse {
  bindings: AuthBinding[];
}

export interface RoutingMutationResponse {
  ok: boolean;
  changed?: string[];
  index?: number;
}
