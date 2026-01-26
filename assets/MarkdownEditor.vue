<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import ConfirmDialog from "./ConfirmDialog.vue";
import { escapeHtml, sanitizeHtmlFragment, sanitizeImageSrc, sanitizeLinkHref } from "./markdown-sanitize.mjs";
import { encodePathForUrl } from "./url-utils.mjs";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  fileKey: {
    type: String,
    default: "",
  },
  contentType: {
    type: String,
    default: "",
  },
  guestUploadPassword: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue", "saved", "toast"]);

const loading = ref(false);
const saving = ref(false);
const error = ref("");

const content = ref("");
const originalContent = ref("");
const textareaRef = ref(null);

const libsReady = ref(false);
const libsError = ref("");

const activeTab = ref("edit");
const showConfirmClose = ref(false);
const renderedHtml = ref("");

const fileName = computed(() => {
  if (!props.fileKey) return "";
  return props.fileKey.split("/").filter(Boolean).pop() || props.fileKey;
});

const dirty = computed(() => content.value !== originalContent.value);

const rawUrl = computed(() => `/raw/${encodePathForUrl(props.fileKey)}`);
const saveUrl = computed(() => `/api/write/items/${encodePathForUrl(props.fileKey)}`);

const resolvedContentType = computed(() => {
  const type = (props.contentType || "").trim();
  return type || "text/markdown; charset=utf-8";
});

function getAuthHeaders() {
  const headers = {};
  const credentials = localStorage.getItem("auth_credentials");
  if (credentials) headers["Authorization"] = `Basic ${credentials}`;
  return headers;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`脚本加载失败：${src}`));
    document.head.appendChild(script);
  });
}

function loadStyle(href) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[rel~="stylesheet"][href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`样式加载失败：${href}`));
    document.head.appendChild(link);
  });
}

const CDN = {
  marked: "https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js",
  hljs: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js",
  hljsStyle:
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css",
};

let markedConfigured = false;
let markedSafeMode = false;
function configureMarked() {
  if (markedConfigured) return;
  if (!window.marked || !window.hljs) return;

  const escapeAttr = escapeHtml;

  const safeRenderer = window.marked?.Renderer ? new window.marked.Renderer() : null;
  if (!safeRenderer) {
    markedSafeMode = false;
    markedConfigured = true;
    libsError.value = "安全策略：无法初始化 Markdown 渲染器，预览已降级为纯文本";
    return;
  }

  safeRenderer.html = (html) => sanitizeHtmlFragment(html);

  // URL Rewrite Logic
  // We need to access props.fileKey here, but configureMarked is outside setup.
  // BUT we can get it from the outer scope if we were careful, but here props is inside setup.
  // Since configureMarked is called once globally (singleton pattern for marked), we have a problem.
  // Marked is a global singleton. We shouldn't rely on 'this.fileKey' inside the renderer if it's shared.
  // Actually, marked is configured globally via setOptions.
  // The renderer instance is reused? Or created once?
  // We created 'safeRenderer' once and reused it.
  
  // To support dynamic base path based on current file, we should update the renderer hooks 
  // right before parsing, OR pass context.
  // Or simpler: don't use singleton configuration if we need dynamic context.
  // But loading libs is async and we want to do it once.
  
  // Let's modify configureMarked to NOT set the renderer hooks permanently if they depend on context.
  // OR, we can make the hooks access a current context variable.
  
  // Since we are in Vue script setup, props are available.
  // But configureMarked is defined in script setup scope, so it closes over 'props' IF it's defined there.
  // Yes, configureMarked is inside <script setup>, so it has access to 'props'.
  // BUT 'markedConfigured' flag makes it run only once!
  // If we open another file, props.fileKey changes, but configureMarked won't run again.
  // This is a bug in the original code for single-page app if we want context-aware rendering.
  
  // Fix: Re-attach renderer hooks on every render or use a dynamic getter for currentDir.
}
// We will move the renderer setup INTO renderPreviewNow or similar, or make the hook dynamic.
// Let's rewrite configureMarked to be setupMarked, and call it once to init libs, 
// but attach renderer options every time we parse?
// No, marked.setOptions is global.
// We can use the 'walkTokens' or just override the renderer methods on the instance we pass to parse?
// marked.parse(text, { renderer: customRenderer })
// This is the best way.

// Let's refactor to create a renderer per parse or update the global one's context.

