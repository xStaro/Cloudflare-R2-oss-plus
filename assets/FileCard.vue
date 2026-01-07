<template>
  <!-- Grid View Card -->
  <div
    v-if="viewMode === 'grid'"
    class="file-card"
    :class="{ selected, 'selection-mode': selectionMode }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Checkbox -->
    <div
      class="file-card-checkbox"
      @click="handleCheckbox"
    >
      <svg v-if="selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>

    <!-- Icon/Thumbnail -->
    <div class="file-card-icon" :class="fileIcon">
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="fileName"
        loading="lazy"
        @error="$event.target.style.display='none'"
      />
      <!-- Folder Icon -->
      <svg v-else-if="fileIcon === 'folder'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
      <!-- Image Icon -->
      <svg v-else-if="fileIcon === 'image'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
      <!-- Video Icon -->
      <svg v-else-if="fileIcon === 'video'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      <!-- Audio Icon -->
      <svg v-else-if="fileIcon === 'audio'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
      <!-- PDF Icon -->
      <svg v-else-if="fileIcon === 'pdf'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M10 12h4"/>
        <path d="M10 16h4"/>
      </svg>
      <!-- Word Icon -->
      <svg v-else-if="fileIcon === 'word'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <path d="M8 13h8"/>
        <path d="M8 17h8"/>
        <path d="M8 9h2"/>
      </svg>
      <!-- Excel Icon -->
      <svg v-else-if="fileIcon === 'excel'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18"/>
        <path d="M3 15h18"/>
        <path d="M9 3v18"/>
      </svg>
      <!-- PowerPoint Icon -->
      <svg v-else-if="fileIcon === 'ppt'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <rect x="8" y="12" width="8" height="6" rx="1"/>
      </svg>
      <!-- Archive Icon -->
      <svg v-else-if="fileIcon === 'archive'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
      <!-- Text Icon -->
      <svg v-else-if="fileIcon === 'text'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      <!-- Default File Icon -->
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
    </div>

    <!-- File Name -->
    <div class="file-card-name" :title="fileName">{{ fileName }}</div>

    <!-- Meta Info -->
    <div class="file-card-meta">
      <span>{{ isFolder ? '文件夹' : formatSize(file.size) }}</span>
      <span v-if="file.uploaded && !isFolder" class="file-card-time">{{ formatDate(file.uploaded) }}</span>
    </div>
  </div>

  <!-- List View Item -->
  <div
    v-else
    class="file-list-item"
    :class="{ selected, 'selection-mode': selectionMode }"
    @click="handleClick"
    @contextmenu="handleContextMenu"
  >
    <!-- Checkbox -->
    <div
      class="list-item-checkbox"
      @click="handleCheckbox"
    >
      <div class="checkbox-box" :class="{ checked: selected }">
        <svg v-if="selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    </div>

    <!-- Icon -->
    <div class="file-list-item-icon" :class="fileIcon">
      <svg v-if="fileIcon === 'folder'" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
    </div>

    <!-- Info -->
    <div class="file-list-item-info">
      <div class="file-list-item-name" :title="fileName">{{ fileName }}</div>
      <div class="file-list-item-meta">
        <span>{{ isFolder ? '文件夹' : formatSize(file.size) }}</span>
        <span v-if="file.uploaded">{{ formatDate(file.uploaded) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { encodePathForUrl } from "./url-utils.mjs";

export default {
  name: 'FileCard',
  props: {
    file: {
      type: Object,
      required: true
    },
    selected: {
      type: Boolean,
      default: false
    },
    selectionMode: {
      type: Boolean,
      default: false
    },
    viewMode: {
      type: String,
      default: 'grid'
    },
    fileBaseUrl: {
      type: String,
      default: ''
    }
  },
  emits: ['click', 'select', 'contextmenu', 'preview'],
  computed: {
    isFolder() {
      return this.file.key?.endsWith('_$folder$') || this.file.isFolder;
    },
    fileName() {
      if (this.isFolder) {
        return this.file.key?.replace('_$folder$', '').split('/').filter(Boolean).pop() || this.file.name || '';
      }
      return this.file.key?.split('/').pop() || this.file.name || '';
    },
    fileIcon() {
      if (this.isFolder) return 'folder';

      const ext = (this.fileName || '').split('.').pop()?.toLowerCase() || '';
      const contentType = this.file.httpMetadata?.contentType || '';

      if (contentType.startsWith('image/')) return 'image';
      if (contentType.startsWith('video/')) return 'video';
      if (contentType.startsWith('audio/')) return 'audio';
      if (contentType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(ext)) return 'text';
      if (['pdf'].includes(ext)) return 'pdf';
      if (['doc', 'docx'].includes(ext)) return 'word';
      if (['xls', 'xlsx'].includes(ext)) return 'excel';
      if (['ppt', 'pptx'].includes(ext)) return 'ppt';
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';

      return 'file';
    },
    canPreview() {
      const contentType = this.file.httpMetadata?.contentType || '';
      return contentType.startsWith('image/') || contentType.startsWith('video/');
    },
    thumbnailUrl() {
      // 优先使用上传时生成的缩略图
      const thumbnailHash = this.file.customMetadata?.thumbnail;
      if (thumbnailHash) {
        // 缩略图存储在 _$flaredrive$/thumbnails/{hash}.png
        const thumbnailKey = `_$flaredrive$/thumbnails/${thumbnailHash}.png`;
        if (this.fileBaseUrl) {
          return `${this.fileBaseUrl}/${encodePathForUrl(thumbnailKey)}`;
        }
        return `/raw/${encodePathForUrl(thumbnailKey)}`;
      }

      // 如果没有缩略图但是图片，使用原图作为缩略图
      if (!this.canPreview) return null;
      const contentType = this.file.httpMetadata?.contentType || '';
      if (contentType.startsWith('image/')) {
        const key = this.file.key || '';
        if (this.fileBaseUrl) {
          return `${this.fileBaseUrl}/${encodePathForUrl(key)}`;
        }
        return `/raw/${encodePathForUrl(key)}`;
      }
      return null;
    }
  },
  methods: {
    formatSize(bytes) {
      if (bytes === 0 || bytes === undefined) return '-';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },
    formatDate(dateString) {
      if (!dateString) return '-';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    handleClick(e) {
      if (this.selectionMode) {
        this.$emit('select', this.file);
      } else {
        this.$emit('click', this.file);
      }
    },
    handleCheckbox(e) {
      e.stopPropagation();
      this.$emit('select', this.file);
    },
    handleContextMenu(e) {
      e.preventDefault();
      this.$emit('contextmenu', e, this.file);
    }
  }
};
</script>

<style scoped>
/* Grid Card Styles */
.file-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
}

.file-card:hover {
  border-color: var(--primary-color);
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-2px);
}

.file-card.selected {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

/* Checkbox */
.file-card-checkbox {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: var(--transition);
  z-index: 2;
}

.file-card:hover .file-card-checkbox,
.file-card.selected .file-card-checkbox,
.file-card.selection-mode .file-card-checkbox {
  opacity: 1;
}

.file-card.selected .file-card-checkbox {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.file-card-checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
}

/* Icon */
.file-card-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.file-card-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-card-icon svg {
  width: 32px;
  height: 32px;
  color: var(--text-muted);
}

.file-card-icon.folder svg { color: #f59e0b; }
.file-card-icon.image svg { color: #3b82f6; }
.file-card-icon.video svg { color: #ef4444; }
.file-card-icon.audio svg { color: #8b5cf6; }
.file-card-icon.pdf svg { color: #ef4444; }
.file-card-icon.word svg { color: #2563eb; }
.file-card-icon.excel svg { color: #16a34a; }
.file-card-icon.ppt svg { color: #ea580c; }
.file-card-icon.archive svg { color: #f59e0b; }
.file-card-icon.text svg { color: #10b981; }

/* Name & Meta */
.file-card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.file-card-meta {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-card-time {
  font-size: 11px;
  opacity: 0.8;
}

/* List Item Styles */
.file-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.file-list-item:hover {
  border-color: var(--primary-color);
  background: var(--hover-bg);
}

.file-list-item.selected {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.list-item-checkbox {
  flex-shrink: 0;
  opacity: 0;
  transition: var(--transition);
}

.file-list-item:hover .list-item-checkbox,
.file-list-item.selected .list-item-checkbox,
.file-list-item.selection-mode .list-item-checkbox {
  opacity: 1;
}

.checkbox-box {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  transition: var(--transition);
}

.checkbox-box.checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.checkbox-box svg {
  width: 12px;
  height: 12px;
  color: white;
}

.file-list-item-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

.file-list-item-icon svg {
  width: 20px;
  height: 20px;
  color: var(--text-muted);
}

.file-list-item-icon.folder svg { color: #f59e0b; }

.file-list-item-info {
  flex: 1;
  min-width: 0;
}

.file-list-item-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-list-item-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  gap: 16px;
  margin-top: 2px;
}

/* Mobile */
@media (max-width: 768px) {
  .file-card {
    padding: 12px;
  }

  .file-card-icon {
    width: 48px;
    height: 48px;
  }

  .file-card-icon svg {
    width: 24px;
    height: 24px;
  }

  .file-card-name {
    font-size: 13px;
  }

  .file-card-checkbox,
  .list-item-checkbox {
    opacity: 1;
  }
}

/* Touch Devices */
@media (hover: none) {
  .file-card:hover {
    transform: none;
    box-shadow: var(--shadow-card);
  }

  .file-card:active {
    transform: scale(0.98);
  }

  .file-card-checkbox,
  .list-item-checkbox {
    opacity: 1;
  }
}
</style>
