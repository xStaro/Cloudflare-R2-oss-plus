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
    };
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },

    formatSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    async scanThumbnails() {
      this.scanning = true;
      this.cleanupResult = null;

      try {
        const response = await fetch('/api/cleanup-thumbnails');

        if (!response.ok) {
          if (response.status === 401) {
            this.$emit('toast', { type: 'error', message: '需要管理员权限' });
            return;
          }
          throw new Error('扫描失败');
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
        });

        if (!response.ok) {
          if (response.status === 401) {
            this.$emit('toast', { type: 'error', message: '需要管理员权限' });
            return;
          }
          throw new Error('清理失败');
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
      if (val && !this.thumbnailStatus) {
        // 打开对话框时自动扫描
        this.scanThumbnails();
      }
    }
  }
};
</script>

<style scoped>
.admin-tools-dialog {
  max-width: 560px;
  width: 90vw;
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

/* Spinning animation */
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
}
</style>
