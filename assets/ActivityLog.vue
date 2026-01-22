<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="activity-log-overlay" @click.self="$emit('update:modelValue', false)">
        <div class="activity-log-dialog">
          <div class="log-header">
            <div class="header-left">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <span>操作日志</span>
              <span v-if="logs.length" class="log-count">{{ logs.length }}</span>
            </div>
            <div class="header-actions">
              <button v-if="logs.length" class="clear-btn" @click="clearLogs" title="清空日志">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
              <button class="close-btn" @click="$emit('update:modelValue', false)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="log-content">
            <div v-if="!logs.length" class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p>暂无操作记录</p>
            </div>
            <div v-else class="log-list">
              <div
                v-for="(log, index) in reversedLogs"
                :key="log.id"
                class="log-item"
                :class="log.status"
              >
                <div class="log-icon">
                  <svg v-if="log.type === 'upload'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <svg v-else-if="log.type === 'download'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <svg v-else-if="log.type === 'delete'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                  <svg v-else-if="log.type === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                  <svg v-else-if="log.type === 'rename'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  <svg v-else-if="log.type === 'move'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="5 9 2 12 5 15"/>
                    <polyline points="9 5 12 2 15 5"/>
                    <polyline points="15 19 12 22 9 19"/>
                    <polyline points="19 9 22 12 19 15"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <line x1="12" y1="2" x2="12" y2="22"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </div>
                <div class="log-info">
                  <div class="log-message">{{ log.message }}</div>
                  <div class="log-time">{{ formatTime(log.time) }}</div>
                </div>
                <div class="log-status-icon">
                  <svg v-if="log.status === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <svg v-else-if="log.status === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <svg v-else-if="log.status === 'pending'" class="spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="2" x2="12" y2="6"/>
                    <line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
                    <line x1="2" y1="12" x2="6" y2="12"/>
                    <line x1="18" y1="12" x2="22" y2="12"/>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
                  </svg>
                </div>
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
  name: 'ActivityLog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      logs: [],
      maxLogs: 100
    };
  },
  computed: {
    reversedLogs() {
      return [...this.logs].reverse();
    }
  },
  methods: {
    add(type, message, status = 'success') {
      const log = {
        id: Date.now() + Math.random(),
        type,
        message,
        status,
        time: new Date()
      };
      this.logs.push(log);

      // 限制日志数量
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      return log.id;
    },

    update(id, status, message) {
      const log = this.logs.find(l => l.id === id);
      if (log) {
        log.status = status;
        if (message) log.message = message;
      }
    },

    clearLogs() {
      this.logs = [];
    },

    formatTime(date) {
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) {
        return '刚刚';
      } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)} 分钟前`;
      } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)} 小时前`;
      } else {
        return date.toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
  }
};
</script>

<style scoped>
.activity-log-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.activity-log-dialog {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-left svg {
  width: 20px;
  height: 20px;
  color: var(--primary-color);
}

.log-count {
  background: var(--primary-color);
  color: white;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-btn,
.close-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: var(--text-secondary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.clear-btn svg,
.close-btn svg {
  width: 18px;
  height: 18px;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  max-height: calc(80vh - 70px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.log-list {
  padding: 12px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  margin-bottom: 8px;
  background: var(--bg-secondary);
  transition: background 0.2s;
}

.log-item:hover {
  background: var(--bg-hover);
}

.log-item:last-child {
  margin-bottom: 0;
}

.log-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
}

.log-icon svg {
  width: 18px;
  height: 18px;
  color: var(--text-secondary);
}

.log-item.success .log-icon {
  background: rgba(16, 185, 129, 0.1);
}

.log-item.success .log-icon svg {
  color: #10b981;
}

.log-item.error .log-icon {
  background: rgba(239, 68, 68, 0.1);
}

.log-item.error .log-icon svg {
  color: #ef4444;
}

.log-item.pending .log-icon {
  background: rgba(59, 130, 246, 0.1);
}

.log-item.pending .log-icon svg {
  color: #3b82f6;
}

.log-info {
  flex: 1;
  min-width: 0;
}

.log-message {
  font-size: 14px;
  color: var(--text-primary);
  word-break: break-all;
  line-height: 1.5;
}

.log-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.log-status-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.log-status-icon svg {
  width: 18px;
  height: 18px;
}

.log-item.success .log-status-icon svg {
  color: #10b981;
}

.log-item.error .log-status-icon svg {
  color: #ef4444;
}

.log-item.pending .log-status-icon svg {
  color: #3b82f6;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinning {
  animation: spin 1s linear infinite;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .activity-log-dialog,
.modal-leave-active .activity-log-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .activity-log-dialog,
.modal-leave-to .activity-log-dialog {
  transform: scale(0.95);
  opacity: 0;
}

/* Mobile */
@media (max-width: 640px) {
  .activity-log-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .activity-log-dialog {
    max-width: none;
    max-height: 70vh;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  }

  .modal-enter-from .activity-log-dialog,
  .modal-leave-to .activity-log-dialog {
    transform: translateY(100%);
  }
}
</style>