// For now, let's keep it simple and just update the global renderer's context-dependent functions.


async function ensureMarkdownLibs() {
  libsError.value = "";
  try {
    await Promise.all([loadScript(CDN.marked), loadScript(CDN.hljs), loadStyle(CDN.hljsStyle)]);
    configureMarked();
    libsReady.value = true;
  } catch (e) {
    libsReady.value = false;
    libsError.value = e?.message || "预览组件加载失败";
  }
}

let renderTimer = null;
function renderPreviewNow() {
  if (!libsReady.value || !window.marked) {
    renderedHtml.value = "";
    return;
  }

  if (!markedSafeMode) {
    renderedHtml.value = `<pre><code>${escapeHtml(content.value || "")}</code></pre>`;
    return;
  }

  try {
    // Create a fresh renderer for this parse to ensure context (fileKey) is correct
    const safeRenderer = new window.marked.Renderer();
    const escapeAttr = escapeHtml;

    safeRenderer.html = (html) => sanitizeHtmlFragment(html);

    const currentDir = props.fileKey ? props.fileKey.split('/').slice(0, -1).join('/') : '';
    
    const rewriteUrl = (href) => {
        if (!href) return null;
        if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
          return href;
        }
        try {
          const dummyBase = 'http://dummy.base/';
          const baseDir = currentDir ? currentDir + '/' : '';
          const url = new URL(href, dummyBase + baseDir);
          const path = url.pathname.substring(1); 
          return `/raw/${encodePathForUrl(decodeURIComponent(path))}`;
        } catch (e) {
          return href;
        }
    };

    safeRenderer.link = (href, title, linkText) => {
      const safeHref = sanitizeLinkHref(href);
      const finalHref = rewriteUrl(safeHref);
      if (!finalHref) return linkText;
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      return `<a href="${escapeAttr(finalHref)}"${titleAttr}>${linkText}</a>`;
    };

    safeRenderer.image = (href, title, alt) => {
      const safeSrc = sanitizeImageSrc(href);
      const finalSrc = rewriteUrl(safeSrc);
      if (!finalSrc) return "";
      const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
      return `<img src="${escapeAttr(finalSrc)}" alt="${escapeAttr(alt)}"${titleAttr} />`;
    };

    safeRenderer.code = (code, language) => {
        const validLang = !!(language && window.hljs.getLanguage(language));
        let highlighted;
        try {
           highlighted = validLang
            ? window.hljs.highlight(code, { language }).value
            : window.hljs.highlightAuto(code).value;
        } catch (e) {
           highlighted = escapeAttr(code);
        }
        
        const langClass = language ? `language-${language}` : '';
        return `<pre><code class="hljs ${langClass}">${highlighted}</code></pre>`;
    };

    // Use parse with the specific renderer
    renderedHtml.value = window.marked.parse(content.value || "", { 
      renderer: safeRenderer,
      breaks: true,
      gfm: true
    });
  } catch (e) {
    renderedHtml.value = `<p>预览渲染失败：${String(e?.message || e)}</p>`;
  }
}

function scheduleRenderPreview() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    renderTimer = null;
    renderPreviewNow();
  }, 200);
}

async function loadFile() {
  if (!props.fileKey) return;

  loading.value = true;
  saving.value = false;
  error.value = "";
  libsReady.value = false;
  libsError.value = "";
  activeTab.value = "edit";

  const contentPromise = fetch(rawUrl.value, { headers: getAuthHeaders(), cache: "no-store" });
  const libsPromise = ensureMarkdownLibs();

  try {
    const response = await contentPromise;
    if (!response.ok) {
      throw new Error(response.status === 403 ? "无权访问此文件" : "加载失败");
    }
    const text = await response.text();
    content.value = text;
    originalContent.value = text;
    await nextTick();
    textareaRef.value?.focus();
  } catch (e) {
    error.value = e?.message || "加载失败";
  } finally {
    await libsPromise;
    loading.value = false;
  }
}

