import { useState } from 'react';
import { Modal } from '../../components/feedback/Modal';
import { toast } from '../../components/feedback/Toast';
import { datasourceService } from '../../services/datasourceService';
import { sourceSystemLabels } from '../../types/resources';
import type { SourceSystem } from '../../types/resources';
import type { ConnectionMode, DataSourceConfig, SyncFrequency } from '../../types/datasource';
import { connectionModeLabels } from '../../types/datasource';
import './datasource.css';

type FormFieldType = {
  name: string;
  type: SourceSystem;
  connectionMode: ConnectionMode;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  jdbcUrl: string;
  syncFrequency: SyncFrequency;
  adhocQueryEnabled: boolean;
};

type FieldErrors = Partial<Record<keyof FormFieldType, string>>;

const dataSourceTypes: SourceSystem[] = ['MySQL', 'MaxCompute', 'SelectDB'];

const defaultForm: FormFieldType = {
  name: '',
  type: 'MySQL',
  connectionMode: 'ip_port',
  host: '',
  port: '3306',
  database: '',
  username: '',
  password: '',
  jdbcUrl: '',
  syncFrequency: 'daily',
  adhocQueryEnabled: false,
};

type DataSourceFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  dataSource?: DataSourceConfig;
  onClose: () => void;
  onSuccess: () => void;
};

