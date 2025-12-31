<script setup>
defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="modelValue"
      class="dialog-mask"
      @click="emit('update:modelValue', false)"
    >
      <Transition name="scale-up" appear>
        <div class="dialog-container" @click.stop>
          <slot></slot>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style>
.dialog-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 9998;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.dialog-container {
  background-color: var(--card-bg, #ffffff);
  border-radius: var(--radius-lg, 16px);
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

/* Scale up animation */
.scale-up-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-up-leave-active {
  transition: all 0.15s ease-in;
}

.scale-up-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.scale-up-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dialog-container {
    background-color: var(--card-bg, #1e293b);
  }
}

/* Mobile responsive */
@media only screen and (max-width: 767px) {
  .dialog-mask {
    padding: 12px;
    align-items: flex-end;
  }

  .dialog-container {
    width: 100%;
    max-width: 100%;
    border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0;
    margin-bottom: -12px;
  }
}
</style>
