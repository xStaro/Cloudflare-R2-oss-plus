<script setup>
const props = defineProps({
  viewMode: {
    type: String,
    default: 'grid' // 'grid' | 'list'
  },
  sortBy: {
    type: String,
    default: 'name' // 'name' | 'size' | 'date'
  },
  sortOrder: {
    type: String,
    default: 'asc' // 'asc' | 'desc'
  },
  selectionMode: {
    type: Boolean,
    default: false
  },
  selectedCount: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  },
  isReadonly: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:viewMode',
  'update:sortBy',
  'update:sortOrder',
  'toggleSelection',
  'selectAll',
  'createFolder',
  'refresh'
]);

function toggleSort(field) {
  if (field === emit.sortBy) {
    emit('update:sortOrder', emit.sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    emit('update:sortBy', field);
    emit('update:sortOrder', 'asc');
  }
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <slot name="breadcrumb"></slot>
    </div>

    <div class="toolbar-right">
      <!-- Selection Toggle -->
      <button
        class="toolbar-btn"
        :class="{ active: selectionMode }"
        @click="emit('toggleSelection')"
        title="选择模式"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 11 12 14 22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      </button>

      <!-- Select All (only in selection mode) -->
      <button
        v-if="selectionMode"
        class="toolbar-btn"
        @click="emit('selectAll')"
        :title="selectedCount === totalCount ? '取消全选' : '全选'"
      >
        <svg v-if="selectedCount === totalCount" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
      </button>

      <div class="toolbar-divider"></div>

      <!-- Sort Dropdown -->
      <div class="sort-dropdown">
        <button class="toolbar-btn" title="排序">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="6" x2="16" y2="6"/>
            <line x1="4" y1="12" x2="12" y2="12"/>
            <line x1="4" y1="18" x2="8" y2="18"/>
            <polyline points="15 15 18 18 21 15"/>
            <line x1="18" y1="9" x2="18" y2="18"/>
          </svg>
        </button>
        <div class="dropdown-menu">
          <button
            class="dropdown-item"
            :class="{ active: sortBy === 'name' }"
            @click="emit('update:sortBy', 'name')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6h16M4 12h10M4 18h4"/>
            </svg>
            名称
          </button>
          <button
            class="dropdown-item"
            :class="{ active: sortBy === 'size' }"
            @click="emit('update:sortBy', 'size')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <path d="M14 2v6h6"/>
            </svg>
            大小
          </button>
          <button
            class="dropdown-item"
            :class="{ active: sortBy === 'date' }"
            @click="emit('update:sortBy', 'date')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            日期
          </button>
          <div class="dropdown-divider"></div>
          <button
            class="dropdown-item"
            @click="emit('update:sortOrder', sortOrder === 'asc' ? 'desc' : 'asc')"
          >
            <svg v-if="sortOrder === 'asc'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <polyline points="19 12 12 19 5 12"/>
            </svg>
            {{ sortOrder === 'asc' ? '升序' : '降序' }}
          </button>
        </div>
      </div>

      <!-- View Mode Toggle -->
      <button
        class="toolbar-btn"
        :class="{ active: viewMode === 'grid' }"
        @click="emit('update:viewMode', 'grid')"
        title="网格视图"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>

      <button
        class="toolbar-btn"
        :class="{ active: viewMode === 'list' }"
        @click="emit('update:viewMode', 'list')"
        title="列表视图"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </button>

      <div class="toolbar-divider"></div>

      <!-- Create Folder -->
      <button
        v-if="!isReadonly"
        class="toolbar-btn"
        @click="emit('createFolder')"
        title="新建文件夹"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      </button>

      <!-- Refresh -->
      <button
        class="toolbar-btn"
        @click="emit('refresh')"
        title="刷新"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--divider-color);
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  transition: var(--transition);
  background: none;
  border: none;
  cursor: pointer;
}

.toolbar-btn:hover {
  background: var(--hover-bg);
  color: var(--primary-color);
}

.toolbar-btn.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.toolbar-btn svg {
  width: 18px;
  height: 18px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--divider-color);
  margin: 0 4px;
}

/* Sort Dropdown */
.sort-dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  min-width: 140px;
  padding: 6px;
  z-index: 100;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px);
  transition: all 0.2s ease;
}

.sort-dropdown:hover .dropdown-menu,
.sort-dropdown:focus-within .dropdown-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  transition: var(--transition);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--hover-bg);
}

.dropdown-item.active {
  color: var(--primary-color);
  background: var(--primary-light);
}

.dropdown-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.dropdown-divider {
  height: 1px;
  background: var(--divider-color);
  margin: 6px 0;
}

/* Mobile */
@media (max-width: 768px) {
  .toolbar {
    padding: 8px 0;
    gap: 8px;
  }

  .toolbar-btn {
    width: 32px;
    height: 32px;
  }

  .toolbar-btn svg {
    width: 16px;
    height: 16px;
  }

  .toolbar-divider {
    height: 20px;
    margin: 0 2px;
  }
}
</style>
