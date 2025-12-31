<script setup>
defineProps({
  selectedCount: {
    type: Number,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['download', 'delete', 'move', 'cancel']);
</script>

<template>
  <Transition name="slide-up">
    <div v-if="selectedCount > 0" class="batch-bar">
      <div class="batch-bar-count">
        已选择 <strong>{{ selectedCount }}</strong> 个项目
      </div>

      <div class="batch-bar-actions">
        <!-- Download -->
        <button
          class="batch-btn primary"
          @click="emit('download')"
          :disabled="loading"
          title="下载选中项"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="btn-text">下载</span>
        </button>

        <!-- Move -->
        <button
          class="batch-btn secondary"
          @click="emit('move')"
          :disabled="loading"
          title="移动到..."
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <polyline points="9 14 12 17 15 14"/>
          </svg>
          <span class="btn-text">移动</span>
        </button>

        <!-- Delete -->
        <button
          class="batch-btn danger"
          @click="emit('delete')"
          :disabled="loading"
          title="删除选中项"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
          <span class="btn-text">删除</span>
        </button>
      </div>

      <!-- Close/Cancel -->
      <button
        class="batch-bar-close"
        @click="emit('cancel')"
        title="取消选择"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- Loading Overlay -->
      <div v-if="loading" class="batch-loading">
        <div class="loading-spinner small"></div>
        <span>处理中...</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.batch-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-xl);
  z-index: 1000;
}

.batch-bar-count {
  font-size: 14px;
  color: var(--text-secondary);
  padding-right: 16px;
  border-right: 1px solid var(--border-color);
  white-space: nowrap;
}

.batch-bar-count strong {
  color: var(--primary-color);
  font-weight: 600;
}

.batch-bar-actions {
  display: flex;
  gap: 8px;
}

.batch-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition);
  border: none;
  cursor: pointer;
}

.batch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.batch-btn.primary {
  background: var(--primary-gradient);
  color: white;
}

.batch-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.batch-btn.secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.batch-btn.secondary:hover:not(:disabled) {
  background: var(--hover-bg);
}

.batch-btn.danger {
  background: var(--error-color);
  color: white;
}

.batch-btn.danger:hover:not(:disabled) {
  background: #dc2626;
}

.batch-btn svg {
  width: 16px;
  height: 16px;
}

.batch-bar-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-muted);
  transition: var(--transition);
  background: none;
  border: none;
  cursor: pointer;
  margin-left: 4px;
}

.batch-bar-close:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.batch-bar-close svg {
  width: 18px;
  height: 18px;
}

/* Loading Overlay */
.batch-loading {
  position: absolute;
  inset: 0;
  background: rgba(var(--card-bg), 0.9);
  backdrop-filter: blur(4px);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.loading-spinner.small {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

/* Animation */
.slide-up-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}

/* Mobile */
@media (max-width: 768px) {
  .batch-bar {
    left: 16px;
    right: 16px;
    bottom: 16px;
    transform: none;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px 16px;
  }

  .batch-bar-count {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 12px;
    padding-right: 0;
    text-align: center;
  }

  .batch-bar-actions {
    flex: 1;
    justify-content: center;
  }

  .batch-btn {
    padding: 10px 12px;
  }

  .btn-text {
    display: none;
  }

  .batch-bar-close {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
  }

  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(100%);
  }
}
</style>