async function save() {
  if (!props.fileKey) return;
  if (saving.value) return;
  if (!dirty.value) return;

  saving.value = true;
  error.value = "";

  try {
    const headers = { "Content-Type": resolvedContentType.value, ...getAuthHeaders() };
    if (props.guestUploadPassword) headers["X-Guest-Password"] = props.guestUploadPassword;

    await axios.put(saveUrl.value, content.value, { headers });

    originalContent.value = content.value;
    emit("toast", { type: "success", message: "已保存" });
    emit("saved", { fileKey: props.fileKey });
  } catch (e) {
    const status = e?.response?.status;
    if (status === 401) {
      error.value = "没有操作权限";
    } else {
      error.value = e?.response?.data?.error || e?.message || "保存失败";
    }
    emit("toast", { type: "error", message: error.value });
  } finally {
    saving.value = false;
  }
}

function handleTextareaKeydown(e) {
  if (e.key !== "Tab") return;
  e.preventDefault();

  const textarea = e.target;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;

  const value = content.value || "";
  content.value = value.slice(0, start) + "\t" + value.slice(end);

  nextTick(() => {
    textarea.selectionStart = start + 1;
    textarea.selectionEnd = start + 1;
    textarea.focus();
  });
}

function requestClose() {
  if (saving.value) return;
  if (dirty.value) {
    showConfirmClose.value = true;
    return;
  }
  emit("update:modelValue", false);
}

function forceClose() {
  showConfirmClose.value = false;
  emit("update:modelValue", false);
}

function handleKeydown(e) {
  if (!props.modelValue) return;

  if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
    e.preventDefault();
    save();
    return;
  }

  if (e.key === "Escape") {
    requestClose();
  }
}

watch([content, libsReady], () => {
  if (!props.modelValue) return;
  if (!libsReady.value) {
    renderedHtml.value = "";
    return;
  }
  scheduleRenderPreview();
});

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeydown);
      loadFile();
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeydown);
      if (renderTimer) {
        clearTimeout(renderTimer);
        renderTimer = null;
      }
      error.value = "";
      libsError.value = "";
    }
  }
);

