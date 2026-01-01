export interface ApiKeyLimits {
  'requests-per-day'?: number;
  'requests-per-month'?: number;
  'tokens-per-day'?: number;
  'tokens-per-month'?: number;
}

export interface ApiKeyConfig {
  key: string;
  limits?: ApiKeyLimits;
  'allowed-providers'?: string[];
  'auth-ids'?: string[];
}

export interface ApiKeyConfigsResponse {
  api_key_configs: ApiKeyConfig[];
}

export interface ApiKeyConfigMutationResponse {
  ok?: boolean;
  status?: string;
  key?: string;
}

export interface RateLimitingConfig {
  enabled: boolean;
  'exceeded-status-code'?: number;
  'persistence-path'?: string;
}

export interface ApiKeyUsage {
  requests_today: number;
  requests_month: number;
  tokens_today: number;
  tokens_month: number;
}

export interface ApiKeyUsageResponse {
  usage: Record<string, ApiKeyUsage>;
}

export interface ApiKeyUsageResetResponse {
  ok: boolean;
  reset: string;
}
