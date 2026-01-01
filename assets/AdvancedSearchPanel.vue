<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  currentSearch: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'apply']);

// 文件类型选项
const fileTypes = [
  { id: 'image', label: '图片', icon: 'image', color: '#10b981' },
  { id: 'video', label: '视频', icon: 'video', color: '#3b82f6' },
  { id: 'document', label: '文档', icon: 'doc', color: '#f59e0b' },
  { id: 'archive', label: '压缩包', icon: 'archive', color: '#8b5cf6' },
  { id: 'executable', label: '程序', icon: 'exe', color: '#ef4444' },
  { id: 'other', label: '其他', icon: 'other', color: '#6b7280' }
];

// 大小单位选项
const sizeUnits = ['KB', 'MB', 'GB'];

// 表单数据
const selectedTypes = ref(new Set());
const extensions = ref('');
const minSize = ref('');
const minSizeUnit = ref('MB');
const maxSize = ref('');
const maxSizeUnit = ref('MB');
const keyword = ref('');

// 切换类型选择
function toggleType(typeId) {
  if (selectedTypes.value.has(typeId)) {
    selectedTypes.value.delete(typeId);
  } else {
    selectedTypes.value.add(typeId);
  }
  // 触发响应式更新
  selectedTypes.value = new Set(selectedTypes.value);
}

// 检查类型是否选中
function isTypeSelected(typeId) {
  return selectedTypes.value.has(typeId);
}

// 生成搜索字符串
const generatedSearch = computed(() => {
  const parts = [];

  // 关键词
  if (keyword.value.trim()) {
    parts.push(keyword.value.trim());
  }

  // 文件类型
  if (selectedTypes.value.size > 0) {
    const typeLabels = {
      image: '图片',
      video: '视频',
      document: '文档',
      archive: '压缩',
      executable: '程序',
      other: '其他'
    };
    const types = Array.from(selectedTypes.value).map(t => typeLabels[t]).join(',');
    parts.push(`type:${types}`);
  }

  // 扩展名
  if (extensions.value.trim()) {
    const exts = extensions.value.trim().replace(/^\./, '');
    parts.push(`ext:${exts}`);
  }

  // 大小范围
  const min = minSize.value ? `${minSize.value}${minSizeUnit.value}` : '';
  const max = maxSize.value ? `${maxSize.value}${maxSizeUnit.value}` : '';

  if (min && max) {
    parts.push(`size:${min}-${max}`);
  } else if (min) {
    parts.push(`size>=${min}`);
  } else if (max) {
    parts.push(`size<=${max}`);
  }

  return parts.join(' ');
});

// 是否有筛选条件
const hasFilters = computed(() => {
  return selectedTypes.value.size > 0 ||
         extensions.value.trim() !== '' ||
         minSize.value !== '' ||
         maxSize.value !== '' ||
         keyword.value.trim() !== '';
});

// 应用筛选
function applyFilters() {
  emit('apply', generatedSearch.value);
  emit('close');
}

// 清空筛选
function clearFilters() {
  selectedTypes.value = new Set();
  extensions.value = '';
  minSize.value = '';
  maxSize.value = '';
  keyword.value = '';
}

// 解析当前搜索字符串
function parseCurrentSearch() {
  if (!props.currentSearch) return;

  const query = props.currentSearch;

  // 解析类型
  const typeMatch = query.match(/type:([^\s]+)/i);
  if (typeMatch) {
    const typeStr = typeMatch[1].toLowerCase();
    const typeMap = {
      '图片': 'image', 'image': 'image', 'img': 'image',
      '视频': 'video', 'video': 'video', 'vid': 'video',
      '文档': 'document', 'document': 'document', 'doc': 'document', 'text': 'document',
      '压缩': 'archive', 'archive': 'archive', 'zip': 'archive', '压缩包': 'archive',
      '程序': 'executable', 'executable': 'executable', 'exe': 'executable',
      '其他': 'other', 'other': 'other'
    };
    const types = typeStr.split(/[,，|]/);
    types.forEach(t => {
      const mapped = typeMap[t.trim()];
      if (mapped) selectedTypes.value.add(mapped);
    });
  }

  // 解析扩展名
  const extMatch = query.match(/(?:ext:|\.(?=\w+(?:\s|$)))([^\s]+)/i);
  if (extMatch) {
    extensions.value = extMatch[1].replace(/^\./, '');
  }

  // 解析大小
  const sizeRangeMatch = query.match(/size:(\d+)(k|kb|m|mb|g|gb)?[-\.]+(\d+)(k|kb|m|mb|g|gb)?/i);
  if (sizeRangeMatch) {
    minSize.value = sizeRangeMatch[1];
    minSizeUnit.value = normalizeUnit(sizeRangeMatch[2]);
    maxSize.value = sizeRangeMatch[3];
    maxSizeUnit.value = normalizeUnit(sizeRangeMatch[4]);
  } else {
    const sizeMinMatch = query.match(/size[>=]+(\d+)(k|kb|m|mb|g|gb)?/i);
    const sizeMaxMatch = query.match(/size[<=]+(\d+)(k|kb|m|mb|g|gb)?/i);
    if (sizeMinMatch) {
      minSize.value = sizeMinMatch[1];
      minSizeUnit.value = normalizeUnit(sizeMinMatch[2]);
    }
    if (sizeMaxMatch) {
      maxSize.value = sizeMaxMatch[1];
      maxSizeUnit.value = normalizeUnit(sizeMaxMatch[2]);
    }
  }

  // 剩余的作为关键词
  let remaining = query
    .replace(/type:[^\s]+/gi, '')
    .replace(/ext:[^\s]+/gi, '')
    .replace(/\.\w+(?=\s|$)/g, '')
    .replace(/size[:<>=]+[^\s]+/gi, '')
    .trim();
  keyword.value = remaining;
}