watch(
  () => props.fileKey,
  () => {
    if (props.modelValue) loadFile();
  }
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = "";
  if (renderTimer) {
    clearTimeout(renderTimer);
    renderTimer = null;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="modelValue" class="dialog-overlay" @click.self="requestClose">
        <div class="dialog-content markdown-editor" @click.stop>
          <div class="dialog-header">
            <div class="header-left">
              <h3 class="title" :title="fileName || fileKey">
                {{ fileName || fileKey }}
              </h3>
              <span v-if="dirty" class="dirty-badge">未保存</span>
            </div>

            <div class="header-actions">
              <button
                class="btn btn-secondary"
                :disabled="saving"
                @click="requestClose"
                title="关闭 (Esc)"
              >
                关闭
              </button>
              <button
                class="btn btn-primary"
                :disabled="saving || !dirty"
                @click="save"
                title="保存 (Ctrl/⌘+S)"
              >
                {{ saving ? "保存中..." : "保存" }}
              </button>
            </div>
          </div>

          <div class="dialog-body">
            <div v-if="loading" class="state">
              <div class="loading-spinner"></div>
              <p>加载中...</p>
            </div>

            <div v-else class="editor-wrap">
              <div class="tabs">
                <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'edit' }"
                  @click="activeTab = 'edit'"
                >
                  编辑
                </button>
                <button
                  class="tab-btn"
                  :class="{ active: activeTab === 'preview' }"
                  @click="activeTab = 'preview'"
                >
                  预览
                </button>
              </div>

              <div class="panes">
                <div class="pane editor-pane" :class="{ active: activeTab === 'edit' }">
                  <textarea
                    ref="textareaRef"
                    v-model="content"
                    class="editor-textarea"
                    spellcheck="false"
                    autocomplete="off"
                    autocapitalize="off"
                    @keydown="handleTextareaKeydown"
                  ></textarea>
                </div>

                <div class="pane preview-pane" :class="{ active: activeTab === 'preview' }">
                  <div v-if="libsError" class="hint">
                    {{ libsError }}（仍可编辑与保存）
                  </div>
                  <div v-else-if="!libsReady" class="hint">正在加载预览组件...</div>
                  <div v-else class="markdown-body" v-html="renderedHtml"></div>
                </div>
              </div>

              <div v-if="error" class="error">
                {{ error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <ConfirmDialog
    v-model="showConfirmClose"
    title="未保存的更改"
    message="内容尚未保存，确认关闭编辑器？"
    confirmText="关闭"
    cancelText="继续编辑"
    type="warning"
    @confirm="forceClose"
  />
</template>

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
  max-width: 1200px;
  height: 85vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dirty-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: rgba(245, 158, 11, 0.12);
  color: var(--warning-color);
  border: 1px solid rgba(245, 158, 11, 0.2);
  flex: 0 0 auto;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  border: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.dialog-body {
  flex: 1;
  min-height: 0;
}

.state {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
  padding: 24px;
}

.editor-wrap {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tabs {
  display: none;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.tab-btn {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--card-bg);
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.tab-btn.active {
  background: var(--primary-light);
  color: var(--primary-color);
  border-color: rgba(243, 128, 32, 0.35);
}

.panes {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.pane {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
}

.pane:last-child {
  border-right: none;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 16px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-size: 13px;
  line-height: 1.6;
}

.preview-pane {
  overflow: auto;
  padding: 48px;
  background: var(--card-bg);
}

.markdown-body {
  max-width: 860px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
  word-wrap: break-word;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-color);
}

.markdown-body h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-color);
}

.markdown-body h3 {
  font-size: 1.25em;
}

.markdown-body h4 {
  font-size: 1em;
}

.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body blockquote {
  margin: 0 0 16px;
  padding: 0 1em;
  color: var(--text-secondary);
  border-left: 0.25em solid var(--border-color);
}

.markdown-body ul,
.markdown-body ol {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-body ul li {
  list-style-type: disc;
}

.markdown-body ul ul li {
  list-style-type: circle;
}

.markdown-body ol li {
  list-style-type: decimal;
}

.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-top: 0;
  margin-bottom: 16px;
  width: 100%;
  overflow: auto;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid var(--border-color);
}

.markdown-body table th {
  font-weight: 600;
  background-color: var(--bg-secondary);
}

.markdown-body table tr {
  background-color: var(--card-bg);
  border-top: 1px solid var(--border-color);
}

.markdown-body table tr:nth-child(2n) {
  background-color: var(--bg-secondary);
}

.markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
  background-color: var(--card-bg);
  border-radius: 6px;
}

.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #161b22;
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-body pre code {
  display: inline;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
  font-size: 100%;
  color: #e6edf3;
}

.markdown-body a {
  color: #0969da;
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: var(--border-color);
  border: 0;
}

.markdown-body :deep(pre code.hljs) {
  background: transparent;
}

/* Dark Theme Adjustments for Markdown */
[data-theme="dark"] .markdown-body {
  color: #c9d1d9;
}

[data-theme="dark"] .markdown-body h1,
[data-theme="dark"] .markdown-body h2 {
  border-bottom-color: #30363d;
}

[data-theme="dark"] .markdown-body blockquote {
  color: #8b949e;
  border-left-color: #30363d;
}

[data-theme="dark"] .markdown-body table th,
[data-theme="dark"] .markdown-body table td {
  border-color: #30363d;
}

[data-theme="dark"] .markdown-body table th {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body table tr {
  background-color: #0d1117;
  border-top-color: #21262d;
}

[data-theme="dark"] .markdown-body table tr:nth-child(2n) {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body code {
  background-color: rgba(110, 118, 129, 0.4);
}

[data-theme="dark"] .markdown-body pre {
  background-color: #161b22;
}

[data-theme="dark"] .markdown-body a {
  color: #58a6ff;
}

[data-theme="dark"] .markdown-body hr {
  background-color: #30363d;
}

[data-theme="dark"] .markdown-body img {
  background-color: #0d1117;
}

/* Scrollbar styling for code blocks */
.markdown-body pre::-webkit-scrollbar {
  height: 8px;
}

.markdown-body pre::-webkit-scrollbar-thumb {
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 4px;
}

[data-theme="dark"] .markdown-body pre::-webkit-scrollbar-thumb {
  background-color: rgba(110, 118, 129, 0.4);
}

.hint {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 12px;
}

.error {
  padding: 10px 12px;
  margin: 12px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.08);
  color: var(--error-color);
  font-size: 13px;
}

/* Transition */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

/* Mobile */
@media only screen and (max-width: 900px) {
  .dialog-overlay {
    padding: 12px;
    align-items: flex-end;
  }

  .dialog-content {
    height: 92vh;
    max-width: 100%;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .tabs {
    display: flex;
  }

  .panes {
    display: block;
  }

  .pane {
    display: none;
    border-right: none;
  }

  .pane.active {
    display: flex;
    height: 100%;
  }
}
</style>