export function DataSourceFormModal({ open, mode, dataSource, onClose, onSuccess }: DataSourceFormModalProps) {
  const [form, setForm] = useState<FormFieldType>(() => {
    if (mode === 'edit' && dataSource) {
      return {
        name: dataSource.name,
        type: dataSource.type,
        connectionMode: dataSource.connectionMode,
        host: dataSource.host,
        port: dataSource.port ? String(dataSource.port) : '3306',
        database: dataSource.database,
        username: dataSource.username,
        password: dataSource.password,
        jdbcUrl: dataSource.jdbcUrl,
        syncFrequency: dataSource.syncFrequency,
        adhocQueryEnabled: dataSource.adhocQueryEnabled,
      };
    }
    return { ...defaultForm };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingDbs, setFetchingDbs] = useState(false);
  const [dbOptions, setDbOptions] = useState<string[]>([]);

  const update = <K extends keyof FormFieldType>(key: K, value: FormFieldType[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = '数据源名称至少 2 个字符';
    } else if (form.name.trim().length > 50) {
      next.name = '数据源名称最多 50 个字符';
    }
    if (form.connectionMode === 'ip_port') {
      if (!form.host.trim()) next.host = '请输入主机地址';
      const portNum = Number(form.port);
      if (!form.port || isNaN(portNum) || portNum < 1 || portNum > 65535) {
        next.port = '端口范围为 1-65535';
      }
      if (!form.database.trim()) next.database = '请选择数据库';
      if (!form.username.trim()) next.username = '请输入用户名';
      if (!form.password.trim()) next.password = '请输入密码';
    } else {
      if (!form.jdbcUrl.trim()) next.jdbcUrl = '请输入JDBC连接串';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleFetchDatabases = async () => {
    if (!form.host || !form.port || !form.username || !form.password) {
      toast.warning('请先填写主机、端口、用户名和密码');
      return;
    }
    setFetchingDbs(true);
    const result = await datasourceService.fetchDatabases({
      type: form.type,
      host: form.host.trim(),
      port: Number(form.port),
      username: form.username.trim(),
      password: form.password,
    });
    setFetchingDbs(false);
    if (result.success) {
      setDbOptions(result.databases);
      toast.success(`已获取 ${result.databases.length} 个数据库`);
    } else {
      toast.error(result.message ?? '获取数据库列表失败');
    }
  };

  const handleTest = async () => {
    if (form.connectionMode === 'ip_port') {
      if (!form.host || !form.port || !form.database || !form.username || !form.password) {
        toast.warning('请先填写完整连接信息');
        return;
      }
    } else {
      if (!form.jdbcUrl) {
        toast.warning('请先填写JDBC连接串');
        return;
      }
    }
    setTesting(true);
    const result = await datasourceService.testConnection({
      type: form.type,
      connectionMode: form.connectionMode,
      host: form.host,
      port: Number(form.port),
      database: form.database,
      username: form.username,
      password: form.password,
      jdbcUrl: form.jdbcUrl,
    });
    setTesting(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      connectionMode: form.connectionMode,
      host: form.connectionMode === 'ip_port' ? form.host.trim() : '',
      port: form.connectionMode === 'ip_port' ? Number(form.port) : 0,
      database: form.connectionMode === 'ip_port' ? form.database.trim() : '',
      username: form.connectionMode === 'ip_port' ? form.username.trim() : '',
      password: form.connectionMode === 'ip_port' ? form.password : '',
      jdbcUrl: form.connectionMode === 'jdbc' ? form.jdbcUrl.trim() : '',
      syncFrequency: form.syncFrequency,
      adhocQueryEnabled: form.adhocQueryEnabled,
    };
    if (mode === 'create') {
      await datasourceService.create(payload);
      toast.success('数据源已创建');
    } else if (mode === 'edit' && dataSource) {
      await datasourceService.update(dataSource.id, payload);
      toast.success('数据源已更新');
    }
    setSaving(false);
    onSuccess();
  };

  return (
    <Modal open={open} title={mode === 'create' ? '新增数据源' : '编辑数据源'} onClose={onClose} className="ds-form-modal">
      <div className="ds-form__body">
        {/* ── 基本信息 ── */}
        <div className="ds-form__section">
          <div className="ds-form__section-title">基本信息</div>
          <div className="ds-form__grid">
            <div className="ds-form__field ds-form__field--full">
              <label className="ds-form__label">
                数据源名称<span className="ds-form__required">*</span>
              </label>
              <input
                className={`ds-form__input ${errors.name ? 'ds-form__input--error' : ''}`}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="如：生产MySQL-订单库"
              />
              {errors.name && <span className="ds-form__error-msg">{errors.name}</span>}
            </div>

            <div className="ds-form__field">
              <label className="ds-form__label">
                数据源类型<span className="ds-form__required">*</span>
              </label>
              <select className="ds-form__select" value={form.type} onChange={(e) => update('type', e.target.value as SourceSystem)}>
                {dataSourceTypes.map((t) => (
                  <option key={t} value={t}>{sourceSystemLabels[t]}</option>
                ))}
              </select>
            </div>

            <div className="ds-form__field">
              <label className="ds-form__label">
                同步频率<span className="ds-form__required">*</span>
              </label>
              <select className="ds-form__select" value={form.syncFrequency} onChange={(e) => update('syncFrequency', e.target.value as SyncFrequency)}>
                <option value="hourly">每小时</option>
                <option value="daily">每天</option>
                <option value="manual">仅手动</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 连接配置 ── */}
        <div className="ds-form__section">
          <div className="ds-form__section-title">连接配置</div>
          <div className="ds-form__seg-control">
            {(['ip_port', 'jdbc'] as ConnectionMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={`ds-form__seg ${form.connectionMode === m ? 'ds-form__seg--active' : ''}`}
                onClick={() => update('connectionMode', m)}
              >
                {connectionModeLabels[m]}
              </button>
            ))}
          </div>

          {form.connectionMode === 'ip_port' ? (
            <div className="ds-form__grid">
              <div className="ds-form__field">
                <label className="ds-form__label">
                  主机地址<span className="ds-form__required">*</span>
                </label>
                <input
                  className={`ds-form__input ${errors.host ? 'ds-form__input--error' : ''}`}
                  value={form.host}
                  onChange={(e) => update('host', e.target.value)}
                  placeholder="如：10.20.30.40"
                />
                {errors.host && <span className="ds-form__error-msg">{errors.host}</span>}
              </div>

              <div className="ds-form__field">
                <label className="ds-form__label">
                  端口<span className="ds-form__required">*</span>
                </label>
                <input
                  className={`ds-form__input ${errors.port ? 'ds-form__input--error' : ''}`}
                  value={form.port}
                  onChange={(e) => update('port', e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="如：3306"
                />
                {errors.port && <span className="ds-form__error-msg">{errors.port}</span>}
              </div>

              <div className="ds-form__field ds-form__field--full">
                <label className="ds-form__label">
                  数据库<span className="ds-form__required">*</span>
                </label>
                <div className="ds-form__db-select-row">
                  <select
                    className={`ds-form__select ${errors.database ? 'ds-form__input--error' : ''} ${dbOptions.length === 0 ? 'ds-form__select--disabled' : ''}`}
                    value={form.database}
                    onChange={(e) => update('database', e.target.value)}
                    disabled={dbOptions.length === 0}
                  >
                    <option value="">
                      {dbOptions.length === 0 ? '请先获取数据库列表' : '请选择数据库'}
                    </option>
                    {dbOptions.map((db) => (
                      <option key={db} value={db}>{db}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="ds-list__btn ds-list__btn--default ds-form__fetch-btn"
                    onClick={handleFetchDatabases}
                    disabled={fetchingDbs}
                  >
                    {fetchingDbs ? '拉取中...' : '获取数据库列表'}
                  </button>
                </div>
                {errors.database && <span className="ds-form__error-msg">{errors.database}</span>}
              </div>
            </div>
          ) : (
            <div className="ds-form__grid">
              <div className="ds-form__field ds-form__field--full">
                <label className="ds-form__label">
                  JDBC连接串<span className="ds-form__required">*</span>
                </label>
                <textarea
                  className={`ds-form__textarea ${errors.jdbcUrl ? 'ds-form__input--error' : ''}`}
                  value={form.jdbcUrl}
                  onChange={(e) => update('jdbcUrl', e.target.value)}
                  placeholder="如：jdbc:mysql://10.20.30.40:3306/wlyd_orders?user=readonly&password=xxx"
                  rows={3}
                />
                {errors.jdbcUrl && <span className="ds-form__error-msg">{errors.jdbcUrl}</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── 认证信息（仅 IP端口 模式） ── */}
        {form.connectionMode === 'ip_port' && (
          <div className="ds-form__section">
            <div className="ds-form__section-title">认证信息</div>
            <div className="ds-form__grid">
              <div className="ds-form__field">
                <label className="ds-form__label">
                  用户名<span className="ds-form__required">*</span>
                </label>
                <input
                  className={`ds-form__input ${errors.username ? 'ds-form__input--error' : ''}`}
                  value={form.username}
                  onChange={(e) => update('username', e.target.value)}
                  placeholder="如：readonly"
                />
                {errors.username && <span className="ds-form__error-msg">{errors.username}</span>}
              </div>

              <div className="ds-form__field">
                <label className="ds-form__label">
                  密码<span className="ds-form__required">*</span>
                </label>
                <input
                  type="password"
                  className={`ds-form__input ${errors.password ? 'ds-form__input--error' : ''}`}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="请输入密码"
                />
                {errors.password && <span className="ds-form__error-msg">{errors.password}</span>}
              </div>
            </div>
          </div>
        )}

        {/* ── 即席查询 ── */}
        <div className="ds-form__section">
          <div className="ds-form__section-title">即席查询</div>
          <div className="ds-form__field ds-form__field--full">
            <div className="ds-form__toggle-row">
              <button
                type="button"
                className={`ds-toggle ${form.adhocQueryEnabled ? 'ds-toggle--on' : ''}`}
                onClick={() => update('adhocQueryEnabled', !form.adhocQueryEnabled)}
              >
                <span className="ds-toggle__thumb" />
              </button>
              <span className="ds-form__toggle-label">启用即席查询（开启后该数据源下所有表支持在资产平台进行即席查询）</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-form__footer">
        <button
          type="button"
          className="ds-list__btn ds-list__btn--default"
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? '测试中...' : '测试连接'}
        </button>
        <div className="ds-form__footer-right">
          <button type="button" className="ds-list__btn ds-list__btn--default" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="ds-list__btn ds-list__btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '确定'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
