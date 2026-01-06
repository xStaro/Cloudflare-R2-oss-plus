<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="dialog-overlay" @click.self="close">
        <div class="dialog-container apikey-dialog">
          <div class="dialog-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
              API Key 管理
            </h3>
            <button class="dialog-close" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <!-- 创建新密钥面板 -->
            <div v-if="showCreateForm" class="create-form">
              <h4>{{ editingKey ? '编辑 API Key' : '创建新的 API Key' }}</h4>

              <div class="form-group">
                <label>名称 <span class="required">*</span></label>
                <input
                  v-model="formData.name"
                  type="text"
                  placeholder="例如：PicGo图床、备份脚本"
                  :disabled="!!editingKey"
                />
              </div>

              <div class="form-group">
                <label>权限 <span class="required">*</span></label>
                <div class="permission-options">
                  <label class="radio-option">
                    <input type="radio" v-model="formData.permissionType" value="all" />
                    <span>全部目录</span>
                  </label>
                  <label class="radio-option">
                    <input type="radio" v-model="formData.permissionType" value="specific" />
                    <span>指定目录</span>
                  </label>
                </div>
                <input
                  v-if="formData.permissionType === 'specific'"
                  v-model="formData.permissionPaths"
                  type="text"
                  placeholder="用逗号分隔多个目录，例如：/images, /uploads"
                  class="permission-input"
                />
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="formData.isReadonly" />
                  <span>只读（仅下载，不能上传/删除）</span>
                </label>
              </div>

              <div class="form-group">
                <label>有效期</label>
                <div class="expiry-options">
                  <label class="radio-option" v-for="opt in expiryOptions" :key="opt.value">
                    <input type="radio" v-model="formData.expiresIn" :value="opt.value" />
                    <span>{{ opt.label }}</span>
                  </label>
                </div>
              </div>

              <div class="form-actions">
                <button class="btn btn-secondary" @click="cancelCreate">取消</button>
                <button
                  class="btn btn-primary"
                  @click="editingKey ? saveEdit() : createApiKey()"
                  :disabled="!formData.name || creating"
                >
                  <svg v-if="creating" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  {{ editingKey ? '保存' : '创建' }}
                </button>
              </div>
            </div>

            <!-- 新创建的密钥展示 -->
            <div v-else-if="newlyCreatedKey" class="created-key-panel">
              <div class="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h4>API Key 创建成功</h4>
              <p class="warning-text">请立即复制以下密钥，关闭后无法再次查看！</p>

              <div class="key-display">
                <code>{{ newlyCreatedKey.key }}</code>
                <button class="copy-btn" @click="copyKey(newlyCreatedKey.key)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  复制
                </button>
              </div>

              <div class="usage-example">
                <p>使用方式：</p>
                <code>curl -H "Authorization: Bearer {{ newlyCreatedKey.key }}" \<br/>     https://your-site.com/api/...</code>
              </div>

              <button class="btn btn-primary full-width" @click="newlyCreatedKey = null">
                完成
              </button>
            </div>

            <!-- API Key 列表 -->
            <div v-else class="key-list-panel">
              <div class="panel-header">
                <span class="key-count">共 {{ apiKeys.length }} 个密钥</span>
                <button class="btn btn-primary btn-sm" @click="showCreateForm = true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  新建密钥
                </button>
              </div>

              <div v-if="loading" class="loading-state">
                <svg class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
                <span>加载中...</span>
              </div>

              <div v-else-if="apiKeys.length === 0" class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
                <p>还没有创建任何 API Key</p>
                <button class="btn btn-primary btn-sm" @click="showCreateForm = true">
                  创建第一个密钥
                </button>
              </div>

              <div v-else class="key-list">
                <div v-for="key in apiKeys" :key="key.id" class="key-item" :class="{ disabled: !key.enabled }">
                  <div class="key-main">
                    <div class="key-name">
                      <span class="name">{{ key.name }}</span>
                      <span v-if="!key.enabled" class="badge badge-disabled">已禁用</span>
                      <span v-else-if="isExpired(key)" class="badge badge-expired">已过期</span>
                      <span v-else-if="key.isReadonly" class="badge badge-readonly">只读</span>
                    </div>
                    <div class="key-preview">{{ key.keyPreview }}</div>
                  </div>

                  <div class="key-meta">
                    <div class="meta-item">
                      <span class="meta-label">权限</span>
                      <span class="meta-value">{{ formatPermissions(key.permissions) }}</span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">过期时间</span>
                      <span class="meta-value" :class="{ expired: isExpired(key) }">
                        {{ formatExpiry(key.expiresAt) }}
                      </span>
                    </div>
                    <div class="meta-item">
                      <span class="meta-label">最后使用</span>
                      <span class="meta-value">{{ formatLastUsed(key.lastUsed) }}</span>
                    </div>
                  </div>

                  <div class="key-actions">
                    <button class="action-btn" @click="toggleEnabled(key)" :title="key.enabled ? '禁用' : '启用'">
                      <svg v-if="key.enabled" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
                        <line x1="12" y1="2" x2="12" y2="12"/>
                      </svg>
                      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                    </button>
                    <button class="action-btn" @click="editKey(key)" title="编辑">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button class="action-btn danger" @click="confirmDelete(key)" title="删除">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 删除确认对话框 -->
    <Transition name="dialog-fade">
      <div v-if="deleteConfirm" class="dialog-overlay" @click.self="deleteConfirm = null">
        <div class="dialog-container confirm-dialog">
          <div class="dialog-header">
            <h3>确认删除</h3>
          </div>
          <div class="dialog-body">
            <p>确定要删除 API Key "<strong>{{ deleteConfirm.name }}</strong>" 吗？</p>
            <p class="warning-text">此操作不可撤销，使用此密钥的应用将无法继续访问。</p>
          </div>
          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="deleteConfirm = null">取消</button>
            <button class="btn btn-danger" @click="deleteApiKey" :disabled="deleting">
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'ApiKeyDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'toast'],
  data() {
    return {
      loading: false,
      creating: false,
      deleting: false,
      apiKeys: [],
      showCreateForm: false,
      newlyCreatedKey: null,
      editingKey: null,
      deleteConfirm: null,
      formData: {
        name: '',
        permissionType: 'all',
        permissionPaths: '',
        isReadonly: false,
        expiresIn: null,
      },
      expiryOptions: [
        { label: '永久', value: null },
        { label: '7 天', value: 7 * 24 * 60 * 60 * 1000 },
        { label: '30 天', value: 30 * 24 * 60 * 60 * 1000 },
        { label: '90 天', value: 90 * 24 * 60 * 60 * 1000 },
        { label: '1 年', value: 365 * 24 * 60 * 60 * 1000 },
      ],
    };
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false);
      this.resetForm();
    },

    resetForm() {
      this.showCreateForm = false;
      this.newlyCreatedKey = null;
      this.editingKey = null;
      this.formData = {
        name: '',
        permissionType: 'all',
        permissionPaths: '',
        isReadonly: false,
        expiresIn: null,
      };
    },

    cancelCreate() {
      this.resetForm();
    },

    getAuthHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const credentials = localStorage.getItem('auth_credentials');
      if (credentials) {
        headers['Authorization'] = `Basic ${credentials}`;
      }
      return headers;
    },

    async loadApiKeys() {
      this.loading = true;
      try {
        const response = await fetch('/api/apikeys', {
          headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('获取 API Key 列表失败');
        }

        const data = await response.json();
        this.apiKeys = data.apiKeys || [];
      } catch (error) {
        console.error('Load API Keys error:', error);
        this.$emit('toast', { type: 'error', message: error.message });
      } finally {
        this.loading = false;
      }
    },

    async createApiKey() {
      if (!this.formData.name) return;

      this.creating = true;
      try {
        const permissions = this.formData.permissionType === 'all'
          ? ['*']
          : this.formData.permissionPaths.split(',').map(p => p.trim()).filter(Boolean);

        if (permissions.length === 0) {
          this.$emit('toast', { type: 'error', message: '请输入至少一个目录权限' });
          return;
        }

        const response = await fetch('/api/apikeys', {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            name: this.formData.name,
            permissions,
            isReadonly: this.formData.isReadonly,
            expiresIn: this.formData.expiresIn,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '创建失败');
        }

        const data = await response.json();
        this.newlyCreatedKey = data.apiKey;
        this.showCreateForm = false;
        this.$emit('toast', { type: 'success', message: 'API Key 创建成功' });

        // 刷新列表
        await this.loadApiKeys();
      } catch (error) {
        console.error('Create API Key error:', error);
        this.$emit('toast', { type: 'error', message: error.message });
      } finally {
        this.creating = false;
      }
    },

    editKey(key) {
      this.editingKey = key;
      this.formData = {
        name: key.name,
        permissionType: key.permissions.includes('*') ? 'all' : 'specific',
        permissionPaths: key.permissions.includes('*') ? '' : key.permissions.join(', '),
        isReadonly: key.isReadonly,
        expiresIn: null, // 编辑时不修改过期时间
      };
      this.showCreateForm = true;
    },

    async saveEdit() {
      if (!this.editingKey) return;

      this.creating = true;
      try {
        const permissions = this.formData.permissionType === 'all'
          ? ['*']
          : this.formData.permissionPaths.split(',').map(p => p.trim()).filter(Boolean);

        const response = await fetch(`/api/apikeys/${this.editingKey.id}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            permissions,
            isReadonly: this.formData.isReadonly,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '保存失败');
        }

        this.$emit('toast', { type: 'success', message: '保存成功' });
        this.resetForm();
        await this.loadApiKeys();
      } catch (error) {
        console.error('Save API Key error:', error);
        this.$emit('toast', { type: 'error', message: error.message });
      } finally {
        this.creating = false;
      }
    },

    async toggleEnabled(key) {
      try {
        const response = await fetch(`/api/apikeys/${key.id}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            enabled: !key.enabled,
          }),
        });

        if (!response.ok) {
          throw new Error('操作失败');
        }

        this.$emit('toast', {
          type: 'success',
          message: key.enabled ? '已禁用' : '已启用'
        });
        await this.loadApiKeys();
      } catch (error) {
        console.error('Toggle enabled error:', error);
        this.$emit('toast', { type: 'error', message: error.message });
      }
    },

    confirmDelete(key) {
      this.deleteConfirm = key;
    },

    async deleteApiKey() {
      if (!this.deleteConfirm) return;

      this.deleting = true;
      try {
        const response = await fetch(`/api/apikeys/${this.deleteConfirm.id}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('删除失败');
        }

        this.$emit('toast', { type: 'success', message: '删除成功' });
        this.deleteConfirm = null;
        await this.loadApiKeys();
      } catch (error) {
        console.error('Delete API Key error:', error);
        this.$emit('toast', { type: 'error', message: error.message });
      } finally {
        this.deleting = false;
      }
    },

    async copyKey(key) {
      try {
        await navigator.clipboard.writeText(key);
        this.$emit('toast', { type: 'success', message: '已复制到剪贴板' });
      } catch (error) {
        // 回退方案
        const textarea = document.createElement('textarea');
        textarea.value = key;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.$emit('toast', { type: 'success', message: '已复制到剪贴板' });
      }
    },

    formatPermissions(permissions) {
      if (permissions.includes('*')) return '全部目录';
      if (permissions.length === 0) return '无';
      if (permissions.length <= 2) return permissions.join(', ');
      return permissions.slice(0, 2).join(', ') + ` +${permissions.length - 2}`;
    },

    formatExpiry(expiresAt) {
      if (!expiresAt) return '永久';
      const date = new Date(expiresAt);
      return date.toLocaleDateString('zh-CN');
    },

    formatLastUsed(lastUsed) {
      if (!lastUsed) return '从未使用';
      const date = new Date(lastUsed);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
      if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
      return date.toLocaleDateString('zh-CN');
    },

    isExpired(key) {
      if (!key.expiresAt) return false;
      return Date.now() > key.expiresAt;
    },
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.loadApiKeys();
      } else {
        this.resetForm();
      }
    }
  }
};
</script>

<style scoped>
.apikey-dialog {
  max-width: 640px;
  width: 95vw;
}

.dialog-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.dialog-header h3 svg {
  width: 22px;
  height: 22px;
  color: var(--primary-color);
}

.dialog-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

/* Panel Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.key-count {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Loading & Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.loading-state svg,
.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 16px 0;
}

/* Key List */
.key-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.key-item {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.key-item:hover {
  border-color: var(--primary-color);
}

.key-item.disabled {
  opacity: 0.6;
}

.key-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.key-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-name .name {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-primary);
}

.badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.badge-disabled {
  background: var(--text-tertiary);
  color: white;
}

.badge-expired {
  background: var(--error-color);
  color: white;
}

.badge-readonly {
  background: var(--warning-color);
  color: white;
}

.key-preview {
  font-family: monospace;
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--card-bg);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.key-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 11px;
  color: var(--text-tertiary);
  text-transform: uppercase;
}

.meta-value {
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-value.expired {
  color: var(--error-color);
}

.key-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* Create Form */
.create-form {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.create-form h4 {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 16px;
}

.form-group > label:not(.checkbox-label):not(.radio-option) {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-group .required {
  color: var(--error-color);
}

.form-group input[type="text"] {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  color: var(--text-primary);
  transition: all 0.2s;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(243, 128, 32, 0.1);
}

.permission-options,
.expiry-options {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.radio-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
  font-weight: normal;
}

.radio-option input[type="radio"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  margin: 0;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s;
}

.radio-option input[type="radio"]:checked {
  border-color: var(--primary-color);
}

.radio-option input[type="radio"]:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: var(--primary-color);
  border-radius: 50%;
}

.radio-option input[type="radio"]:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(243, 128, 32, 0.15);
}

.radio-option:hover input[type="radio"]:not(:checked) {
  border-color: var(--primary-color);
}

.radio-option span {
  user-select: none;
}

.permission-input {
  margin-top: 8px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-primary);
  margin: 0;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  margin: 0;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: all 0.2s;
}

.checkbox-label input[type="checkbox"]:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-label input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 5px;
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.checkbox-label input[type="checkbox"]:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(243, 128, 32, 0.15);
}

.checkbox-label:hover input[type="checkbox"]:not(:checked) {
  border-color: var(--primary-color);
}

.checkbox-label span {
  user-select: none;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

/* Created Key Panel */
.created-key-panel {
  text-align: center;
  padding: 20px;
}

.success-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon svg {
  width: 32px;
  height: 32px;
  color: var(--success-color);
}

.created-key-panel h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.warning-text {
  font-size: 13px;
  color: var(--warning-color);
  margin-bottom: 20px;
}

.key-display {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.key-display code {
  flex: 1;
  font-family: monospace;
  font-size: 14px;
  color: var(--text-primary);
  word-break: break-all;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  background: var(--primary-gradient);
  color: white;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  white-space: nowrap;
}

.copy-btn:hover {
  transform: translateY(-1px);
}

.copy-btn svg {
  width: 14px;
  height: 14px;
}

.usage-example {
  text-align: left;
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.usage-example p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.usage-example code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-primary);
  word-break: break-all;
}

.full-width {
  width: 100%;
}

/* Confirm Dialog */
.confirm-dialog {
  max-width: 400px;
}

.confirm-dialog .dialog-body {
  padding: 20px;
}

.confirm-dialog p {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.confirm-dialog .warning-text {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn svg {
  width: 16px;
  height: 16px;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 13px;
}

.btn-sm svg {
  width: 14px;
  height: 14px;
}

.btn-secondary {
  background: var(--card-bg);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 128, 32, 0.3);
}

.btn-danger {
  background: var(--error-color);
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

/* Spinning animation */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dialog styles */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
}

.dialog-container {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  transition: all 0.2s;
}

.dialog-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.dialog-close svg {
  width: 18px;
  height: 18px;
}

/* Transitions */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-active .dialog-container,
.dialog-fade-leave-active .dialog-container {
  transition: transform 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-from .dialog-container,
.dialog-fade-leave-to .dialog-container {
  transform: scale(0.95);
}

/* Mobile */
@media (max-width: 480px) {
  .key-meta {
    flex-direction: column;
    gap: 8px;
  }

  .form-actions {
    flex-direction: column;
  }

  .permission-options,
  .expiry-options {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .radio-option,
  .checkbox-label {
    width: 100%;
  }
}
</style>
