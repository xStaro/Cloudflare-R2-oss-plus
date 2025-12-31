<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  loading: Boolean,
  error: String,
  required: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'login', 'guestLogin']);

const username = ref('');
const password = ref('');
const showPassword = ref(false);

const isValid = computed(() => {
  return username.value.trim() && password.value.trim();
});

function handleSubmit() {
  if (!isValid.value || props.loading) return;
  emit('login', {
    username: username.value.trim(),
    password: password.value,
  });
}

function handleGuestLogin() {
  if (props.loading) return;
  emit('guestLogin');
}

function close() {
  if (props.required) return;
  emit('update:modelValue', false);
}

// 重置表单
watch(() => props.modelValue, (val) => {
  if (val) {
    username.value = '';
    password.value = '';
    showPassword.value = false;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="login-overlay" @click.self="close">
        <div class="login-dialog">
          <!-- Header -->
          <div class="login-header">
            <div class="login-logo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 class="login-title">欢迎使用 StaroDrive</h2>
            <p class="login-subtitle">请登录以继续</p>
          </div>

          <!-- Form -->
          <form class="login-form" @submit.prevent="handleSubmit">
            <!-- Error Message -->
            <div v-if="error" class="login-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ error }}</span>
            </div>

            <!-- Username -->
            <div class="form-group">
              <label class="form-label">用户名</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  v-model="username"
                  type="text"
                  class="form-input"
                  placeholder="请输入用户名"
                  autocomplete="username"
                  :disabled="loading"
                />
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <label class="form-label">密码</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                  :disabled="loading"
                />
                <button
                  type="button"
                  class="password-toggle"
                  @click="showPassword = !showPassword"
                  tabindex="-1"
                >
                  <svg v-if="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="login-button primary"
              :disabled="!isValid || loading"
            >
              <span v-if="loading" class="button-loading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
              </span>
              <span v-else>登录</span>
            </button>

            <!-- Divider -->
            <div class="login-divider">
              <span>或</span>
            </div>

            <!-- Guest Login Button -->
            <button
              type="button"
              class="login-button guest"
              :disabled="loading"
              @click="handleGuestLogin"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>以访客身份浏览</span>
            </button>
          </form>

          <!-- Footer -->
          <div class="login-footer">
            <p>访客仅可浏览文件，登录后可进行上传和管理操作</p>
          </div>

          <!-- Close Button (only when not required) -->
          <button v-if="!required" class="login-close" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.login-dialog {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.login-header {
  padding: 32px 32px 24px;
  text-align: center;
  background: var(--primary-gradient);
  color: white;
}

.login-logo {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.login-logo svg {
  width: 100%;
  height: 100%;
}

.login-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 600;
}

.login-subtitle {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.login-form {
  padding: 24px 32px;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  color: #ef4444;
  font-size: 14px;
}

.login-error svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 12px 12px 12px 44px;
  font-size: 15px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  outline: none;
  transition: var(--transition);
}

.form-input:focus {
  border-color: var(--primary-color);
  background: var(--card-bg);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-input::placeholder {
  color: var(--text-muted);
}

.password-toggle {
  position: absolute;
  right: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition);
}

.password-toggle:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.password-toggle svg {
  width: 18px;
  height: 18px;
}

.login-button {
  width: 100%;
  padding: 14px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-button.primary {
  color: white;
  background: var(--primary-gradient);
}

.login-button.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 128, 32, 0.4);
}

.login-button.guest {
  color: var(--text-primary);
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
}

.login-button.guest:hover:not(:disabled) {
  border-color: var(--primary-color);
  background: var(--hover-bg);
}

.login-button.guest svg {
  width: 20px;
  height: 20px;
}

.login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.button-loading svg {
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.login-divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.login-divider::before,
.login-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.login-divider span {
  padding: 0 16px;
}

.login-footer {
  padding: 16px 32px 24px;
  text-align: center;
}

.login-footer p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.login-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: var(--transition);
}

.login-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

.login-close svg {
  width: 18px;
  height: 18px;
}

/* Dialog Animation */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .login-dialog,
.dialog-leave-active .login-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .login-dialog,
.dialog-leave-to .login-dialog {
  transform: scale(0.95);
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .login-dialog {
    max-width: 100%;
  }

  .login-header {
    padding: 24px 20px 20px;
  }

  .login-form {
    padding: 20px;
  }

  .login-footer {
    padding: 12px 20px 20px;
  }
}
</style>
