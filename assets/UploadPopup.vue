<script setup>
defineProps({
  modelValue: Boolean,
});

const emit = defineEmits(["update:modelValue", "upload", "createFolder"]);
</script>

<template>
  <div class="popup">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="popup-modal"
        @click="emit('update:modelValue', false)"
      ></div>
    </Transition>
    <Transition name="slide-up">
      <div v-if="modelValue" class="popup-content">
        <div class="popup-header">
          <div class="popup-handle"></div>
        </div>
        <div class="button-grid">
          <button class="upload-option" onclick="this.lastElementChild.click()">
            <div class="upload-option-icon camera">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path
                  d="M149.1 64.8L138.7 96H64C28.7 96 0 124.7 0 160V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H373.3L362.9 64.8C356.4 45.2 338.1 32 317.4 32H194.6c-20.7 0-39 13.2-45.5 32.8zM256 384c-53 0-96-43-96-96s43-96 96-96s96 43 96 96s-43 96-96 96z"
                />
              </svg>
            </div>
            <span>拍照上传</span>
            <input
              type="file"
              accept="image/*"
              capture="camera"
              hidden
              @change="emit('upload', $event.target)"
            />
          </button>
          <button class="upload-option" onclick="this.lastElementChild.click()">
            <div class="upload-option-icon image">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">
                <path
                  d="M256 0H576c35.3 0 64 28.7 64 64V288c0 35.3-28.7 64-64 64H256c-35.3 0-64-28.7-64-64V64c0-35.3 28.7-64 64-64zM476 106.7C471.5 100 464 96 456 96s-15.5 4-20 10.7l-56 84L362.7 169c-4.6-5.7-11.5-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4s12.4 13.6 21.6 13.6h80 48H552c8.9 0 17-4.9 21.2-12.7s3.7-17.3-1.2-24.6l-96-144zM336 96c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zM64 128h96V384v32c0 17.7 14.3 32 32 32H320c17.7 0 32-14.3 32-32V384H512v64c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V192c0-35.3 28.7-64 64-64zm8 64c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V208c0-8.8-7.2-16-16-16H72zm0 104c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V312c0-8.8-7.2-16-16-16H72zm0 104c-8.8 0-16 7.2-16 16v16c0 8.8 7.2 16 16 16H88c8.8 0 16-7.2 16-16V416c0-8.8-7.2-16-16-16H72zm336 16v16c0 8.8 7.2 16 16 16h16c8.8 0 16-7.2 16-16V416c0-8.8-7.2-16-16-16H424c-8.8 0-16 7.2-16 16z"
                />
              </svg>
            </div>
            <span>图片/视频</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              @change="emit('upload', $event.target)"
            />
          </button>
          <button class="upload-option" onclick="this.lastElementChild.click()">
            <div class="upload-option-icon file">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                <path
                  d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z"
                />
              </svg>
            </div>
            <span>文件</span>
            <input
              type="file"
              accept="*"
              multiple
              hidden
              @change="emit('upload', $event.target)"
            />
          </button>
          <button class="upload-option" type="button" @click="emit('createFolder')">
            <div class="upload-option-icon folder">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <path
                  d="M512 416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H181.5c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7H448c35.3 0 64 28.7 64 64V416zM232 376c0 13.3 10.7 24 24 24s24-10.7 24-24V312h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H280V200c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H168c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z"
                />
              </svg>
            </div>
            <span>新建文件夹</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.popup-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.popup-content {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  border-radius: var(--radius-xl, 24px) var(--radius-xl, 24px) 0 0;
  background-color: var(--card-bg, #ffffff);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.popup-header {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px;
}

.popup-handle {
  width: 40px;
  height: 4px;
  background-color: var(--border-color, #e2e8f0);
  border-radius: 2px;
}

.popup .button-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 8px calc(16px + env(safe-area-inset-right, 0px)) 24px calc(16px + env(safe-area-inset-left, 0px));
}

.upload-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 8px;
  border-radius: var(--radius-md, 10px);
  transition: all 0.2s ease;
  cursor: pointer;
}

.upload-option:hover {
  background-color: var(--hover-bg, #f1f5f9);
}

.upload-option:active {
  transform: scale(0.95);
}

.upload-option-icon {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-md, 10px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.upload-option:hover .upload-option-icon {
  transform: scale(1.1);
}

.upload-option-icon.camera {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.upload-option-icon.image {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
}

.upload-option-icon.file {
  background: linear-gradient(135deg, #10b981, #059669);
}

.upload-option-icon.folder {
  background: linear-gradient(135deg, #f38020, #ea580c);
}

.upload-option-icon svg {
  width: 24px;
  height: 24px;
  fill: white;
}

.upload-option span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #1e293b);
  white-space: nowrap;
}

/* Small Mobile */
@media (max-width: 480px) {
  .popup .button-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 12px calc(20px + env(safe-area-inset-right, 0px)) 24px calc(20px + env(safe-area-inset-left, 0px));
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .popup-content {
    background-color: var(--card-bg, #1e293b);
  }

  .popup-handle {
    background-color: var(--border-color, #334155);
  }

  .upload-option span {
    color: var(--text-primary, #f1f5f9);
  }

  .upload-option:hover {
    background-color: var(--hover-bg, #334155);
  }
}

/* PC端响应式 */
@media (min-width: 768px) {
  .popup-content {
    left: 50%;
    right: auto;
    bottom: 50%;
    transform: translate(-50%, 50%);
    border-radius: var(--radius-xl, 24px);
    max-width: 420px;
    width: 90%;
  }

  .popup .button-grid {
    padding: 16px 24px 32px;
    gap: 12px;
  }

  .upload-option {
    padding: 20px 12px;
  }

  .upload-option-icon {
    width: 60px;
    height: 60px;
  }

  .upload-option-icon svg {
    width: 28px;
    height: 28px;
  }

  .upload-option span {
    font-size: 14px;
  }
}

/* Slide-up animation override for PC */
@media (min-width: 768px) {
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translate(-50%, 50%) scale(0.9);
    opacity: 0;
  }

  .slide-up-enter-to,
  .slide-up-leave-from {
    transform: translate(-50%, 50%) scale(1);
    opacity: 1;
  }
}
</style>