function normalizeUnit(unit) {
  if (!unit) return 'MB';
  const u = unit.toUpperCase();
  if (u.startsWith('K')) return 'KB';
  if (u.startsWith('G')) return 'GB';
  return 'MB';
}

// 监听 show 变化，解析当前搜索
watch(() => props.show, (newVal) => {
  if (newVal) {
    parseCurrentSearch();
  }
});
</script>

<template>
  <Transition name="panel">
    <div v-if="show" class="search-panel" @click.stop>
      <div class="panel-header">
        <h4>高级搜索</h4>
        <button class="close-btn" @click="$emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="panel-body">
        <!-- 关键词 -->
        <div class="form-group">
          <label>文件名包含</label>
          <input
            type="text"
            v-model="keyword"
            placeholder="输入关键词..."
            class="form-input"
          />
        </div>

        <!-- 文件类型 -->
        <div class="form-group">
          <label>文件类型</label>
          <div class="type-grid">
            <button
              v-for="type in fileTypes"
              :key="type.id"
              :class="['type-btn', { selected: isTypeSelected(type.id) }]"
              :style="{ '--type-color': type.color }"
              @click="toggleType(type.id)"
            >
              <!-- 图片图标 -->
              <svg v-if="type.icon === 'image'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <!-- 视频图标 -->
              <svg v-else-if="type.icon === 'video'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="23 7 16 12 23 17 23 7"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
              <!-- 文档图标 -->
              <svg v-else-if="type.icon === 'doc'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <!-- 压缩包图标 -->
              <svg v-else-if="type.icon === 'archive'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                <line x1="12" y1="11" x2="12" y2="17"/>
                <line x1="9" y1="14" x2="15" y2="14"/>
              </svg>
              <!-- 程序图标 -->
              <svg v-else-if="type.icon === 'exe'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <!-- 其他图标 -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <path d="M13 2v7h7"/>
              </svg>
              <span>{{ type.label }}</span>
            </button>
          </div>
        </div>

        <!-- 扩展名 -->
        <div class="form-group">
          <label>扩展名</label>
          <input
            type="text"
            v-model="extensions"
            placeholder="如：pdf、jpg,png、mp4"
            class="form-input"
          />
          <span class="form-hint">多个用逗号分隔</span>
        </div>

        <!-- 文件大小 -->
        <div class="form-group">
          <label>文件大小</label>
          <div class="size-range">
            <div class="size-input-group">
              <input
                type="number"
                v-model="minSize"
                placeholder="最小"
                class="form-input size-input"
                min="0"
              />
              <select v-model="minSizeUnit" class="unit-select">
                <option v-for="unit in sizeUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
            <span class="size-separator">至</span>
            <div class="size-input-group">
              <input
                type="number"
                v-model="maxSize"
                placeholder="最大"
                class="form-input size-input"
                min="0"
              />
              <select v-model="maxSizeUnit" class="unit-select">
                <option v-for="unit in sizeUnits" :key="unit" :value="unit">{{ unit }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 预览 -->
        <div v-if="generatedSearch" class="preview-section">
          <label>搜索语法预览</label>
          <code class="preview-code">{{ generatedSearch }}</code>
        </div>
      </div>

      <div class="panel-footer">
        <button class="btn btn-secondary" @click="clearFilters" :disabled="!hasFilters">
          清空
        </button>
        <button class="btn btn-primary" @click="applyFilters">
          应用筛选
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.search-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  max-width: 90vw;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--divider-color);
  background: var(--bg-secondary);
}

.panel-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.panel-body {
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  transition: var(--transition);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(243, 128, 32, 0.1);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

/* 文件类型网格 */
.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
}

.type-btn svg {
  width: 22px;
  height: 22px;
}

.type-btn:hover {
  background: var(--hover-bg);
  border-color: var(--border-color);
}

.type-btn.selected {
  background: color-mix(in srgb, var(--type-color) 12%, transparent);
  border-color: var(--type-color);
  color: var(--type-color);
}

.type-btn.selected svg {
  stroke: var(--type-color);
}

/* 大小范围 */
.size-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-input-group {
  display: flex;
  flex: 1;
  gap: 0;
}

.size-input {
  flex: 1;
  border-radius: var(--radius-md) 0 0 var(--radius-md);
  border-right: none;
  min-width: 0;
}

.unit-select {
  padding: 10px 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--input-border);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
}

.unit-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

.size-separator {
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}

/* 预览 */
.preview-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--divider-color);
}

.preview-code {
  display: block;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--primary-color);
  word-break: break-all;
}

/* 底部按钮 */
.panel-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--divider-color);
  background: var(--bg-secondary);
}

.btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(243, 128, 32, 0.3);
}

.btn-secondary {
  background: var(--hover-bg);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* 动画 */
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .search-panel {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    max-height: 80vh;
  }

  .panel-body {
    max-height: 60vh;
  }

  .type-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .panel-enter-from,
  .panel-leave-to {
    transform: translateY(100%);
  }
}
</style>
