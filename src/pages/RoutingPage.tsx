import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuthStore, useNotificationStore } from '@/stores';
import { routingApi } from '@/services/api';
import type { RoutingStrategy, PriorityRule } from '@/types';
import styles from './RoutingPage.module.scss';

interface RuleFormData {
  models: string[];
  order: string[];
  fallback: boolean;
}

const emptyRuleForm: RuleFormData = {
  models: [],
  order: [],
  fallback: true,
};

export function RoutingPage() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const [strategy, setStrategy] = useState<RoutingStrategy>('round-robin');
  const [rules, setRules] = useState<PriorityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(emptyRuleForm);
  const [modelInput, setModelInput] = useState('');
  const [orderInput, setOrderInput] = useState('');

  const disableControls = connectionStatus !== 'connected';

  const loadRouting = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const config = await routingApi.getConfig();
      setStrategy(config.strategy || 'round-robin');
      setRules(config.priority || []);
    } catch (err: any) {
      setError(err?.message || t('notification.refresh_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRouting();
  }, [loadRouting]);

  const handleStrategyChange = async (newStrategy: RoutingStrategy) => {
    if (newStrategy === strategy || disableControls) return;

    setSaving(true);
    try {
      await routingApi.updateStrategy(newStrategy);
      setStrategy(newStrategy);
      showNotification(t('routing.strategy_updated'), 'success');
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingIndex(null);
    setFormData(emptyRuleForm);
    setModelInput('');
    setOrderInput('');
    setModalOpen(true);
  };

  const openEditModal = (index: number) => {
    const rule = rules[index];
    setEditingIndex(index);
    setFormData({
      models: rule.models || [],
      order: rule.order.map((o) => o.pattern),
      fallback: rule.fallback !== false,
    });
    setModelInput('');
    setOrderInput('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(emptyRuleForm);
    setEditingIndex(null);
  };

  const handleAddTag = (
    field: 'models' | 'order',
    value: string,
    setter: (v: string) => void
  ) => {
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

  const handleRemoveTag = (field: 'models' | 'order', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'models' | 'order',
    value: string,
    setter: (v: string) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(field, value, setter);
    }
  };

  const handleSave = async () => {
    if (formData.order.length === 0) {
      showNotification(t('routing.order_required'), 'error');
      return;
    }

    const rule: PriorityRule = {
      models: formData.models,
      order: formData.order.map((pattern) => ({ pattern })),
      fallback: formData.fallback,
    };

    setSaving(true);
    try {
      if (editingIndex !== null) {
        await routingApi.updatePriorityRule(editingIndex, rule);
        const nextRules = rules.map((r, i) => (i === editingIndex ? rule : r));
        setRules(nextRules);
        showNotification(t('routing.rule_updated'), 'success');
      } else {
        await routingApi.addPriorityRule(rule);
        setRules([...rules, rule]);
        showNotification(t('routing.rule_added'), 'success');
      }
      closeModal();
    } catch (err: any) {
      showNotification(`${t('notification.update_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (index: number) => {
    if (!window.confirm(t('routing.delete_confirm'))) return;

    setSaving(true);
    try {
      await routingApi.deletePriorityRule(index);
      setRules(rules.filter((_, i) => i !== index));
      showNotification(t('routing.rule_deleted'), 'success');
    } catch (err: any) {
      showNotification(`${t('notification.delete_failed')}: ${err?.message || ''}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const strategyOptions: { value: RoutingStrategy; name: string; desc: string }[] = [
    {
      value: 'round-robin',
      name: t('routing.strategy_round_robin'),
      desc: t('routing.strategy_round_robin_desc'),
    },
    {
      value: 'fill-first',
      name: t('routing.strategy_fill_first'),
      desc: t('routing.strategy_fill_first_desc'),
    },
  ];

  const actionButtons = (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="secondary" size="sm" onClick={loadRouting} disabled={loading}>
        {t('common.refresh')}
      </Button>
      <Button size="sm" onClick={openAddModal} disabled={disableControls}>
        {t('routing.add_rule')}
      </Button>
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('routing.title')}</h1>

      {error && <div className="error-box">{error}</div>}

      {loading ? (
        <div className="flex-center" style={{ padding: '48px 0' }}>
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <>
          <Card title={t('routing.strategy_title')} className={styles.strategyCard}>
            <div className={styles.strategySelector}>
              {strategyOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`${styles.strategyOption} ${strategy === opt.value ? styles.active : ''} ${disableControls || saving ? styles.disabled : ''}`}
                  onClick={() => handleStrategyChange(opt.value)}
                >
                  <div className={styles.strategyRadio} />
                  <div className={styles.strategyInfo}>
                    <div className={styles.strategyName}>{opt.name}</div>
                    <div className={styles.strategyDesc}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t('routing.priority_rules_title')} extra={actionButtons}>
            {rules.length === 0 ? (
              <EmptyState
                title={t('routing.empty_title')}
                description={t('routing.empty_desc')}
                action={
                  <Button onClick={openAddModal} disabled={disableControls}>
                    {t('routing.add_rule')}
                  </Button>
                }
              />
            ) : (
              <div className={styles.rulesList}>
                {rules.map((rule, index) => (
                  <div key={index} className={styles.ruleItem}>
                    <div className={styles.ruleDragHandle}>&#x2630;</div>
                    <div className={styles.ruleContent}>
                      <div className={styles.ruleHeader}>
                        <span className={styles.ruleIndex}>{index + 1}</span>
                        {rule.models.length > 0 ? (
                          <span className={styles.ruleModels}>
                            {rule.models.join(', ')}
                          </span>
                        ) : (
                          <span className={styles.ruleDefault}>
                            {t('routing.default_rule')}
                          </span>
                        )}
                      </div>
                      <div className={styles.ruleDetails}>
                        <div className={styles.ruleOrder}>
                          <span className={styles.ruleOrderLabel}>
                            {t('routing.order')}:
                          </span>
                          {rule.order.map((o, i) => (
                            <span key={i}>
                              {i > 0 && <span className={styles.ruleArrow}>→</span>}
                              <span className={styles.rulePattern}>{o.pattern}</span>
                            </span>
                          ))}
                        </div>
                        <div className={styles.ruleFallback}>
                          <span
                            className={`${styles.ruleFallbackIcon} ${rule.fallback !== false ? styles.enabled : styles.disabled}`}
                          >
                            {rule.fallback !== false ? '✓' : '✗'}
                          </span>
                          <span>{t('routing.fallback')}</span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.ruleActions}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(index)}
                        disabled={disableControls}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(index)}
                        disabled={disableControls || saving}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editingIndex !== null
            ? t('routing.edit_rule_title')
            : t('routing.add_rule_title')
        }
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingIndex !== null ? t('common.update') : t('common.add')}
            </Button>
          </>
        }
      >
        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('routing.models_label')}</label>
            <div className={styles.formHint}>{t('routing.models_hint')}</div>
            <div className={styles.tagInput}>
              {formData.models.map((model, i) => (
                <span key={i} className={styles.tag}>
                  {model}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => handleRemoveTag('models', i)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={styles.tagInputField}
                placeholder={t('routing.models_placeholder')}
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'models', modelInput, setModelInput)}
                onBlur={() => handleAddTag('models', modelInput, setModelInput)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('routing.order_label')}</label>
            <div className={styles.formHint}>{t('routing.order_hint')}</div>
            <div className={styles.tagInput}>
              {formData.order.map((pattern, i) => (
                <span key={i} className={styles.tag}>
                  {pattern}
                  <button
                    type="button"
                    className={styles.tagRemove}
                    onClick={() => handleRemoveTag('order', i)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                className={styles.tagInputField}
                placeholder={t('routing.order_placeholder')}
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'order', orderInput, setOrderInput)}
                onBlur={() => handleAddTag('order', orderInput, setOrderInput)}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.fallbackToggle}>
              <div
                className={`${styles.toggle} ${formData.fallback ? styles.active : ''}`}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, fallback: !prev.fallback }))
                }
              >
                <div className={styles.toggleKnob} />
              </div>
              <span className={styles.toggleLabel}>{t('routing.fallback_label')}</span>
            </div>
            <div className={styles.formHint}>{t('routing.fallback_hint')}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
