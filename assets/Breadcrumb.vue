<script setup>
import { computed } from 'vue';

const props = defineProps({
  path: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['navigate']);

// 解析路径为面包屑项
const breadcrumbs = computed(() => {
  if (!props.path) return [];

  const parts = props.path.split('/').filter(Boolean);
  const items = [];
  let currentPath = '';

  for (const part of parts) {
    currentPath += part + '/';
    items.push({
      name: part,
      path: currentPath
    });
  }

  return items;
});

function navigateTo(path) {
  emit('navigate', path);
}
</script>

<template>
  <nav class="breadcrumb" aria-label="导航路径">
    <!-- Home -->
    <div class="breadcrumb-item">
      <button class="breadcrumb-link home" @click="navigateTo('')" title="根目录">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span class="home-text">文件库</span>
      </button>
    </div>

    <!-- Path segments -->
    <template v-for="(item, index) in breadcrumbs" :key="item.path">
      <span class="breadcrumb-separator">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </span>
      <div class="breadcrumb-item">
        <button
          v-if="index < breadcrumbs.length - 1"
          class="breadcrumb-link"
          @click="navigateTo(item.path)"
        >
          {{ item.name }}
        </button>
        <span v-else class="breadcrumb-current">
          {{ item.name }}
        </span>
      </div>
    </template>
  </nav>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 14px;
  color: var(--text-secondary);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.breadcrumb::-webkit-scrollbar {
  display: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  transition: var(--transition);
  background: none;
  border: none;
  cursor: pointer;
  font-size: inherit;
}

.breadcrumb-link:hover {
  background: var(--hover-bg);
  color: var(--primary-color);
}

.breadcrumb-link.home svg {
  width: 16px;
  height: 16px;
}

.home-text {
  font-weight: 500;
}

.breadcrumb-separator {
  display: flex;
  align-items: center;
  color: var(--text-muted);
}

.breadcrumb-separator svg {
  width: 14px;
  height: 14px;
}

.breadcrumb-current {
  padding: 6px 10px;
  color: var(--text-primary);
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Mobile */
@media (max-width: 768px) {
  .home-text {
    display: none;
  }

  .breadcrumb-link {
    padding: 6px 8px;
  }

  .breadcrumb-current {
    max-width: 120px;
  }
}
</style>
