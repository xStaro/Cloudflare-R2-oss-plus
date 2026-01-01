<script setup>
import { ref, watch } from 'vue';
import Dialog from './Dialog.vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  message: { type: String, default: '确定要执行此操作吗？' },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  type: { type: String, default: 'warning' } // warning, danger, info
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

function handleConfirm() {
  emit('confirm');
  emit('update:modelValue', false);
}

function handleCancel() {
  emit('cancel');
  emit('update:modelValue', false);
}
</script>

<template>
  <Dialog :modelValue="modelValue" @update:modelValue="emit('update:modelValue', $event)">
    <div class="confirm-dialog" :class="type">
      <div class="confirm-icon">
        <!-- Warning Icon -->
        <svg v-if="type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <!-- Danger Icon -->
        <svg v-else-if="type === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <!-- Info Icon -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <h3 class="confirm-title">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="btn btn-cancel" @click="handleCancel">{{ cancelText }}</button>
        <button class="btn btn-confirm" :class="type" @click="handleConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </Dialog>
</template>

<style scoped>
.confirm-dialog {
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  padding: 32px;
  width: 360px;
  max-width: 90vw;
  text-align: center;
}

.confirm-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon svg {
  width: 32px;
  height: 32px;
}

.confirm-dialog.warning .confirm-icon {
  background: rgba(245, 158, 11, 0.1);
  color: var(--warning-color);
}

.confirm-dialog.danger .confirm-icon {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.confirm-dialog.info .confirm-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.confirm-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.confirm-message {
  margin: 0 0 24px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  border: none;
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.btn-confirm {
  color: white;
}

.btn-confirm.warning {
  background: var(--warning-color);
}

.btn-confirm.warning:hover {
  background: #d97706;
}

.btn-confirm.danger {
  background: var(--error-color);
}

.btn-confirm.danger:hover {
  background: #dc2626;
}

.btn-confirm.info {
  background: #3b82f6;
}

.btn-confirm.info:hover {
  background: #2563eb;
}
</style>
