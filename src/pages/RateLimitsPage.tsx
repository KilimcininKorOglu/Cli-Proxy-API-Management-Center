import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore, useNotificationStore } from '@/stores';
import { rateLimitsApi } from '@/services/api';
import type { ApiKeyConfig, ApiKeyLimits, RateLimitingConfig, ApiKeyUsage } from '@/types';
import styles from './RateLimitsPage.module.scss';

interface ConfigFormData {
  key: string;
  requestsPerDay: string;
  requestsPerMonth: string;
  tokensPerDay: string;
  tokensPerMonth: string;
  allowedProviders: string[];
  authIds: string[];
}

const emptyConfigForm: ConfigFormData = {
  key: '',
  requestsPerDay: '',
  requestsPerMonth: '',
  tokensPerDay: '',
  tokensPerMonth: '',
  allowedProviders: [],
  authIds: [],
};

const PROVIDER_OPTIONS = ['gemini', 'claude', 'codex', 'openai'];

export function RateLimitsPage() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const [configs, setConfigs] = useState<ApiKeyConfig[]>([]);
  const [rateLimiting, setRateLimiting] = useState<RateLimitingConfig>({ enabled: true });
  const [usage, setUsage] = useState<Record<string, ApiKeyUsage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>(emptyConfigForm);
  const [providerInput, setProviderInput] = useState('');
  const [authIdInput, setAuthIdInput] = useState('');

  // Global settings inputs
  const [statusCodeInput, setStatusCodeInput] = useState('429');
  const [persistencePathInput, setPersistencePathInput] = useState('');

  const disableControls = connectionStatus !== 'connected';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [configsRes, rateLimitingRes, usageRes] = await Promise.all([
        rateLimitsApi.getConfigs().catch(() => ({ api_key_configs: [] })),
        rateLimitsApi.getRateLimiting().catch((): RateLimitingConfig => ({ enabled: true })),
        rateLimitsApi.getAllUsage().catch(() => ({ usage: {} })),
      ]);
      setConfigs(configsRes.api_key_configs || []);
      setRateLimiting(rateLimitingRes);
      setStatusCodeInput(String(rateLimitingRes['exceeded-status-code'] || 429));
      setPersistencePathInput(rateLimitingRes['persistence-path'] || '');
      setUsage(usageRes.usage || {});
    } catch (err: any) {
      setError(err?.message || t('notification.refresh_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleEnabled = async () => {
    if (disableControls) return;

    const newEnabled = !rateLimiting.enabled;
    setSaving(true);
    try {
      await rateLimitsApi.updateRateLimiting({
        ...rateLimiting,
        enabled: newEnabled,
      });
      setRateLimiting((prev) => ({ ...prev, enabled: newEnabled }));
      showNotification(t('rate_limits.settings_updated'), 'success');
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlobalSettings = async () => {
    if (disableControls) return;

    setSaving(true);
    try {
      const newConfig: RateLimitingConfig = {
        enabled: rateLimiting.enabled,
        'exceeded-status-code': parseInt(statusCodeInput, 10) || 429,
        'persistence-path': persistencePathInput.trim() || undefined,
      };
      await rateLimitsApi.updateRateLimiting(newConfig);
      setRateLimiting(newConfig);
      showNotification(t('rate_limits.settings_updated'), 'success');
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingKey(null);
    setFormData(emptyConfigForm);
    setProviderInput('');
    setAuthIdInput('');
    setModalOpen(true);
  };

  const openEditModal = (config: ApiKeyConfig) => {
    setEditingKey(config.key);
    setFormData({
      key: config.key,
      requestsPerDay: config.limits?.['requests-per-day']?.toString() || '',
      requestsPerMonth: config.limits?.['requests-per-month']?.toString() || '',
      tokensPerDay: config.limits?.['tokens-per-day']?.toString() || '',
      tokensPerMonth: config.limits?.['tokens-per-month']?.toString() || '',
      allowedProviders: config['allowed-providers'] || [],
      authIds: config['auth-ids'] || [],
    });
    setProviderInput('');
    setAuthIdInput('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(emptyConfigForm);
    setEditingKey(null);
  };

  const handleAddTag = (field: 'allowedProviders' | 'authIds', value: string, setter: (v: string) => void) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!formData[field].includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], trimmed],
      }));
    }
    setter('');
  };

  const handleRemoveTag = (field: 'allowedProviders' | 'authIds', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'allowedProviders' | 'authIds',
    value: string,
    setter: (v: string) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(field, value, setter);
    }
  };

  const handleSave = async () => {
    if (!formData.key.trim()) {
      showNotification(t('rate_limits.key_required'), 'error');
      return;
    }

    const limits: ApiKeyLimits = {};
    if (formData.requestsPerDay) limits['requests-per-day'] = parseInt(formData.requestsPerDay, 10);
    if (formData.requestsPerMonth) limits['requests-per-month'] = parseInt(formData.requestsPerMonth, 10);
    if (formData.tokensPerDay) limits['tokens-per-day'] = parseInt(formData.tokensPerDay, 10);
    if (formData.tokensPerMonth) limits['tokens-per-month'] = parseInt(formData.tokensPerMonth, 10);

    const config: ApiKeyConfig = {
      key: formData.key.trim(),
      limits: Object.keys(limits).length > 0 ? limits : undefined,
      'allowed-providers': formData.allowedProviders.length > 0 ? formData.allowedProviders : undefined,
      'auth-ids': formData.authIds.length > 0 ? formData.authIds : undefined,
    };

    setSaving(true);
    try {
      if (editingKey) {
        await rateLimitsApi.updateConfig(editingKey, config);
        setConfigs((prev) => prev.map((c) => (c.key === editingKey ? config : c)));
        showNotification(t('rate_limits.config_updated'), 'success');
      } else {
        await rateLimitsApi.addConfig(config);
        setConfigs((prev) => [...prev, config]);
        showNotification(t('rate_limits.config_added'), 'success');
      }
      closeModal();
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(t('rate_limits.delete_confirm'))) return;

    setSaving(true);
    try {
      await rateLimitsApi.deleteConfig(key);
      setConfigs((prev) => prev.filter((c) => c.key !== key));
      showNotification(t('rate_limits.config_deleted'), 'success');
    } catch (err: any) {
      showNotification(`${t('notification.delete_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetUsage = async (key: string) => {
    if (!window.confirm(t('rate_limits.reset_confirm'))) return;

    setSaving(true);
    try {
      await rateLimitsApi.resetUsage(key);
      setUsage((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      showNotification(t('rate_limits.usage_reset'), 'success');
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatLimit = (value?: number) => {
    if (!value || value === 0) return t('rate_limits.unlimited');
    return value.toLocaleString();
  };

  const getUsagePercent = (used: number, limit?: number) => {
    if (!limit || limit === 0) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  };

  const getUsageClass = (percent: number) => {
    if (percent >= 90) return styles.high;
    if (percent >= 70) return styles.medium;
    return styles.low;
  };

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
        {t('common.refresh')}
      </Button>
      <Button size="sm" onClick={openAddModal} disabled={disableControls}>
        {t('rate_limits.add_config')}
      </Button>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('rate_limits.title')}</h1>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="flex-center" style={{ padding: '48px 0' }}>
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <>
          <Card title={t('rate_limits.global_settings')} className={styles.section}>
            <div className={styles.globalSettings}>
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('rate_limits.enabled_label')}</span>
                  <span className={styles.settingDesc}>{t('rate_limits.enabled_desc')}</span>
                </div>
                <div className={styles.settingControl}>
                  <div
                    className={`${styles.toggle} ${rateLimiting.enabled ? styles.active : ''} ${disableControls || saving ? styles.disabled : ''}`}
                    onClick={handleToggleEnabled}
                  >
                    <div className={styles.toggleKnob} />
                  </div>
                </div>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('rate_limits.status_code_label')}</span>
                  <span className={styles.settingDesc}>{t('rate_limits.status_code_desc')}</span>
                </div>
                <div className={styles.settingControl}>
                  <Input
                    type="number"
                    value={statusCodeInput}
                    onChange={(e) => setStatusCodeInput(e.target.value)}
                    style={{ width: 100 }}
                    disabled={disableControls}
                  />
                </div>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingLabel}>{t('rate_limits.persistence_label')}</span>
                  <span className={styles.settingDesc}>{t('rate_limits.persistence_desc')}</span>
                </div>
                <div className={styles.settingControl}>
                  <Input
                    value={persistencePathInput}
                    onChange={(e) => setPersistencePathInput(e.target.value)}
                    placeholder={t('rate_limits.persistence_placeholder')}
                    style={{ width: 250 }}
                    disabled={disableControls}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleSaveGlobalSettings} disabled={disableControls || saving} loading={saving}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t('rate_limits.configs_title')} extra={actionButtons} className={styles.section}>
            {configs.length === 0 ? (
              <EmptyState
                title={t('rate_limits.empty_title')}
                description={t('rate_limits.empty_desc')}
                action={
                  <Button onClick={openAddModal} disabled={disableControls}>
                    {t('rate_limits.add_config')}
                  </Button>
                }
              />
            ) : (
              <div className={styles.configsList}>
                {configs.map((config) => {
                  const keyUsage = usage[config.key];
                  return (
                    <div key={config.key} className={styles.configItem}>
                      <div className={styles.configHeader}>
                        <span className={styles.configKey}>{config.key}</span>
                        <div className={styles.configActions}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(config)}
                            disabled={disableControls}
                          >
                            {t('common.edit')}
                          </Button>
                          {keyUsage && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleResetUsage(config.key)}
                              disabled={disableControls || saving}
                            >
                              {t('rate_limits.reset_usage')}
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(config.key)}
                            disabled={disableControls || saving}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                      <div className={styles.configDetails}>
                        <div className={styles.configDetail}>
                          <span className={styles.detailLabel}>{t('rate_limits.requests_day')}:</span>
                          <span className={styles.limitBadge}>{formatLimit(config.limits?.['requests-per-day'])}</span>
                          {keyUsage && config.limits?.['requests-per-day'] && (
                            <div className={styles.usageBar}>
                              <div className={styles.usageBarTrack}>
                                <div
                                  className={`${styles.usageBarFill} ${getUsageClass(getUsagePercent(keyUsage.requests_today, config.limits['requests-per-day']))}`}
                                  style={{ width: `${getUsagePercent(keyUsage.requests_today, config.limits['requests-per-day'])}%` }}
                                />
                              </div>
                              <span className={styles.usagePercent}>
                                {keyUsage.requests_today.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className={styles.configDetail}>
                          <span className={styles.detailLabel}>{t('rate_limits.tokens_day')}:</span>
                          <span className={styles.limitBadge}>{formatLimit(config.limits?.['tokens-per-day'])}</span>
                          {keyUsage && config.limits?.['tokens-per-day'] && (
                            <div className={styles.usageBar}>
                              <div className={styles.usageBarTrack}>
                                <div
                                  className={`${styles.usageBarFill} ${getUsageClass(getUsagePercent(keyUsage.tokens_today, config.limits['tokens-per-day']))}`}
                                  style={{ width: `${getUsagePercent(keyUsage.tokens_today, config.limits['tokens-per-day'])}%` }}
                                />
                              </div>
                              <span className={styles.usagePercent}>
                                {keyUsage.tokens_today.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                        {config['allowed-providers'] && config['allowed-providers'].length > 0 && (
                          <div className={styles.configDetail}>
                            <span className={styles.detailLabel}>{t('rate_limits.providers')}:</span>
                            {config['allowed-providers'].map((p, i) => (
                              <span key={i} className={styles.providerBadge}>{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingKey ? t('rate_limits.edit_config_title') : t('rate_limits.add_config_title')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingKey ? t('common.update') : t('common.add')}
            </Button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <Input
              label={t('rate_limits.key_label')}
              placeholder={t('rate_limits.key_placeholder')}
              value={formData.key}
              onChange={(e) => setFormData((prev) => ({ ...prev, key: e.target.value }))}
              disabled={!!editingKey}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('rate_limits.limits_label')}</label>
            <div className={styles.formHint}>{t('rate_limits.limits_hint')}</div>
            <div className={styles.limitsGrid}>
              <div className={styles.limitInput}>
                <span className={styles.limitInputLabel}>{t('rate_limits.requests_day')}</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.requestsPerDay}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requestsPerDay: e.target.value }))}
                />
              </div>
              <div className={styles.limitInput}>
                <span className={styles.limitInputLabel}>{t('rate_limits.requests_month')}</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.requestsPerMonth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requestsPerMonth: e.target.value }))}
                />
              </div>
              <div className={styles.limitInput}>
                <span className={styles.limitInputLabel}>{t('rate_limits.tokens_day')}</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.tokensPerDay}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tokensPerDay: e.target.value }))}
                />
              </div>
              <div className={styles.limitInput}>
                <span className={styles.limitInputLabel}>{t('rate_limits.tokens_month')}</span>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.tokensPerMonth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tokensPerMonth: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('rate_limits.providers_label')}</label>
            <div className={styles.formHint}>{t('rate_limits.providers_hint')}</div>
            <div className={styles.tagInput}>
              {formData.allowedProviders.map((provider, i) => (
                <span key={i} className={styles.tag}>
                  {provider}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => handleRemoveTag('allowedProviders', i)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={styles.tagInputField}
                placeholder={t('rate_limits.providers_placeholder')}
                value={providerInput}
                onChange={(e) => setProviderInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'allowedProviders', providerInput, setProviderInput)}
                onBlur={() => handleAddTag('allowedProviders', providerInput, setProviderInput)}
                list="provider-options"
              />
              <datalist id="provider-options">
                {PROVIDER_OPTIONS.filter((p) => !formData.allowedProviders.includes(p)).map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('rate_limits.auth_ids_label')}</label>
            <div className={styles.formHint}>{t('rate_limits.auth_ids_hint')}</div>
            <div className={styles.tagInput}>
              {formData.authIds.map((id, i) => (
                <span key={i} className={styles.tag}>
                  {id}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => handleRemoveTag('authIds', i)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={styles.tagInputField}
                placeholder={t('rate_limits.auth_ids_placeholder')}
                value={authIdInput}
                onChange={(e) => setAuthIdInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'authIds', authIdInput, setAuthIdInput)}
                onBlur={() => handleAddTag('authIds', authIdInput, setAuthIdInput)}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
