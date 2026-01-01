<script setup>
import { ref, onMounted, computed } from 'vue';

const stats = ref(null);
const loading = ref(true);
const error = ref(null);

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化数字（千分位）
function formatNumber(num) {
  if (num === 0) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

// 计算类型占比
const typePercentages = computed(() => {
  if (!stats.value) return null;
  const { fileTypes } = stats.value.storage;
  const total = stats.value.storage.totalFiles || 1;
  return {
    images: Math.round((fileTypes.images.count / total) * 100),
    videos: Math.round((fileTypes.videos.count / total) * 100),
    documents: Math.round((fileTypes.documents.count / total) * 100),
    others: Math.round((fileTypes.others.count / total) * 100),
  };
});

// 获取统计数据
async function fetchStats(forceRefresh = false) {
  loading.value = true;
  error.value = null;
  try {
    const url = forceRefresh ? `/api/stats?refresh=1&_=${Date.now()}` : '/api/stats';
    const response = await fetch(url);
    if (!response.ok) throw new Error('获取统计数据失败');
    stats.value = await response.json();
  } catch (e) {
    error.value = e.message;
    console.error('Stats fetch error:', e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchStats(false));

// 刷新统计
function refresh() {
  fetchStats(true);
}

defineExpose({ refresh });
</script>

<template>
  <section class="stats-section">
    <!-- Loading State -->
    <div v-if="loading" class="stats-grid">
      <div class="stat-card skeleton" v-for="i in 4" :key="i">
        <div class="skeleton-header"></div>
        <div class="skeleton-value"></div>
        <div class="skeleton-subtitle"></div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="stats-error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{{ error }}</span>
      <button @click="refresh" class="retry-btn">重试</button>
    </div>

    <!-- Stats Cards -->
    <div v-else-if="stats" class="stats-grid">
      <!-- Storage Overview Card -->
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">存储概览</span>
          <div class="stat-card-icon storage">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <path d="M2 10h20"/>
            </svg>
          </div>
        </div>
        <div class="stat-card-value">{{ formatSize(stats.storage.totalSize) }}</div>
        <div class="stat-card-subtitle">
          已存储 {{ stats.storage.totalFiles }} 个文件
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" style="width: 100%"></div>
        </div>
      </div>

      <!-- File Statistics Card -->
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">文件统计</span>
          <div class="stat-card-icon files">
            <svg viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/>
              <path d="M14 2v6h6"/>
            </svg>
          </div>
        </div>
        <div class="stat-card-value">{{ stats.storage.totalFiles }}</div>
        <div class="stat-card-subtitle">
          {{ stats.storage.totalFolders }} 个文件夹
        </div>
        <div class="stat-details">
          <div class="stat-detail-item">
            <span class="detail-dot images"></span>
            <span>图片 {{ stats.storage.fileTypes.images.count }}</span>
          </div>
          <div class="stat-detail-item">
            <span class="detail-dot videos"></span>
            <span>视频 {{ stats.storage.fileTypes.videos.count }}</span>
          </div>
        </div>
      </div>

      <!-- Type Distribution Card -->
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">类型分布</span>
          <div class="stat-card-icon types">
            <svg viewBox="0 0 24 24">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
              <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
          </div>
        </div>
        <div class="type-distribution">
          <div class="type-bar">
            <div
              class="type-segment images"
              :style="{ width: typePercentages.images + '%' }"
              :title="`图片 ${typePercentages.images}%`"
            ></div>
            <div
              class="type-segment videos"
              :style="{ width: typePercentages.videos + '%' }"
              :title="`视频 ${typePercentages.videos}%`"
            ></div>
            <div
              class="type-segment documents"
              :style="{ width: typePercentages.documents + '%' }"
              :title="`文档 ${typePercentages.documents}%`"
            ></div>
            <div
              class="type-segment others"
              :style="{ width: typePercentages.others + '%' }"
              :title="`其他 ${typePercentages.others}%`"
            ></div>
          </div>
          <div class="type-legend">
            <div class="legend-item">
              <span class="legend-dot images"></span>
              <span class="legend-label">图片</span>
              <span class="legend-value">{{ formatSize(stats.storage.fileTypes.images.size) }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot videos"></span>
              <span class="legend-label">视频</span>
              <span class="legend-value">{{ formatSize(stats.storage.fileTypes.videos.size) }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot documents"></span>
              <span class="legend-label">文档</span>
              <span class="legend-value">{{ formatSize(stats.storage.fileTypes.documents.size) }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot others"></span>
              <span class="legend-label">其他</span>
              <span class="legend-value">{{ formatSize(stats.storage.fileTypes.others.size) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Operations Statistics Card -->
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-title">操作统计</span>
          <div class="stat-card-icon operations">
            <svg viewBox="0 0 24 24">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
        </div>

        <!-- Not Configured State -->
        <div v-if="!stats.operations?.configured" class="operations-unconfigured">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span class="unconfigured-text">需配置 API Token</span>
          <span class="unconfigured-hint">设置 CF_ACCOUNT_ID 和 CF_API_TOKEN 环境变量</span>
        </div>

        <!-- Configured State -->
        <div v-else class="operations-stats">
          <div class="operations-row">
            <div class="operation-item">
              <span class="operation-label">A类操作</span>
              <span class="operation-value class-a">{{ formatNumber(stats.operations.classA) }}</span>
              <span class="operation-hint">写入/修改</span>
            </div>
            <div class="operation-item">
              <span class="operation-label">B类操作</span>
              <span class="operation-value class-b">{{ formatNumber(stats.operations.classB) }}</span>
              <span class="operation-hint">读取/查询</span>
            </div>
          </div>
          <div class="operations-period" v-if="stats.operations.period">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ stats.operations.period }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Cache Indicator -->
    <div v-if="stats?.cached" class="cache-indicator">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <span>缓存于 {{ new Date(stats.cachedAt).toLocaleTimeString() }}</span>
      <button @click="refresh" class="refresh-btn" title="刷新数据">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M23 4v6h-6"/>
          <path d="M1 20v-6h6"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  </section>
</template>

<style scoped>
/* Skeleton Loading */
.stat-card.skeleton {
  pointer-events: none;
}

.skeleton-header {
  height: 36px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-value {
  height: 32px;
  width: 60%;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-subtitle {
  height: 16px;
  width: 40%;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Error State */
.stats-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  color: var(--text-secondary);
}

.stats-error svg {
  width: 20px;
  height: 20px;
  color: var(--error-color);
}

.retry-btn {
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 13px;
  transition: var(--transition);
}

.retry-btn:hover {
  background: var(--primary-hover);
}

/* Type Distribution */
.type-distribution {
  margin-top: 12px;
}

.type-bar {
  display: flex;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.type-segment {
  height: 100%;
  transition: width 0.5s ease;
}

.type-segment.images { background: #3b82f6; }
.type-segment.videos { background: #ef4444; }
.type-segment.documents { background: #10b981; }
.type-segment.others { background: #8b5cf6; }

.type-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.legend-dot,
.detail-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-dot.images, .detail-dot.images { background: #3b82f6; }
.legend-dot.videos, .detail-dot.videos { background: #ef4444; }
.legend-dot.documents, .detail-dot.documents { background: #10b981; }
.legend-dot.others, .detail-dot.others { background: #8b5cf6; }

.legend-label {
  color: var(--text-secondary);
  flex: 1;
}

.legend-value {
  color: var(--text-primary);
  font-weight: 500;
}

/* Stat Details */
.stat-details {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--divider-color);
}

.stat-detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

/* Cache Indicator */
.cache-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.cache-indicator svg {
  width: 14px;
  height: 14px;
}

.refresh-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  transition: var(--transition);
}

.refresh-btn:hover {
  background: var(--hover-bg);
  color: var(--primary-color);
}

.refresh-btn svg {
  width: 14px;
  height: 14px;
}

/* Operations Card Icon */
.stat-card-icon.operations {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

/* Operations Unconfigured State */
.operations-unconfigured {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
  color: var(--text-muted);
}

.operations-unconfigured svg {
  width: 32px;
  height: 32px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.unconfigured-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.unconfigured-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* Operations Stats */
.operations-stats {
  margin-top: 8px;
}

.operations-row {
  display: flex;
  gap: 16px;
}

.operation-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.operation-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.operation-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.operation-value.class-a {
  color: #f59e0b;
}

.operation-value.class-b {
  color: #3b82f6;
}

.operation-hint {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

.operations-period {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--divider-color);
  font-size: 11px;
  color: var(--text-muted);
}

.operations-period svg {
  width: 12px;
  height: 12px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .type-legend {
    grid-template-columns: 1fr;
  }

  .stat-details {
    flex-direction: column;
    gap: 8px;
  }

  .operations-row {
    gap: 8px;
  }

  .operation-value {
    font-size: 20px;
  }
}
</style>
