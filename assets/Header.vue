<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  search: {
    type: String,
    default: ''
  },
  theme: {
    type: String,
    default: 'system'
  },
  user: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:search', 'toggleTheme', 'login', 'logout']);

const showUserMenu = ref(false);

const userInitial = computed(() => {
  if (!props.user?.username) return '?';
  if (props.user.isGuest) return '访';
  return props.user.username.charAt(0).toUpperCase();
});

const permissionText = computed(() => {
  if (!props.user) return '';
  if (props.user.isAdmin) return '全部目录';
  if (props.user.permissions?.length) {
    return props.user.permissions.slice(0, 2).join(', ') +
           (props.user.permissions.length > 2 ? '...' : '');
  }
  return '无写入权限';
});

function handleLogout() {
  showUserMenu.value = false;
  emit('logout');
}

function handleSwitchAccount() {
  showUserMenu.value = false;
  emit('logout');
}
</script>

<template>
  <header class="header">
    <div class="header-inner">
      <!-- Logo -->
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f38020"/>
              <stop offset="100%" stop-color="#ff9f43"/>
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="14" fill="url(#logoGrad)"/>
          <g transform="translate(12, 14)" fill="white">
            <path d="M32 10c0-5.5-4.5-10-10-10-4.4 0-8.1 2.8-9.5 6.7C10.8 6.2 9.2 6 7.5 6 3.4 6 0 9.4 0 13.5S3.4 21 7.5 21h24c4.4 0 8-3.6 8-8 0-3.9-2.8-7.2-6.5-7.9-.3-.7-1-1.1-1-1.1z" opacity="0.9"/>
            <path d="M20 24v12M14 30l6 6 6-6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </g>
        </svg>
        <span>StaroDrive</span>
      </div>

      <!-- Left Spacer -->
      <div class="header-spacer"></div>

      <!-- Search (Centered) -->
      <div class="search-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search"
          class="search-input"
          placeholder="搜索文件..."
          :value="search"
          @input="emit('update:search', $event.target.value)"
          aria-label="搜索文件"
        />
      </div>

      <!-- Right Spacer -->
      <div class="header-spacer"></div>

      <!-- Actions -->
      <div class="header-actions">
        <!-- Theme Toggle -->
        <button
          class="theme-toggle"
          @click="emit('toggleTheme')"
          :title="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
        >
          <!-- Sun icon (for dark mode) -->
          <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <!-- Moon icon (for light mode) -->
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <!-- User Menu -->
        <div class="user-menu-wrapper">
          <!-- Logged In State -->
          <button
            v-if="user"
            class="user-button"
            @click="showUserMenu = !showUserMenu"
          >
            <span class="user-avatar" :class="{ guest: user.isGuest }">{{ userInitial }}</span>
            <span class="user-name">{{ user.username }}</span>
            <svg class="user-arrow" :class="{ open: showUserMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <!-- Guest State -->
          <button
            v-else
            class="login-button"
            @click="emit('login')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span>登录</span>
          </button>

          <!-- User Dropdown -->
          <Transition name="dropdown">
            <div v-if="showUserMenu && user" class="user-dropdown" @click.stop>
              <div class="dropdown-header">
                <span class="dropdown-avatar" :class="{ guest: user.isGuest }">{{ userInitial }}</span>
                <div class="dropdown-info">
                  <span class="dropdown-username">{{ user.username }}</span>
                  <span class="dropdown-role">
                    {{ user.isGuest ? '访客模式' : (user.isAdmin ? '管理员' : '普通用户') }}
                  </span>
                </div>
              </div>

              <div class="dropdown-divider"></div>

              <!-- Guest: Show login prompt -->
              <div v-if="user.isGuest" class="dropdown-section">
                <p class="guest-hint">登录后可进行上传、删除等操作</p>
                <button class="dropdown-item switch-account" @click="handleSwitchAccount">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  登录账户
                </button>
              </div>

              <!-- User: Show permissions -->
              <div v-else class="dropdown-section">
                <span class="dropdown-label">可写入目录</span>
                <div class="permission-list">
                  <template v-if="user.isAdmin">
                    <span class="permission-item admin">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      全部目录权限
                    </span>
                  </template>
                  <template v-else-if="user.permissions?.length">
                    <span
                      v-for="perm in user.permissions"
                      :key="perm"
                      class="permission-item"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                      </svg>
                      {{ perm }}
                    </span>
                  </template>
                  <span v-else class="permission-item disabled">
                    无写入权限
                  </span>
                </div>
              </div>

              <div class="dropdown-divider"></div>

              <button class="dropdown-item logout" @click="handleLogout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                退出登录
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Overlay to close dropdown -->
    <div
      v-if="showUserMenu"
      class="dropdown-overlay"
      @click="showUserMenu = false"
    ></div>
  </header>
</template>

<style scoped>
/* Spacer to push actions to the right edge */
.header-spacer {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* User Menu */
.user-menu-wrapper {
  position: relative;
}

.user-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
}

.user-button:hover {
  background: var(--hover-bg);
  border-color: var(--primary-color);
}

.user-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: white;
  font-size: 13px;
  font-weight: 600;
  border-radius: 50%;
}

.user-avatar.guest {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.user-arrow.open {
  transform: rotate(180deg);
}

/* Login Button */
.login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  padding: 0 20px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 128, 32, 0.4);
}

.login-button svg {
  width: 18px;
  height: 18px;
}

/* User Dropdown */
.user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
}

.dropdown-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-gradient);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border-radius: 50%;
}

.dropdown-avatar.guest {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

.guest-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.dropdown-item.switch-account {
  color: var(--primary-color);
  background: rgba(243, 128, 32, 0.1);
  border-radius: var(--radius-md);
  margin: 0;
}

.dropdown-item.switch-account:hover {
  background: rgba(243, 128, 32, 0.15);
}

.dropdown-info {
  display: flex;
  flex-direction: column;
}

.dropdown-username {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.dropdown-role {
  font-size: 12px;
  color: var(--text-muted);
}

.dropdown-divider {
  height: 1px;
  background: var(--divider-color);
}

.dropdown-section {
  padding: 12px 16px;
}

.dropdown-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
}

.permission-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.permission-item.admin {
  background: rgba(243, 128, 32, 0.1);
  color: var(--primary-color);
}

.permission-item.disabled {
  color: var(--text-muted);
  font-style: italic;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
}

.dropdown-item:hover {
  background: var(--hover-bg);
}

.dropdown-item svg {
  width: 18px;
  height: 18px;
}

.dropdown-item.logout {
  color: var(--error-color);
}

.dropdown-item.logout:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* Dropdown Overlay */
.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Mobile */
@media (max-width: 640px) {
  .user-name {
    display: none;
  }

  .login-button span {
    display: none;
  }

  .login-button {
    width: 40px;
    height: 40px;
    padding: 0;
    border-radius: 50%;
  }

  .user-dropdown {
    position: fixed;
    left: 16px;
    right: 16px;
    top: auto;
    bottom: 16px;
    min-width: auto;
    border-radius: var(--radius-xl);
  }
}
</style>
