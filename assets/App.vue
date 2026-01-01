<template>
  <div
    class="app-container"
    :data-theme="theme"
    @dragenter.prevent
    @dragover.prevent
    @drop.prevent="onDrop"
  >
    <!-- Header -->
    <Header
      :search="search"
      :theme="theme"
      :user="currentUser"
      @update:search="search = $event"
      @toggleTheme="toggleTheme"
      @login="showLoginDialog = true"
      @logout="handleLogout"
      @showShareList="showShareListDialog = true"
    />

    <!-- Main Content -->
    <main class="main-content">
      <!-- Stats Cards (仅登录用户可见) -->
      <StatsCards v-if="showStats" ref="statsCards" />

      <!-- Toolbar -->
      <Toolbar
        :viewMode="viewMode"
        :sortBy="sortBy"
        :sortOrder="sortOrder"
        :selectionMode="selectionMode"
        :selectedCount="selectedItems.length"
        :totalCount="filteredFiles.length + filteredFolders.length"
        :isReadonly="isReadonly"
        :refreshing="refreshing"
        @update:viewMode="viewMode = $event"
        @update:sortBy="sortBy = $event"
        @update:sortOrder="sortOrder = $event"
        @toggleSelection="selectionMode = !selectionMode"
        @selectAll="selectAll"
        @createFolder="createFolder"
        @refresh="handleRefresh"
      >
        <template #breadcrumb>
          <Breadcrumb :path="cwd" @navigate="navigateTo" />
        </template>
      </Toolbar>

      <!-- Upload Progress -->
      <div v-if="uploadProgress !== null" class="upload-progress">
        <div class="upload-progress-bar" :style="{ width: uploadProgress + '%' }"></div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="state-container">
        <div class="loading-spinner"></div>
        <p class="state-title">加载中...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!filteredFiles.length && !filteredFolders.length"
        class="state-container"
      >
        <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          <line x1="9" y1="13" x2="15" y2="13"/>
        </svg>
        <p class="state-title">暂无文件</p>
        <p class="state-desc">拖拽文件到此处上传，或点击右下角按钮</p>
      </div>

      <!-- File Grid/List -->
      <div v-else :class="viewMode === 'grid' ? 'file-grid' : 'file-list-view'">
        <!-- Back folder -->
        <FileCard
          v-if="cwd !== ''"
          :file="{ key: '..', isFolder: true, name: '..' }"
          :viewMode="viewMode"
          :selectionMode="false"
          @click="navigateUp"
        />

        <!-- Folders -->
        <FileCard
          v-for="folder in filteredFolders"
          :key="folder"
          :file="{ key: folder + '_$folder$', isFolder: true }"
          :viewMode="viewMode"
          :selected="isSelected(folder + '_$folder$')"
          :selectionMode="selectionMode"
          @click="navigateTo(folder)"
          @select="toggleSelect(folder + '_$folder$')"
          @contextmenu="showContextMenuFor($event, folder)"
        />

        <!-- Files -->
        <FileCard
          v-for="file in filteredFiles"
          :key="file.key"
          :file="file"
          :viewMode="viewMode"
          :selected="isSelected(file.key)"
          :selectionMode="selectionMode"
          :fileBaseUrl="fileBaseUrl"
          @click="preview(getFileUrl(file.key))"
          @select="toggleSelect(file.key)"
          @contextmenu="showContextMenuFor($event, file)"
        />
      </div>
    </main>

    <!-- Batch Actions Bar -->
    <BatchBar
      :selectedCount="selectedItems.length"
      :loading="batchLoading"
      @download="batchDownload"
      @delete="batchDelete"
      @move="batchMove"
      @cancel="clearSelection"
    />

    <!-- Upload FAB -->
    <button class="fab-button" @click="showUploadPopup = true" title="上传文件" v-if="!isReadonly">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </button>

    <!-- Upload Popup -->
    <UploadPopup
      v-model="showUploadPopup"
      @upload="onUploadClicked"
      @createFolder="createFolder"
    />

    <!-- Login Dialog -->
    <LoginDialog
      v-model="showLoginDialog"
      :loading="loginLoading"
      :error="loginError"
      :required="!currentUser"
      @login="handleLogin"
      @guestLogin="handleGuestLogin"
    />

    <!-- Share Dialog -->
    <ShareDialog
      :show="showShareDialog"
      :fileKey="shareFileKey"
      @close="showShareDialog = false"
    />

    <!-- Share List Dialog (Admin) -->
    <ShareListDialog
      :show="showShareListDialog"
      @close="showShareListDialog = false"
      @toast="handleToast"
      @confirm="showConfirm"
    />

    <!-- Input Dialog -->
    <InputDialog
      v-model="showInputDialog"
      :title="inputDialogConfig.title"
      :description="inputDialogConfig.description"
      :placeholder="inputDialogConfig.placeholder"
      :hint="inputDialogConfig.hint"
      :defaultValue="inputDialogConfig.defaultValue"
      :confirmText="inputDialogConfig.confirmText"
      :icon="inputDialogConfig.icon"
      @confirm="handleInputConfirm"
    />

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :confirmText="confirmDialogConfig.confirmText"
      :cancelText="confirmDialogConfig.cancelText"
      :type="confirmDialogConfig.type"
      @confirm="handleConfirmDialogConfirm"
    />

    <!-- Context Menu Dialog -->
    <Dialog v-model="showContextMenu">
      <div class="context-menu">
        <div class="context-menu-header">
          {{ focusedItemName }}
        </div>
        <div v-if="typeof focusedItem === 'string'" class="context-menu-body">
          <button class="context-menu-item" @click="renameFolder(focusedItem)" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            重命名
          </button>
          <button class="context-menu-item" @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            复制链接
          </button>
          <button class="context-menu-item" @click="downloadFolder(focusedItem)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            下载文件夹
          </button>
          <button class="context-menu-item" @click="moveFile(focusedItem + '_$folder$')" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            移动
          </button>
          <button class="context-menu-item danger" @click="removeFile(focusedItem + '_$folder$')" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </button>
        </div>
        <div v-else class="context-menu-body">
          <button class="context-menu-item" @click="renameFile(focusedItem.key)" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            重命名
          </button>
          <a class="context-menu-item" :href="getFileUrl(focusedItem.key)" target="_blank" download @click="showContextMenu = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            下载
          </a>
          <button class="context-menu-item" @click="clipboard = focusedItem.key; showContextMenu = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            复制
          </button>
          <button class="context-menu-item" @click="moveFile(focusedItem.key)" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            移动
          </button>
          <button class="context-menu-item" @click="copyLink(getFileUrl(focusedItem.key))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            复制链接
          </button>
          <button class="context-menu-item" @click="openShareDialog(focusedItem.key)" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            分享
          </button>
          <button class="context-menu-item danger" @click="removeFile(focusedItem.key)" v-if="!isReadonly">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </button>
        </div>
      </div>
    </Dialog>

    <!-- Toast -->
    <Toast ref="toast" />
  </div>
