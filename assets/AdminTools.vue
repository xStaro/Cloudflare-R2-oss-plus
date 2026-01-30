<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="modelValue" class="dialog-overlay" @click.self="close">
        <div class="dialog-container admin-tools-dialog">
          <div class="dialog-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              管理工具
            </h3>
            <button class="dialog-close" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <!-- 清理缩略图工具 -->
            <div class="tool-card">
              <div class="tool-header">
                <div class="tool-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </div>
                <div class="tool-info">
                  <h4>清理孤立缩略图</h4>
                  <p>扫描并删除不再被任何文件引用的缩略图，释放存储空间</p>
                </div>
              </div>

              <!-- 状态显示 -->
              <div v-if="thumbnailStatus" class="tool-status">
                <div class="status-grid">
                  <div class="status-item">
                    <span class="status-label">已扫描文件</span>
                    <span class="status-value">{{ thumbnailStatus.scannedFiles }}</span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">使用中缩略图</span>
                    <span class="status-value">{{ thumbnailStatus.usedThumbnails }}</span>
                  </div>
                  <div class="status-item">
                    <span class="status-label">总缩略图数</span>
                    <span class="status-value">{{ thumbnailStatus.totalThumbnails }}</span>
                  </div>
                  <div class="status-item" :class="{ highlight: thumbnailStatus.orphanedThumbnails > 0 }">
                    <span class="status-label">孤立缩略图</span>
                    <span class="status-value">{{ thumbnailStatus.orphanedThumbnails }}</span>
                  </div>
                </div>

                <div v-if="thumbnailStatus.orphanedThumbnails > 0" class="status-summary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  <span>发现 {{ thumbnailStatus.orphanedThumbnails }} 个孤立缩略图，可释放 {{ formatSize(thumbnailStatus.freedBytes) }}</span>
                </div>

                <div v-else-if="thumbnailStatus.success" class="status-summary success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span>没有发现孤立缩略图，存储空间已优化</span>
                </div>
              </div>

              <!-- 清理结果 -->
              <div v-if="cleanupResult" class="cleanup-result" :class="{ success: cleanupResult.success }">
                <svg v-if="cleanupResult.success" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <div class="result-text">
                  <p v-if="cleanupResult.success">
                    已清理 {{ cleanupResult.deletedThumbnails.length }} 个孤立缩略图，
                    释放 {{ formatSize(cleanupResult.freedBytes) }}
                  </p>
                  <p v-else>清理失败：{{ cleanupResult.error }}</p>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="tool-actions">
                <button
                  class="btn btn-secondary"
                  @click="scanThumbnails"
                  :disabled="scanning || cleaning"
                >
                  <svg v-if="scanning" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  {{ scanning ? '扫描中...' : '扫描' }}
                </button>
                <button
                  class="btn btn-primary"
                  @click="cleanupThumbnails"
                  :disabled="scanning || cleaning || !thumbnailStatus?.orphanedThumbnails"
                >
                  <svg v-if="cleaning" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  {{ cleaning ? '清理中...' : '清理' }}
                </button>
              </div>
            </div>

            <!-- 存储后端配置 -->
            <div class="tool-card">
              <div class="tool-header">
                <div class="tool-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
                    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
                  </svg>
                </div>
                <div class="tool-info">
                  <h4>存储后端配置</h4>
                  <p>在页面中管理多 S3/R2 后端（密钥不回显，留空表示保留已有）</p>
                </div>
              </div>

              <div v-if="storageError" class="storage-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{{ storageError }}</span>
              </div>

              <div class="tool-actions">
                <button
                  class="btn btn-secondary"
                  @click="loadStorageConfig"
                  :disabled="storageLoading || storageSaving"
                >
                  <svg v-if="storageLoading" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {{ storageLoading ? '加载中...' : '加载配置' }}
                </button>
                <button
                  class="btn btn-primary"
                  @click="saveStorageConfig"
                  :disabled="storageLoading || storageSaving"
                >
                  <svg v-if="storageSaving" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 11-6.219-8.56"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {{ storageSaving ? '保存中...' : '保存配置' }}
                </button>
              </div>

              <div class="storage-hint">
                <p>
                  Drive ID 对应当前域名的第一个子域名。例如访问 <code>drive1.example.com</code> 时，Drive ID 为 <code>drive1</code>。
                </p>
              </div>

              <div class="drive-list">
                <div v-for="(drive, index) in storageDrives" :key="index" class="drive-card">
                  <div class="drive-card-header">
                    <div class="drive-card-title">
                      <span class="drive-tag">Drive</span>
                      <span class="drive-id-text">{{ drive.id || '(未命名)' }}</span>
                    </div>
                    <button
                      class="btn btn-danger btn-sm"
                      @click="removeStorageDrive(index)"
                      :disabled="storageLoading || storageSaving"
                    >
                      删除
                    </button>
                  </div>

                  <div class="drive-grid">
                    <div class="form-group">
                      <label>Drive ID</label>
                      <input v-model="drive.id" placeholder="例如：drive1" />
                    </div>
                    <div class="form-group">
                      <label>名称（可选）</label>
                      <input v-model="drive.name" placeholder="例如：主网盘" />
                    </div>
                    <div class="form-group">
                      <label>后端类型</label>
                      <select v-model="drive.backend">
                        <option value="s3">S3（兼容各类 S3 网盘）</option>
                        <option value="r2">R2（使用绑定）</option>
                        <option value="onedrive">OneDrive（Graph API）</option>
                      </select>
                    </div>
                    <div class="form-group" v-if="drive.backend === 'r2'">
                      <label>R2 Binding（留空=同 Drive ID）</label>
                      <input v-model="drive.r2Binding" placeholder="例如：BUCKET" />
                    </div>
                  </div>

                  <div v-if="drive.backend === 's3'" class="s3-settings">
                    <div class="drive-grid">
                      <div class="form-group">
                        <label>Endpoint</label>
                        <input v-model="drive.s3.endpoint" placeholder="https://s3.example.com" />
                      </div>
                      <div class="form-group">
                        <label>Bucket</label>
                        <input v-model="drive.s3.bucket" placeholder="my-bucket" />
                      </div>
                      <div class="form-group">
                        <label>Region（可选，默认 auto）</label>
                        <input v-model="drive.s3.region" placeholder="auto" />
                      </div>
                      <div class="form-group">
                        <label>Access Key ID（留空=保留已有）</label>
                        <input v-model="drive.s3.accessKeyId" placeholder="留空=保留已有" />
                        <div v-if="drive.s3.accessKeyIdPreview" class="field-hint">
                          当前：<code>{{ drive.s3.accessKeyIdPreview }}</code>
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Secret Access Key（留空=保留已有）</label>
                        <input type="password" v-model="drive.s3.secretAccessKey" placeholder="留空=保留已有" />
                        <div v-if="drive.s3.hasSecretAccessKey" class="field-hint">
                          当前：<code>已设置</code>
                        </div>
                      </div>
                    </div>

                    <label class="checkbox-row">
                      <input type="checkbox" v-model="drive.s3.forcePathStyle" />
                      强制 Path-style（推荐；如提供商要求虚拟主机风格可取消）
                    </label>
                  </div>

                  <div v-if="drive.backend === 'onedrive'" class="s3-settings">
                    <div class="drive-grid">
                      <div class="form-group">
                        <label>Tenant ID（可选，默认 common）</label>
                        <input v-model="drive.onedrive.tenantId" placeholder="common" />
                      </div>
                      <div class="form-group">
                        <label>Drive ID（可选，默认 me/drive）</label>
                        <input v-model="drive.onedrive.driveId" placeholder="留空=当前用户驱动器" />
                      </div>
                      <div class="form-group">
                        <label>Root Path（可选）</label>
                        <input v-model="drive.onedrive.rootPath" placeholder="例如：Apps/StaroDrive" />
                      </div>
                      <div class="form-group">
                        <label>分片大小（字节，可选）</label>
                        <input v-model.number="drive.onedrive.chunkSize" placeholder="例如：10485760" />
                      </div>
                      <div class="form-group">
                        <label>Client ID（留空=保留已有）</label>
                        <input v-model="drive.onedrive.clientId" placeholder="留空=保留已有" />
                        <div v-if="drive.onedrive.clientIdPreview" class="field-hint">
                          当前：<code>{{ drive.onedrive.clientIdPreview }}</code>
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Client Secret（留空=保留已有）</label>
                        <input type="password" v-model="drive.onedrive.clientSecret" placeholder="留空=保留已有" />
                        <div v-if="drive.onedrive.hasClientSecret" class="field-hint">
                          当前：<code>已设置</code>
                        </div>
                      </div>
                      <div class="form-group">
                        <label>Refresh Token（留空=保留已有）</label>
                        <input type="password" v-model="drive.onedrive.refreshToken" placeholder="留空=保留已有" />
                        <div v-if="drive.onedrive.hasRefreshToken" class="field-hint">
                          当前：<code>已设置</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="storage-footer">
                <button
                  class="btn btn-secondary"
                  @click="addStorageDrive"
                  :disabled="storageLoading || storageSaving"
                >
                  添加 Drive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'AdminTools',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue', 'toast'],
  data() {
    return {
      scanning: false,
      cleaning: false,
      thumbnailStatus: null,
      cleanupResult: null,

      storageLoaded: false,
      storageLoading: false,
      storageSaving: false,
      storageError: '',
      storageDrives: [],
    };
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },

    // 获取认证头
    getAuthHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      const credentials = localStorage.getItem('auth_credentials');
      if (credentials) {
        headers['Authorization'] = `Basic ${credentials}`;
      }
      return headers;
    },

    formatSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    createEmptyStorageDrive() {
      return {
        id: '',
        name: '',
        backend: 's3',
        r2Binding: '',
        s3: {
          endpoint: '',
          bucket: '',
          region: 'auto',
          accessKeyId: '',
          secretAccessKey: '',
          forcePathStyle: true,
          accessKeyIdPreview: '',
          hasSecretAccessKey: false,
        },
        onedrive: {
          tenantId: 'common',
          driveId: '',
          rootPath: '',
          chunkSize: null,
          clientId: '',
          clientSecret: '',
          refreshToken: '',
          clientIdPreview: '',
          hasClientSecret: false,
          hasRefreshToken: false,
        },
      };
    },

    normalizeStorageDriveFromApi(drive) {
      const backend = drive?.backend === 'onedrive' ? 'onedrive' : drive?.backend === 'r2' ? 'r2' : 's3';
      const base = {
        id: drive?.id || '',
        name: drive?.name || '',
        backend,
        r2Binding: drive?.r2Binding || '',
        s3: {
          endpoint: drive?.s3?.endpoint || '',
          bucket: drive?.s3?.bucket || '',
          region: drive?.s3?.region || 'auto',
          accessKeyId: '',
          secretAccessKey: '',
          forcePathStyle: drive?.s3?.forcePathStyle !== false,
          accessKeyIdPreview: drive?.s3?.accessKeyIdPreview || '',
          hasSecretAccessKey: !!drive?.s3?.hasSecretAccessKey,
        },
        onedrive: {
          tenantId: drive?.onedrive?.tenantId || 'common',
          driveId: drive?.onedrive?.driveId || '',
          rootPath: drive?.onedrive?.rootPath || '',
          chunkSize: drive?.onedrive?.chunkSize || null,
          clientId: '',
          clientSecret: '',
          refreshToken: '',
          clientIdPreview: drive?.onedrive?.clientIdPreview || '',
          hasClientSecret: !!drive?.onedrive?.hasClientSecret,
          hasRefreshToken: !!drive?.onedrive?.hasRefreshToken,
        },
      };

      if (backend === 'r2') {
        base.s3 = this.createEmptyStorageDrive().s3;
      }

      if (backend === 's3') {
        base.onedrive = this.createEmptyStorageDrive().onedrive;
      }

      if (backend === 'onedrive') {
        base.s3 = this.createEmptyStorageDrive().s3;
      }

      return base;
    },

    async loadStorageConfig() {
      this.storageLoading = true;
      this.storageError = '';

      try {
        const response = await fetch('/api/config/storage', {
          headers: this.getAuthHeaders(),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const msg = payload?.error || '加载失败';
          if (response.status === 403) {
            this.storageError = msg;
            this.$emit('toast', { type: 'error', message: msg });
            return;
          }
          throw new Error(msg);
        }

        const drives = payload?.config?.drives;
        this.storageDrives = Array.isArray(drives) ? drives.map((d) => this.normalizeStorageDriveFromApi(d)) : [];
        this.storageLoaded = true;
      } catch (error) {
        console.error('Load storage config error:', error);
        this.storageError = error.message || '加载失败';
        this.$emit('toast', { type: 'error', message: this.storageError });
      } finally {
        this.storageLoading = false;
      }
    },

    async saveStorageConfig() {
      const ids = this.storageDrives.map((d) => String(d.id || '').trim()).filter(Boolean);
      const unique = new Set(ids);
      if (ids.length !== unique.size) {
        this.$emit('toast', { type: 'error', message: 'Drive ID 不能重复' });
        return;
      }
      if (this.storageDrives.some((d) => !String(d.id || '').trim())) {
        this.$emit('toast', { type: 'error', message: '请填写 Drive ID' });
        return;
      }

      this.storageSaving = true;
      this.storageError = '';

      try {
        const payload = {
          drives: this.storageDrives.map((d) => ({
            id: d.id,
            name: d.name,
            backend: d.backend,
            r2Binding: d.r2Binding,
            s3: d.backend === 's3' ? {
              endpoint: d.s3.endpoint,
              bucket: d.s3.bucket,
              region: d.s3.region,
              accessKeyId: d.s3.accessKeyId,
              secretAccessKey: d.s3.secretAccessKey,
              forcePathStyle: d.s3.forcePathStyle,
            } : undefined,
            onedrive: d.backend === 'onedrive' ? {
              tenantId: d.onedrive.tenantId,
              driveId: d.onedrive.driveId,
              rootPath: d.onedrive.rootPath,
              chunkSize: d.onedrive.chunkSize,
              clientId: d.onedrive.clientId,
              clientSecret: d.onedrive.clientSecret,
              refreshToken: d.onedrive.refreshToken,
            } : undefined,
          }))
        };

        const response = await fetch('/api/config/storage', {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const msg = result?.error || '保存失败';
          if (response.status === 403) {
            this.storageError = msg;
            this.$emit('toast', { type: 'error', message: msg });
            return;
          }
          throw new Error(msg);
        }

        const drives = result?.config?.drives;
        this.storageDrives = Array.isArray(drives) ? drives.map((d) => this.normalizeStorageDriveFromApi(d)) : [];
        this.storageLoaded = true;
        this.$emit('toast', { type: 'success', message: '存储配置已保存' });
      } catch (error) {
        console.error('Save storage config error:', error);
        this.storageError = error.message || '保存失败';
        this.$emit('toast', { type: 'error', message: this.storageError });
      } finally {
        this.storageSaving = false;
      }
    },

    addStorageDrive() {
      this.storageDrives.push(this.createEmptyStorageDrive());
    },

    removeStorageDrive(index) {
      this.storageDrives.splice(index, 1);
    },

    async scanThumbnails() {
      this.scanning = true;
      this.cleanupResult = null;

      try {
        const response = await fetch('/api/cleanup-thumbnails', {
          headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const msg = data?.error || '扫描失败';
          if (response.status === 401) {
            this.$emit('toast', { type: 'error', message: msg || '需要管理员权限' });
            return;
          }
          throw new Error(msg);
        }

        this.thumbnailStatus = await response.json();
      } catch (error) {
        console.error('Scan error:', error);
        this.$emit('toast', { type: 'error', message: error.message || '扫描失败' });
      } finally {
        this.scanning = false;
      }
    },

    async cleanupThumbnails() {
      if (!this.thumbnailStatus?.orphanedThumbnails) return;

      this.cleaning = true;
      this.cleanupResult = null;

      try {
        const response = await fetch('/api/cleanup-thumbnails', {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          const msg = data?.error || '清理失败';
          if (response.status === 401) {
            this.$emit('toast', { type: 'error', message: msg || '需要管理员权限' });
            return;
          }
          throw new Error(msg);
        }

        this.cleanupResult = await response.json();

        if (this.cleanupResult.success) {
          this.$emit('toast', {
            type: 'success',
            message: `已清理 ${this.cleanupResult.deletedThumbnails.length} 个缩略图`
          });
          // 刷新状态
          this.thumbnailStatus = null;
          await this.scanThumbnails();
        }
      } catch (error) {
        console.error('Cleanup error:', error);
        this.$emit('toast', { type: 'error', message: error.message || '清理失败' });
      } finally {
        this.cleaning = false;
      }
    },
  },
  watch: {
    modelValue(val) {
      if (!val) return;
      if (!this.thumbnailStatus) this.scanThumbnails();
      if (!this.storageLoaded) this.loadStorageConfig();
    }
  }
};
</script>

<style scoped>
.admin-tools-dialog {
  max-width: 760px;
  width: 90vw;
}

.tool-card + .tool-card {
  margin-top: 20px;
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
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

/* Tool Card */
.tool-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.tool-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.tool-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

.tool-icon svg {
  width: 24px;
  height: 24px;
  color: var(--primary-color);
}

.tool-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.tool-info p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Status */
.tool-status {
  margin-bottom: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.status-item {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--card-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.status-item.highlight {
  border-color: var(--warning-color);
  background: rgba(245, 158, 11, 0.1);
}

.status-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.status-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.status-item.highlight .status-value {
  color: var(--warning-color);
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid var(--warning-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--warning-color);
}

.status-summary.success {
  background: rgba(16, 185, 129, 0.1);
  border-color: var(--success-color);
  color: var(--success-color);
}

.status-summary svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Cleanup Result */
.cleanup-result {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin-bottom: 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--error-color);
  border-radius: var(--radius-md);
  color: var(--error-color);
}

.cleanup-result.success {
  background: rgba(16, 185, 129, 0.1);
  border-color: var(--success-color);
  color: var(--success-color);
}

.cleanup-result svg {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.result-text p {
  margin: 0;
  font-size: 14px;
}

/* Actions */
.tool-actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
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
  width: 18px;
  height: 18px;
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
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.btn-danger:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
}

.btn-sm {
  flex: unset;
  padding: 8px 12px;
  font-size: 12px;
}

/* Spinning animation */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Storage config */
.storage-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: var(--radius-md);
  color: var(--error-color);
  font-size: 13px;
}

.storage-error svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.storage-hint {
  margin: 12px 0 16px;
  padding: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
}

.storage-hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.drive-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drive-card {
  padding: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.drive-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.drive-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.drive-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-light);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
}

.drive-id-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.drive-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
}

.field-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.field-hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
}

.s3-settings {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.storage-footer {
  margin-top: 16px;
}

/* Dialog styles (from Dialog.vue) */
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
  .status-grid {
    grid-template-columns: 1fr;
  }

  .tool-actions {
    flex-direction: column;
  }

  .drive-grid {
    grid-template-columns: 1fr;
  }
}
</style>
