<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="show" class="dialog-overlay" @click.self="$emit('close')">
        <div class="dialog-content share-dialog">
          <div class="dialog-header">
            <h3>{{ shareResult ? '分享链接' : '创建分享' }}</h3>
            <button class="close-btn" @click="$emit('close')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="dialog-body">
            <!-- 分享结果展示 -->
            <template v-if="shareResult">
              <div class="share-result">
                <div class="file-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6"/>
                  </svg>
                  <span>{{ shareResult.fileName }}</span>
                </div>

                <div class="result-section">
                  <label>分享链接</label>
                  <div class="copy-field">
                    <input type="text" :value="shareResult.url" readonly />
                    <button @click="copy(shareResult.url)" class="copy-btn-inline">
                      {{ copied === 'url' ? '已复制' : '复制' }}
                    </button>
                  </div>
                </div>

                <div class="result-section">
                  <label>wget 命令</label>
                  <div class="copy-field">
                    <input type="text" :value="shareResult.wgetCommand" readonly />
                    <button @click="copy(shareResult.wgetCommand, 'wget')" class="copy-btn-inline">
                      {{ copied === 'wget' ? '已复制' : '复制' }}
                    </button>
                  </div>
                </div>

                <div class="result-info">
                  <div v-if="shareResult.expiresAt">
                    <span class="label">有效期至:</span>
                    {{ formatDate(shareResult.expiresAt) }}
                  </div>
                  <div v-else>
                    <span class="label">有效期:</span> 永久
                  </div>
                  <div v-if="shareResult.hasPassword">
                    <span class="label">密码保护:</span> 是
                  </div>
                  <div v-if="shareResult.maxDownloads">
                    <span class="label">下载限制:</span> {{ shareResult.maxDownloads }} 次
                  </div>
                </div>

                <button class="btn btn-primary" @click="resetForm">创建新分享</button>
              </div>
            </template>

            <!-- 分享表单 -->
            <template v-else>
              <div class="file-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                <span>{{ fileName }}</span>
              </div>

              <div class="form-group">
                <label>有效期</label>
                <div class="duration-options">
                  <button
                    v-for="opt in durationOptions"
                    :key="opt.value"
                    :class="['duration-btn', { active: duration === opt.value }]"
                    @click="duration = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
                <div v-if="duration === 'custom'" class="custom-duration">
                  <input
                    type="number"
                    v-model.number="customMinutes"
                    placeholder="分钟数"
                    min="1"
                  />
                  <span>分钟</span>
                </div>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="enablePassword" />
                  <span>密码保护</span>
                </label>
                <input
                  v-if="enablePassword"
                  type="text"
                  v-model="password"
                  placeholder="设置访问密码"
                  class="password-input"
                />
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="enableDownloadLimit" />
                  <span>限制下载次数</span>
                </label>
                <input
                  v-if="enableDownloadLimit"
                  type="number"
                  v-model.number="maxDownloads"
                  placeholder="最大下载次数"
                  min="1"
                  class="download-limit-input"
                />
              </div>

              <div v-if="error" class="error-message">{{ error }}</div>

              <button
                class="btn btn-primary"
                @click="createShare"
                :disabled="loading"
              >
                {{ loading ? '创建中...' : '创建分享链接' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
export default {
  name: 'ShareDialog',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    fileKey: {
      type: String,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {
      duration: '7d',
      customMinutes: 60,
      enablePassword: false,
      password: '',
      enableDownloadLimit: false,
      maxDownloads: 10,
      loading: false,
      error: '',
      shareResult: null,
      copied: '',
      durationOptions: [
        { value: '1h', label: '1小时' },
        { value: '1d', label: '1天' },
        { value: '7d', label: '7天' },
        { value: '30d', label: '30天' },
        { value: 'forever', label: '永久' },
        { value: 'custom', label: '自定义' }
      ]
    };
  },
  computed: {
    fileName() {
      return this.fileKey ? this.fileKey.split('/').pop() : '';
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.resetForm();
      }
    }
  },
  methods: {
    resetForm() {
      this.duration = '7d';
      this.customMinutes = 60;
      this.enablePassword = false;
      this.password = '';
      this.enableDownloadLimit = false;
      this.maxDownloads = 10;
      this.error = '';
      this.shareResult = null;
      this.copied = '';
    },
    async createShare() {
      this.loading = true;
      this.error = '';

      try {
        const body = {
          key: this.fileKey,
          duration: this.duration,
          customMinutes: this.duration === 'custom' ? this.customMinutes : undefined,
          password: this.enablePassword ? this.password : undefined,
          maxDownloads: this.enableDownloadLimit ? this.maxDownloads : undefined
        };

        const response = await fetch('/api/share/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || '创建分享失败');
        }

        this.shareResult = data.share;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    async copy(text, type = 'url') {
      try {
        await navigator.clipboard.writeText(text);
        this.copied = type;
        setTimeout(() => {
          this.copied = '';
        }, 2000);
      } catch (err) {
        console.error('复制失败:', err);
      }
    },
    formatDate(timestamp) {
      return new Date(timestamp).toLocaleString('zh-CN');
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
  max-width: 480px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: 24px;
}

.file-info svg {
  width: 24px;
  height: 24px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.file-info span {
  font-weight: 500;
  color: var(--text-primary);
  word-break: break-all;
}

.form-group {
  margin-bottom: 20px;
}

.form-group > label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.duration-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.duration-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  transition: var(--transition);
}

.duration-btn:hover {
  border-color: var(--primary-color);
}

.duration-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.custom-duration {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.custom-duration input {
  width: 120px;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--card-bg);
  color: var(--text-primary);
}

.custom-duration span {
  color: var(--text-secondary);
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.password-input,
.download-limit-input {
  margin-top: 12px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 14px;
  background: var(--card-bg);
  color: var(--text-primary);
}

.error-message {
  background: #fee;
  color: #c00;
  padding: 12px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 14px;
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Share Result */
.share-result .file-info {
  margin-bottom: 20px;
}

.result-section {
  margin-bottom: 16px;
}

.result-section label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.copy-field {
  display: flex;
  gap: 8px;
}

.copy-field input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: monospace;
}

.copy-btn-inline {
  padding: 10px 16px;
  border: none;
  background: var(--primary-color);
  color: white;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: var(--transition);
}

.copy-btn-inline:hover {
  background: var(--primary-hover);
}

.result-info {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font-size: 14px;
}

.result-info > div {
  margin-bottom: 8px;
  color: var(--text-secondary);
}

.result-info > div:last-child {
  margin-bottom: 0;
}

.result-info .label {
  color: var(--text-muted);
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
  transform: scale(0.95);
}
</style>