</template>

<script>
import {
  generateThumbnail,
  blobDigest,
  multipartUpload,
  SIZE_LIMIT,
} from "/assets/main.mjs";
import {
  getFileExtension,
  getFileNameFromKey,
  getFileTypeForFile,
  parseSearchQuery,
} from "/assets/search.mjs";
import Dialog from "./Dialog.vue";
import Header from "./Header.vue";
import StatsCards from "./StatsCards.vue";
import Breadcrumb from "./Breadcrumb.vue";
import Toolbar from "./Toolbar.vue";
import FileCard from "./FileCard.vue";
import BatchBar from "./BatchBar.vue";
import UploadPopup from "./UploadPopup.vue";
import LoginDialog from "./LoginDialog.vue";
import ShareDialog from "./ShareDialog.vue";
import ShareListDialog from "./ShareListDialog.vue";
import InputDialog from "./InputDialog.vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import Toast from "./Toast.vue";

export default {
  data: () => ({
    // Theme
    theme: localStorage.getItem('theme') || 'light',

    // Navigation
    cwd: new URL(window.location).searchParams.get("p") || "",

    // Files
    files: [],
    folders: [],
    loading: false,
    refreshing: false,

    // Search & Sort
    search: "",
    sortBy: 'name',
    sortOrder: 'asc',
    viewMode: localStorage.getItem('viewMode') || 'grid',

    // Selection
    selectionMode: false,
    selectedItems: [],

    // Batch operations
    batchLoading: false,

    // Context menu
    clipboard: null,
    focusedItem: null,
    showContextMenu: false,

    // Upload
    showUploadPopup: false,
    uploadProgress: null,
    uploadQueue: [],

    // Auth
    showLoginDialog: false,
    loginLoading: false,
    loginError: '',
    currentUser: null,

    // Config
    fileBaseUrl: '',

    // Share
    showShareDialog: false,
    shareFileKey: '',

    // Share List (admin)
    showShareListDialog: false,

    // Guest Upload Password
    guestUploadPassword: localStorage.getItem('guest_upload_password') || '',

    // Input Dialog
    showInputDialog: false,
    inputDialogConfig: {
      title: '',
      description: '',
      placeholder: '',
      hint: '',
      defaultValue: '',
      confirmText: '确定',
      icon: '',
      callback: null,
    },

    // Confirm Dialog
    showConfirmDialog: false,
    confirmDialogConfig: {
      title: '确认操作',
      message: '',
      confirmText: '确定',
      cancelText: '取消',
      type: 'warning',
      callback: null,
    },
  }),

  computed: {
    searchFilters() {
      return parseSearchQuery(this.search);
    },

    filteredFiles() {
      let files = [...this.files];

      // Filter out folder markers and invalid entries
      files = files.filter((file) => {
        if (!file.key) return false;
        // 过滤掉文件夹标记
        if (file.key.endsWith('_$folder$')) return false;
        // 过滤掉以 / 结尾的对象（可能是空文件夹标记）
        if (file.key.endsWith('/')) return false;
        return true;
      });

      // Filter by search
      const filters = this.searchFilters;

      if (filters.nameTerms.length) {
        files = files.filter((file) =>
          filters.nameTerms.every((term) =>
            getFileNameFromKey(file.key).toLowerCase().includes(term)
          )
        );
      }

      if (filters.types) {
        files = files.filter((file) => filters.types.has(getFileTypeForFile(file)));
      }

      if (filters.extensions) {
        files = files.filter((file) => filters.extensions.has(getFileExtension(file.key)));
      }

      if (filters.minSizeBytes !== null) {
        files = files.filter((file) => file.size >= filters.minSizeBytes);
      }

      if (filters.maxSizeBytes !== null) {
        files = files.filter((file) => file.size <= filters.maxSizeBytes);
      }

      // Sort
      files.sort((a, b) => {
        let comparison = 0;
        if (this.sortBy === 'name') {
          comparison = a.key.localeCompare(b.key);
        } else if (this.sortBy === 'size') {
          comparison = a.size - b.size;
        } else if (this.sortBy === 'date') {
          comparison = new Date(a.uploaded) - new Date(b.uploaded);
        }
        return this.sortOrder === 'asc' ? comparison : -comparison;
      });

      return files;
    },

    filteredFolders() {
      let folders = [...this.folders];
      const { nameTerms } = this.searchFilters;
      if (nameTerms.length) {
        folders = folders.filter((folder) =>
          nameTerms.every((term) => folder.toLowerCase().includes(term))
        );
      }
      // Sort folders alphabetically
      folders.sort((a, b) => {
        const comparison = a.localeCompare(b);
        return this.sortOrder === 'asc' ? comparison : -comparison;
      });
      return folders;
    },

    focusedItemName() {
      if (!this.focusedItem) return '';
      if (typeof this.focusedItem === 'string') {
        return this.focusedItem.split('/').filter(Boolean).pop() || this.focusedItem;
      }
      return this.focusedItem.key?.split('/').pop() || '';
    },
    isReadonly() {
      return this.currentUser?.isReadonly === true;
    },
    // 是否显示统计卡片（访客不显示）
    showStats() {
      return this.currentUser && !this.currentUser.isGuest;
    },
  },

  methods: {
    // Theme
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', this.theme);
      document.documentElement.setAttribute('data-theme', this.theme);
    },

    // 处理子组件的 Toast 消息
    handleToast({ type, message }) {
      if (type === 'success') {
        this.$refs.toast?.success(message);
      } else if (type === 'error') {
        this.$refs.toast?.error(message);
      } else {
        this.$refs.toast?.info?.(message) || this.$refs.toast?.success(message);
      }
    },

    // Auth
    async handleLogin({ username, password }) {
      this.loginLoading = true;
      this.loginError = '';

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!data.success) {
          this.loginError = data.error || '登录失败';
          return;
        }

        // 保存凭据
        localStorage.setItem('auth_credentials', data.credentials);
        localStorage.setItem('auth_user', JSON.stringify({
          username: data.username,
          permissions: data.permissions,
          isAdmin: data.isAdmin,
          isReadonly: data.isReadonly,
        }));

        // 设置 axios 默认 header
        axios.defaults.headers.common['Authorization'] = `Basic ${data.credentials}`;

        this.currentUser = {
          username: data.username,
          permissions: data.permissions,
          isAdmin: data.isAdmin,
          isReadonly: data.isReadonly,
        };

        this.showLoginDialog = false;
        this.loginError = '';
      } catch (e) {
        this.loginError = '网络错误，请重试';
      } finally {
        this.loginLoading = false;
      }
    },

    handleLogout() {
      localStorage.removeItem('auth_credentials');
      localStorage.removeItem('auth_user');
      delete axios.defaults.headers.common['Authorization'];
      this.currentUser = null;
      this.showLoginDialog = true;
    },

    handleGuestLogin() {
      // 访客登录 - 不需要凭据，只设置用户状态
      this.currentUser = {
        username: '访客',
        permissions: [],
        isAdmin: false,
        isGuest: true,
      };
      localStorage.setItem('auth_user', JSON.stringify(this.currentUser));
      this.showLoginDialog = false;
      this.loginError = '';
    },

    restoreAuth() {
      const credentials = localStorage.getItem('auth_credentials');
      const userStr = localStorage.getItem('auth_user');

      if (userStr) {
        try {
          this.currentUser = JSON.parse(userStr);
          if (credentials) {
            axios.defaults.headers.common['Authorization'] = `Basic ${credentials}`;
          }
          return true;
        } catch (e) {
          this.handleLogout();
        }
      }
      return false;
    },

    // Config
    async loadConfig() {
      try {
        const response = await fetch('/api/config');
        const config = await response.json();
        this.fileBaseUrl = config.fileBaseUrl || '';
      } catch (e) {
        console.warn('Failed to load config:', e);
      }
    },

    getFileUrl(key) {
      // 如果配置了 fileBaseUrl（CDN 回源），直接使用
      // 否则使用 /raw/ 路由（通过 Pages Function 代理）
      if (this.fileBaseUrl) {
        return `${this.fileBaseUrl}/${key}`;
      }
      return `/raw/${key}`;
    },

    // Navigation
    navigateTo(path) {
      // 规范化路径（确保一致性）
      const normalizedPath = path || '';

      // 如果路径相同，强制刷新
      if (this.cwd === normalizedPath) {
        this.fetchFiles();
      } else {
        this.cwd = normalizedPath;
      }
      this.clearSelection();
    },

    navigateUp() {
      this.cwd = this.cwd.replace(/[^\/]+\/$/, '');
      this.clearSelection();
    },

    // Selection
    isSelected(key) {
      return this.selectedItems.includes(key);
    },

    toggleSelect(key) {
      const index = this.selectedItems.indexOf(key);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
      } else {
        this.selectedItems.push(key);
      }
    },

    selectAll() {
      const allKeys = [
        ...this.filteredFolders.map(f => f + '_$folder$'),
        ...this.filteredFiles.map(f => f.key)
      ];
      if (this.selectedItems.length === allKeys.length) {
        this.selectedItems = [];
      } else {
        this.selectedItems = [...allKeys];
      }
    },

    clearSelection() {
      this.selectedItems = [];
      this.selectionMode = false;
    },

    // Batch Operations
    async batchDownload() {
      if (!this.selectedItems.length) return;

      // For single file, direct download
      if (this.selectedItems.length === 1 && !this.selectedItems[0].endsWith('_$folder$')) {
        window.open(this.getFileUrl(this.selectedItems[0]), '_blank');
        return;
      }

      // For multiple files or folders, use JSZip if available
      if (typeof JSZip === 'undefined') {
        this.$refs.toast?.error('批量下载需要 JSZip 库支持，请刷新页面后重试');
        return;
      }

      this.batchLoading = true;
      try {
        const zip = new JSZip();

        for (const key of this.selectedItems) {
          if (key.endsWith('_$folder$')) {
            // Download folder contents
            const folderPath = key.replace('_$folder$', '');
            const items = await this.getAllItems(folderPath);
            for (const item of items) {
              if (!item.key.endsWith('_$folder$')) {
                const response = await fetch(this.getFileUrl(item.key));
                const blob = await response.blob();
                const relativePath = item.key.substring(folderPath.length);
                zip.file(relativePath, blob);
              }
            }
          } else {
            // Download single file
            const response = await fetch(this.getFileUrl(key));
            const blob = await response.blob();
            const fileName = key.split('/').pop();
            zip.file(fileName, blob);
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `download-${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.clearSelection();
      } catch (error) {
        console.error('Batch download failed:', error);
        this.$refs.toast?.error('批量下载失败');
      } finally {
        this.batchLoading = false;
      }
    },

    async batchDelete() {
      if (!this.selectedItems.length) return;

      this.showConfirm({
        title: '确认删除',
        message: `确定要删除选中的 ${this.selectedItems.length} 个项目吗？`,
        confirmText: '删除',
        type: 'danger',
        callback: async () => {
          this.batchLoading = true;
          try {
            for (const key of this.selectedItems) {
              await axios.delete(`/api/write/items/${key}`);
            }
            this.clearSelection();
            this.fetchFiles();
            this.$refs.statsCards?.refresh();
            this.$refs.toast?.success('删除成功');
          } catch (error) {
            console.error('Batch delete failed:', error);
            this.$refs.toast?.error('批量删除失败');
          } finally {
            this.batchLoading = false;
          }
        }
      });
    },

    batchMove() {
      if (!this.selectedItems.length) return;

      this.showInput({
        title: '批量移动',
        description: `将选中的 ${this.selectedItems.length} 个项目移动到`,
        placeholder: '请输入目标路径',
        hint: '留空表示移动到根目录',
        defaultValue: '',
        icon: 'move',
        confirmText: '移动',
        callback: async (targetPath) => {
          const normalizedPath = targetPath === '' ? '' : (targetPath.endsWith('/') ? targetPath : targetPath + '/');

          this.batchLoading = true;
          try {
            for (const key of this.selectedItems) {
              const fileName = key.split('/').pop();
              const targetFilePath = normalizedPath + fileName;
              await this.copyPaste(key, targetFilePath);
              await axios.delete(`/api/write/items/${key}`);
            }
            this.clearSelection();
            this.fetchFiles();
          } catch (error) {
            console.error('Batch move failed:', error);
            this.$refs.toast?.error('批量移动失败');
          } finally {
            this.batchLoading = false;
          }
        }
      });
    },

    // Context Menu
    showContextMenuFor(event, item) {
      this.focusedItem = item;
      this.showContextMenu = true;
    },

    copyLink(link) {
      const url = new URL(link, window.location.origin);
      navigator.clipboard.writeText(url.toString());
      this.$refs.toast?.success('链接已复制');
      this.showContextMenu = false;
    },

    openShareDialog(fileKey) {
      this.shareFileKey = fileKey;
      this.showShareDialog = true;
      this.showContextMenu = false;
    },

    // Input Dialog Helper
    showInput(config) {
      this.inputDialogConfig = {
        title: config.title || '输入',
        description: config.description || '',
        placeholder: config.placeholder || '请输入...',
        hint: config.hint || '',
        defaultValue: config.defaultValue || '',
        confirmText: config.confirmText || '确定',
        icon: config.icon || '',
        callback: config.callback || null,
      };
      this.showInputDialog = true;
    },

    handleInputConfirm(value) {
      if (this.inputDialogConfig.callback) {
        this.inputDialogConfig.callback(value);
      }
    },

    // Confirm Dialog Helper
    showConfirm(config) {
      this.confirmDialogConfig = {
        title: config.title || '确认操作',
        message: config.message || '确定要执行此操作吗？',
        confirmText: config.confirmText || '确定',
        cancelText: config.cancelText || '取消',
        type: config.type || 'warning',
        callback: config.callback || null,
      };
      this.showConfirmDialog = true;
    },

    handleConfirmDialogConfirm() {
      if (this.confirmDialogConfig.callback) {
        this.confirmDialogConfig.callback();
      }
    },

    async copyPaste(source, target) {
      const uploadUrl = `/api/write/items/${target}`;
      await axios.put(uploadUrl, "", {
        headers: { "x-amz-copy-source": encodeURIComponent(source) },
      });
    },

    createFolder() {
      this.showUploadPopup = false;
      this.showInput({
        title: '新建文件夹',
        description: '创建一个新的文件夹',
        placeholder: '请输入文件夹名称',
        hint: '文件夹名称不能包含特殊字符',
        icon: 'folder',
        confirmText: '创建',
        callback: async (folderName) => {
          if (!folderName) return;
          try {
            const uploadUrl = `/api/write/items/${this.cwd}${folderName}/_$folder$`;
            await axios.put(uploadUrl, "");
            this.fetchFiles();
            this.$refs.statsCards?.refresh();
          } catch (error) {
            fetch("/api/write/")
              .then((value) => {
                if (value.redirected) window.location.href = value.url;
              })
              .catch(() => {});
            console.log(`Create folder failed`);
          }
        }
      });
    },

    async handleRefresh() {
      this.refreshing = true;
      await this.fetchFiles();
      this.$refs.toast?.success('刷新成功');
      this.refreshing = false;
    },

    fetchFiles() {
      this.files = [];
      this.folders = [];
      this.loading = true;

      // 构建请求头，包含认证信息
      const headers = {};
      const credentials = localStorage.getItem('auth_credentials');
      if (credentials) {
        headers['Authorization'] = `Basic ${credentials}`;
      }

      return fetch(`/api/children/${this.cwd}`, { headers })
        .then((res) => {
          if (!res.ok) throw new Error('获取文件列表失败');
          return res.json();
        })
        .then((files) => {
          this.files = files.value || [];
          this.folders = files.folders || [];
        })
        .catch((error) => {
          console.error('Fetch files error:', error);
          this.files = [];
          this.folders = [];
        })
        .finally(() => {
          this.loading = false;
        });
    },

    onDrop(ev) {
      let files;
      if (ev.dataTransfer.items) {
        files = [...ev.dataTransfer.items]
          .filter((item) => item.kind === "file")
          .map((item) => item.getAsFile());
      } else files = ev.dataTransfer.files;
      this.uploadFiles(files);
    },

    onUploadClicked(fileElement) {
      if (!fileElement.value) return;
      this.uploadFiles(fileElement.files);
      this.showUploadPopup = false;
      fileElement.value = null;
    },

    preview(filePath) {
      window.open(filePath);
    },

    async processUploadQueue() {
      if (!this.uploadQueue.length) {
        this.fetchFiles();
        this.$refs.statsCards?.refresh();
        this.uploadProgress = null;
        return;
      }

      const { basedir, file } = this.uploadQueue.pop(0);
      let thumbnailDigest = null;

      if (file.type.startsWith("image/") || file.type === "video/mp4") {
        try {
          const thumbnailBlob = await generateThumbnail(file);
          const digestHex = await blobDigest(thumbnailBlob);

          const thumbnailUploadUrl = `/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`;
          try {
            await axios.put(thumbnailUploadUrl, thumbnailBlob);
            thumbnailDigest = digestHex;
          } catch (error) {
            fetch("/api/write/")
              .then((value) => {
                if (value.redirected) window.location.href = value.url;
              })
              .catch(() => {});
            console.log(`Upload ${digestHex}.png failed`);
          }
        } catch (error) {
          console.log(`Generate thumbnail failed`);
        }
      }

      try {
        const uploadUrl = `/api/write/items/${basedir}${file.name}`;
        const headers = {};
        const onUploadProgress = (progressEvent) => {
          var percentCompleted =
            (progressEvent.loaded * 100) / progressEvent.total;
          this.uploadProgress = percentCompleted;
        };
        if (thumbnailDigest) headers["fd-thumbnail"] = thumbnailDigest;
        // 访客上传添加密码头
        if (this.currentUser?.isGuest && this.guestUploadPassword) {
          headers["X-Guest-Password"] = this.guestUploadPassword;
        }
        if (file.size >= SIZE_LIMIT) {
          await multipartUpload(`${basedir}${file.name}`, file, {
            headers,
            onUploadProgress,
          });
        } else {
          await axios.put(uploadUrl, file, { headers, onUploadProgress });
        }
      } catch (error) {
        // 如果是401错误，可能是密码错误，清除保存的密码
        if (error.response?.status === 401 && this.currentUser?.isGuest) {
          this.guestUploadPassword = '';
          localStorage.removeItem('guest_upload_password');
          this.$refs.toast?.error('上传密码错误，请重新输入');
        }
        fetch("/api/write/")
          .then((value) => {
            if (value.redirected) window.location.href = value.url;
          })
          .catch(() => {});
        console.log(`Upload ${file.name} failed`, error);
      }
      setTimeout(this.processUploadQueue);
    },

    async removeFile(key) {
      const fileName = key.split('/').pop().replace('_$folder$', '');
      this.showContextMenu = false;

      this.showConfirm({
        title: '确认删除',
        message: `确定要删除 "${fileName}" 吗？`,
        confirmText: '删除',
        type: 'danger',
        callback: async () => {
          try {
            await axios.delete(`/api/write/items/${key}`);
            this.fetchFiles();
            this.$refs.statsCards?.refresh();
            this.$refs.toast?.success('删除成功');
          } catch (error) {
            console.error('Delete failed:', error);
            this.$refs.toast?.error('删除失败');
          }
        }
      });
    },

    renameFile(key) {
      const currentName = key.split('/').pop();
      this.showContextMenu = false;
      this.showInput({
        title: '重命名',
        description: `将 "${currentName}" 重命名为`,
        placeholder: '请输入新名称',
        defaultValue: currentName,
        icon: 'rename',
        confirmText: '重命名',
        callback: async (newName) => {
          if (!newName || newName === currentName) return;
          try {
            await this.copyPaste(key, `${this.cwd}${newName}`);
            await axios.delete(`/api/write/items/${key}`);
            this.fetchFiles();
          } catch (error) {
            console.error('Rename failed:', error);
            this.$refs.toast?.error('重命名失败');
          }
        }
      });
    },

    renameFolder(folderPath) {
      // folderPath 格式: "path/to/folder/" 或 "folder/"
      // 规范化路径：确保以 / 结尾
      const normalizedPath = folderPath.endsWith('/') ? folderPath : folderPath + '/';
      const pathParts = normalizedPath.replace(/\/$/, '').split('/');
      const currentName = pathParts.pop();
      const parentPath = pathParts.length > 0 ? pathParts.join('/') + '/' : '';

      this.showContextMenu = false;
      this.showInput({
        title: '重命名文件夹',
        description: `将 "${currentName}" 重命名为`,
        placeholder: '请输入新名称',
        defaultValue: currentName,
        icon: 'rename',
        confirmText: '重命名',
        callback: async (newName) => {
          if (!newName || newName === currentName) return;

          // 检查名称是否包含非法字符
          if (newName.includes('/') || newName.includes('\\')) {
            this.$refs.toast?.error('文件夹名称不能包含 / 或 \\');
            return;
          }

          try {
            const sourcePath = normalizedPath; // 如 "docs/old/"
            const targetPath = parentPath + newName + '/'; // 如 "docs/new/"
            // 文件夹标记格式: "docs/old_$folder$" (不带末尾斜杠)
            const sourceMarker = sourcePath.replace(/\/$/, '') + '_$folder$';
            const targetMarker = targetPath.replace(/\/$/, '') + '_$folder$';

            // 获取文件夹内所有项目
            const allItems = await this.getAllItems(sourcePath);
            const totalItems = allItems.length + 1; // +1 是文件夹标记本身
            let processedItems = 0;

            // 复制所有文件到新路径
            for (const item of allItems) {
              const relativePath = item.key.substring(sourcePath.length);
              const newItemPath = targetPath + relativePath;

              try {
                await this.copyPaste(item.key, newItemPath);
                await axios.delete(`/api/write/items/${item.key}`);
                processedItems++;
                this.uploadProgress = (processedItems / totalItems) * 100;
              } catch (error) {
                console.error(`重命名 ${item.key} 失败:`, error);
                throw error; // 抛出错误以便外层捕获
              }
            }

            // 复制并删除文件夹标记
            await this.copyPaste(sourceMarker, targetMarker);
            await axios.delete(`/api/write/items/${sourceMarker}`);
            this.uploadProgress = null;

            this.$refs.toast?.success('文件夹重命名成功');
            this.fetchFiles();
          } catch (error) {
            console.error('重命名文件夹失败:', error);
            this.uploadProgress = null;
            this.$refs.toast?.error('重命名文件夹失败，请重试');
          }
        }
      });
    },

    moveFile(key) {
      const fileName = key.split('/').pop();
      const displayName = fileName.endsWith('_$folder$') ? fileName.slice(0, -9) : fileName;
      this.showContextMenu = false;

      this.showInput({
        title: '移动文件',
        description: `将 "${displayName}" 移动到`,
        placeholder: '请输入目标路径',
        hint: '留空表示移动到根目录',
        defaultValue: '',
        icon: 'move',
        confirmText: '移动',
        callback: async (targetPath) => {
          const normalizedPath = targetPath === '' ? '' : (targetPath.endsWith('/') ? targetPath : targetPath + '/');
          const finalFileName = fileName.endsWith('_$folder$') ? fileName.slice(0, -9) : fileName;

          try {
            if (key.endsWith('_$folder$')) {
              const sourceBasePath = key.slice(0, -9);
              const targetBasePath = normalizedPath + finalFileName + '/';

              const allItems = await this.getAllItems(sourceBasePath);
              const totalItems = allItems.length;
              let processedItems = 0;

              for (const item of allItems) {
                const relativePath = item.key.substring(sourceBasePath.length);
                const newPath = targetBasePath + relativePath;

                try {
                  await this.copyPaste(item.key, newPath);
                  await axios.delete(`/api/write/items/${item.key}`);
                  processedItems++;
                  this.uploadProgress = (processedItems / totalItems) * 100;
                } catch (error) {
                  console.error(`移动 ${item.key} 失败:`, error);
                }
              }

              const targetFolderPath = targetBasePath.slice(0, -1) + '_$folder$';
              await this.copyPaste(key, targetFolderPath);
              await axios.delete(`/api/write/items/${key}`);
              this.uploadProgress = null;
            } else {
              const targetFilePath = normalizedPath + finalFileName;
              await this.copyPaste(key, targetFilePath);
              await axios.delete(`/api/write/items/${key}`);
            }

            this.fetchFiles();
          } catch (error) {
            console.error('移动失败:', error);
            this.$refs.toast?.error('移动失败，请检查目标路径是否正确');
          }
        }
      });
    },

    async downloadFolder(folderPath) {
      if (typeof JSZip === 'undefined') {
        this.$refs.toast?.error('文件夹下载需要 JSZip 库支持');
        return;
      }

      this.showContextMenu = false;
      this.batchLoading = true;

      try {
        const zip = new JSZip();
        const items = await this.getAllItems(folderPath);

        for (const item of items) {
          if (!item.key.endsWith('_$folder$')) {
            const response = await fetch(this.getFileUrl(item.key));
            const blob = await response.blob();
            const relativePath = item.key.substring(folderPath.length);
            zip.file(relativePath, blob);
          }
        }

        const folderName = folderPath.split('/').filter(Boolean).pop() || 'folder';
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${folderName}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download folder failed:', error);
        this.$refs.toast?.error('文件夹下载失败');
      } finally {
        this.batchLoading = false;
      }
    },

    async getAllItems(prefix) {
      const items = [];
      let marker = null;

      do {
        const url = new URL(`/api/children/${prefix}`, window.location.origin);
        if (marker) {
          url.searchParams.set('marker', marker);
        }

        const response = await fetch(url);
        const data = await response.json();

        items.push(...data.value);

        for (const folder of data.folders) {
          items.push({
            key: folder + '_$folder$',
            size: 0,
            uploaded: new Date().toISOString(),
          });

          const subItems = await this.getAllItems(folder);
          items.push(...subItems);
        }

        marker = data.marker;
      } while (marker);

      return items;
    },

    uploadFiles(files) {
      if (this.cwd && !this.cwd.endsWith("/")) this.cwd += "/";

      // 访客上传需要验证密码
      if (this.currentUser?.isGuest && !this.guestUploadPassword) {
        this.showInput({
          title: '访客上传验证',
          description: '请输入上传密码',
          placeholder: '请输入密码',
          hint: '访客上传需要提供密码验证',
          icon: 'folder',
          confirmText: '确认',
          callback: (password) => {
            if (password) {
              this.guestUploadPassword = password;
              localStorage.setItem('guest_upload_password', password);
              this.doUploadFiles(files);
            }
          }
        });
        return;
      }

      this.doUploadFiles(files);
    },

    doUploadFiles(files) {
      const uploadTasks = Array.from(files).map((file) => ({
        basedir: this.cwd,
        file,
      }));
      this.uploadQueue.push(...uploadTasks);
      setTimeout(() => this.processUploadQueue());
    },
  },

  watch: {
    cwd: {
      handler() {
        this.fetchFiles();
        const url = new URL(window.location);
        if ((url.searchParams.get("p") || "") !== this.cwd) {
          this.cwd
            ? url.searchParams.set("p", this.cwd)
            : url.searchParams.delete("p");
          window.history.pushState(null, "", url.toString());
        }
        document.title = `${
          this.cwd.replace(/.*\/(?!$)|\//g, "") || "/"
        } - StaroDrive`;
      },
      immediate: true,
    },
    viewMode(val) {
      localStorage.setItem('viewMode', val);
    },
  },

  created() {
    // Apply theme on load
    document.documentElement.setAttribute('data-theme', this.theme);

    // Load config (file base URL for CDN)
    this.loadConfig();

    // Restore auth state, show login if not restored
    const restored = this.restoreAuth();
    if (!restored) {
      this.showLoginDialog = true;
    }

    // Handle browser back/forward
    window.addEventListener("popstate", (ev) => {
      const searchParams = new URL(window.location).searchParams;
      if (searchParams.get("p") !== this.cwd)
        this.cwd = searchParams.get("p") || "";
    });

    // Handle system theme preference
    if (!localStorage.getItem('theme')) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', this.theme);
    }
  },

  components: {
    Dialog,
    Header,
    StatsCards,
    Breadcrumb,
    Toolbar,
    FileCard,
    BatchBar,
    UploadPopup,
    LoginDialog,
    ShareDialog,
    ShareListDialog,
    InputDialog,
    ConfirmDialog,
    Toast,
  },
};
</script>

<style>
/* Context Menu Styles */
.context-menu {
  background: var(--card-bg);
  border-radius: var(--radius-lg);
  overflow: hidden;
  min-width: 220px;
}

.context-menu-header {
  padding: 14px 16px;
  background: var(--primary-gradient);
  color: white;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-menu-body {
  padding: 8px;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--text-primary);
  border-radius: var(--radius-md);
  transition: var(--transition);
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
}

.context-menu-item:hover {
  background: var(--hover-bg);
}

.context-menu-item.danger {
  color: var(--error-color);
}

.context-menu-item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
</style>
