<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from './Dialog.vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close', 'toast', 'confirm']);

const loading = ref(false);
const shares = ref([]);
const deleteLoading = ref(null);
const pendingDeleteId = ref(null);

// 加载分享列表
async function loadShares() {
  loading.value = true;
  try {
    const credentials = localStorage.getItem('auth_credentials');
    const response = await fetch('/api/share/list', {
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });
    const data = await response.json();
    if (data.shares) {
      shares.value = data.shares;
    }
  } catch (error) {
    console.error('加载分享列表失败:', error);
  } finally {
    loading.value = false;
  }
}

// 删除分享
function deleteShare(id) {
  pendingDeleteId.value = id;
  emit('confirm', {
    title: '确认删除',
    message: '确定要删除这个分享吗？',
    confirmText: '删除',
    type: 'danger',
    callback: () => doDeleteShare(id)
  });
}

// 执行删除
async function doDeleteShare(id) {
  deleteLoading.value = id;
  try {
    const credentials = localStorage.getItem('auth_credentials');
    const response = await fetch(`/api/share/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (response.ok) {
      shares.value = shares.value.filter(s => s.id !== id);
      emit('toast', { type: 'success', message: '分享已删除' });
    } else {
      emit('toast', { type: 'error', message: '删除失败' });
    }
  } catch (error) {
    console.error('删除分享失败:', error);
    emit('toast', { type: 'error', message: '删除失败' });
  } finally {
    deleteLoading.value = null;
    pendingDeleteId.value = null;
  }
}

// 复制分享链接
function copyLink(share) {
  const host = share?.host;
  const origin = host ? `${window.location.protocol}//${host}` : window.location.origin;
  const url = `${origin}/s/${share.id}`;
  navigator.clipboard.writeText(url);
  emit('toast', { type: 'success', message: '链接已复制' });
}

// 格式化文件大小
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '永久有效';
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 计算剩余时间
function getExpiryStatus(expiresAt) {
  if (!expiresAt) return { text: '永久', class: 'permanent' };

  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return { text: '已过期', class: 'expired' };

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return { text: `${days}天后`, class: 'normal' };
  } else if (hours > 0) {
    return { text: `${hours}小时后`, class: 'warning' };
  } else {
    const minutes = Math.floor(diff / (1000 * 60));
    return { text: `${minutes}分钟后`, class: 'warning' };
  }
}

// 监听 show 变化，加载数据
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadShares();
  }
});
</script>

<template>
  <Dialog :modelValue="show" @update:modelValue="emit('close')">
    <div class="share-list-dialog">
      <div class="dialog-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          分享管理
        </h3>
        <button class="close-btn" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="dialog-body">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="shares.length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <p>暂无分享记录</p>
        </div>

        <!-- 分享列表 -->
        <div v-else class="share-list">
          <div v-for="share in shares" :key="share.id" class="share-item">
            <div class="share-info">
              <div class="share-name" :title="share.fileName">
                {{ share.fileName }}
              </div>
              <div class="share-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  {{ formatSize(share.fileSize) }}
                </span>
                <span class="meta-item" v-if="share.hasPassword">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  有密码
                </span>
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {{ formatDate(share.createdAt) }}
                </span>
              </div>
              <div class="share-stats">
                <span class="stat-item" :class="getExpiryStatus(share.expiresAt).class">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  过期: {{ getExpiryStatus(share.expiresAt).text }}
                </span>
                <span class="stat-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  下载: {{ share.downloads }}{{ share.maxDownloads ? `/${share.maxDownloads}` : '' }}
                </span>
                <span class="stat-item creator" v-if="share.createdBy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  {{ share.createdBy }}
                </span>
              </div>
            </div>
            <div class="share-actions">
              <button class="action-btn copy" @click="copyLink(share)" title="复制链接">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </button>
              <button
                class="action-btn delete"
                @click="deleteShare(share.id)"
                :disabled="deleteLoading === share.id"
                title="删除分享"
              >
                <svg v-if="deleteLoading !== share.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                <div v-else class="btn-spinner"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.share-list-dialog {
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  width: 560px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--divider-color);
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

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.dialog-body {
  padding: 16px 24px 24px;
  overflow-y: auto;
  flex: 1;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--text-muted);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  margin-top: 12px;
  font-size: 14px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--text-muted);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

/* Share List */
.share-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.share-item:hover {
  border-color: var(--primary-color);
}

.share-info {
  flex: 1;
  min-width: 0;
}

.share-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.share-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.share-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
}

.stat-item svg {
  width: 14px;
  height: 14px;
}

.stat-item.permanent {
  color: var(--success-color);
  background: rgba(34, 197, 94, 0.1);
}

.stat-item.normal {
  color: var(--text-secondary);
}

.stat-item.warning {
  color: var(--warning-color);
  background: rgba(245, 158, 11, 0.1);
}

.stat-item.expired {
  color: var(--error-color);
  background: rgba(239, 68, 68, 0.1);
}

.stat-item.creator {
  color: var(--primary-color);
  background: rgba(243, 128, 32, 0.1);
}

/* Share Actions */
.share-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--bg-tertiary);
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.action-btn:hover:not(:disabled) {
  background: var(--hover-bg);
}

.action-btn.copy:hover {
  color: var(--primary-color);
  background: rgba(243, 128, 32, 0.1);
}

.action-btn.delete:hover {
  color: var(--error-color);
  background: rgba(239, 68, 68, 0.1);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Mobile */
@media (max-width: 640px) {
  .share-list-dialog {
    width: 100%;
    max-height: 90vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .share-item {
    flex-direction: column;
  }

  .share-actions {
    width: 100%;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color);
  }
}
</style>
