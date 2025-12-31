<script setup>
defineProps({
  modelValue: Boolean,
  items: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "click"]);
</script>

<template>
  <div class="menu">
    <Transition name="fade">
      <div
        v-show="modelValue"
        class="menu-modal"
        @click="emit('update:modelValue', false)"
      ></div>
    </Transition>
    <Transition name="menu-slide">
      <div v-show="modelValue" class="menu-content">
        <ul>
          <li
            v-for="(item, index) in items"
            :key="index"
            @click="
              emit('update:modelValue', false);
              emit('click', item.text);
            "
          >
            <span v-text="item.text"></span>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.menu-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: transparent;
  z-index: 1;
}

.menu-content {
  position: absolute;
  background-color: var(--card-bg, #ffffff);
  z-index: 2;
  border-radius: var(--radius-md, 10px);
  right: 0;
  min-width: 160px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid var(--border-color, #e2e8f0);
}

.menu-content ul {
  padding: 6px 0;
}

.menu-content li {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  display: flex;
  align-items: center;
  gap: 10px;
}

.menu-content li:hover {
  background-color: var(--primary-light, #fff5eb);
  color: var(--primary-color, #f38020);
}

.menu-content li:active {
  background-color: var(--primary-color, #f38020);
  color: white;
}

/* Menu slide animation */
.menu-slide-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.menu-slide-leave-active {
  transition: all 0.15s ease-in;
}

.menu-slide-enter-from {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.menu-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .menu-content {
    background-color: var(--card-bg, #1e293b);
    border-color: var(--border-color, #334155);
  }

  .menu-content li {
    color: var(--text-primary, #f1f5f9);
  }

  .menu-content li:hover {
    background-color: var(--hover-bg, #334155);
  }
}
</style>
