<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="dialog-overlay" @click.self="cancel">
        <div class="dialog-content input-dialog">
          <div class="dialog-header">
            <h3>{{ title }}</h3>
            <button class="close-btn" @click="cancel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <div v-if="icon" class="dialog-icon">
              <!-- Folder Icon -->
              <svg v-if="icon === 'folder'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              <!-- Move Icon -->
              <svg v-else-if="icon === 'move'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <polyline points="12 11 12 17"/>
                <polyline points="9 14 12 11 15 14"/>
              </svg>
              <!-- Rename Icon -->
              <svg v-else-if="icon === 'rename'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>

            <p v-if="description" class="dialog-description">{{ description }}</p>

            <div class="input-wrapper">
              <input
                ref="inputRef"
                type="text"
                v-model="inputValue"
                :placeholder="placeholder"
                @keyup.enter="confirm"
                class="dialog-input"
              />
            </div>

            <p v-if="hint" class="dialog-hint">{{ hint }}</p>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="cancel">取消</button>
            <button class="btn btn-primary" @click="confirm" :disabled="!inputValue.trim()">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'InputDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: '输入'
    },
    description: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: '请输入...'
    },
    hint: {
      type: String,
      default: ''
    },
    defaultValue: {
      type: String,
      default: ''
    },
    confirmText: {
      type: String,
      default: '确定'
    },
    icon: {
      type: String,
      default: '' // 'folder', 'move', 'rename'
    }
  },
  emits: ['update:modelValue', 'confirm', 'cancel'],
  data() {
    return {
      inputValue: ''
    };
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.inputValue = this.defaultValue;
        this.$nextTick(() => {
          this.$refs.inputRef?.focus();
          this.$refs.inputRef?.select();
        });
      }
    }
  },
  methods: {
    confirm() {
      if (!this.inputValue.trim()) return;
      this.$emit('confirm', this.inputValue.trim());
      this.$emit('update:modelValue', false);
    },
    cancel() {
      this.$emit('cancel');
      this.$emit('update:modelValue', false);
    }
  }
};
</script>

<style scoped>
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
}

.dialog-content {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.dialog-body {
  padding: 24px;
}

.dialog-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.dialog-icon svg {
  width: 48px;
  height: 48px;
  color: var(--primary-color);
}

.dialog-description {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.input-wrapper {
  margin-bottom: 12px;
}

.dialog-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  background: var(--card-bg);
  color: var(--text-primary);
  transition: var(--transition);
  box-sizing: border-box;
}

.dialog-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.dialog-input::placeholder {
  color: var(--text-muted);
}

.dialog-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.btn-secondary {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--border-color);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-content,
.dialog-leave-active .dialog-content {
  transition: transform 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-content,
.dialog-leave-to .dialog-content {
  transform: scale(0.95) translateY(-10px);
}
</style>
