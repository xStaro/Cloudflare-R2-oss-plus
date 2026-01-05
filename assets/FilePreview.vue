<template>
  <Teleport to="body">
    <Transition name="preview-fade">
      <div v-if="modelValue" class="file-preview-overlay" @click.self="close">
        <div class="file-preview-container" :class="{ fullscreen: isFullscreen }">
          <!-- Header -->
          <div class="preview-header">
            <div class="preview-title">
              <span class="preview-icon" :class="fileType">
                <svg v-if="fileType === 'pdf'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M10 12h4"/><path d="M10 16h4"/>
                </svg>
                <svg v-else-if="fileType === 'markdown'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
                <svg v-else-if="fileType === 'excel'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>
                </svg>
                <svg v-else-if="fileType === 'word'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                  <path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/>
                </svg>
                <svg v-else-if="fileType === 'image'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <svg v-else-if="fileType === 'video'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
                <svg v-else-if="fileType === 'audio'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
                <svg v-else-if="fileType === 'code'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <path d="M14 2v6h6"/>
                </svg>
              </span>
              <span class="preview-filename" :title="fileName">{{ fileName }}</span>
            </div>
            <div class="preview-actions">
              <!-- Zoom Controls (for images and PDF) -->
              <template v-if="fileType === 'image' || fileType === 'pdf'">
                <button class="preview-btn" @click="zoomOut" title="缩小">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6"/>
                  </svg>
                </button>
                <span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
                <button class="preview-btn" @click="zoomIn" title="放大">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>
                  </svg>
                </button>
                <div class="preview-divider"></div>
              </template>
              <!-- PDF Page Navigation -->
              <template v-if="fileType === 'pdf' && pdfTotalPages > 0">
                <button class="preview-btn" @click="prevPage" :disabled="pdfCurrentPage <= 1" title="上一页">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
                <span class="page-info">{{ pdfCurrentPage }} / {{ pdfTotalPages }}</span>
                <button class="preview-btn" @click="nextPage" :disabled="pdfCurrentPage >= pdfTotalPages" title="下一页">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
                <div class="preview-divider"></div>
              </template>
              <!-- Excel Sheet Navigation -->
              <template v-if="fileType === 'excel' && excelSheets.length > 1">
                <select class="sheet-select" v-model="currentSheetIndex" @change="renderCurrentSheet">
                  <option v-for="(sheet, index) in excelSheets" :key="index" :value="index">
                    {{ sheet }}
                  </option>
                </select>
                <div class="preview-divider"></div>
              </template>
              <!-- Download -->
              <a class="preview-btn" :href="fileUrl" download :title="'下载 ' + fileName">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </a>
              <!-- Open in new tab -->
              <a class="preview-btn" :href="fileUrl" target="_blank" title="在新标签页打开">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
              <!-- Fullscreen -->
              <button class="preview-btn" @click="toggleFullscreen" :title="isFullscreen ? '退出全屏' : '全屏'">
                <svg v-if="!isFullscreen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 3 21 3 21 9"/>
                  <polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="4 14 10 14 10 20"/>
                  <polyline points="20 10 14 10 14 4"/>
                  <line x1="14" y1="10" x2="21" y2="3"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
              <!-- Close -->
              <button class="preview-btn close-btn" @click="close" title="关闭">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Content -->
          <div class="preview-content" ref="contentRef">
            <!-- Loading State -->
            <div v-if="loading" class="preview-loading">
              <div class="loading-spinner"></div>
              <p>{{ loadingText }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="preview-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p class="error-title">预览失败</p>
              <p class="error-message">{{ error }}</p>
              <a :href="fileUrl" download class="error-download">下载文件</a>
            </div>

            <!-- Unsupported Type -->
            <div v-else-if="fileType === 'unsupported'" class="preview-unsupported">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <path d="M14 2v6h6"/>
              </svg>
              <p class="unsupported-title">无法预览此文件</p>
              <p class="unsupported-message">{{ fileName }}</p>
              <a :href="fileUrl" download class="unsupported-download">下载文件</a>
            </div>

            <!-- Image Preview -->
            <div v-else-if="fileType === 'image'" class="preview-image-container" @wheel="handleWheel">
              <img
                ref="imageRef"
                :src="fileUrl"
                :alt="fileName"
                :style="{ transform: `scale(${zoomLevel})` }"
                @load="onImageLoad"
                @error="onImageError"
                draggable="false"
              />
            </div>

            <!-- Video Preview -->
            <div v-else-if="fileType === 'video'" class="preview-video-container">
              <video
                ref="videoRef"
                :src="fileUrl"
                controls
                autoplay
                @error="onVideoError"
              >
                您的浏览器不支持视频播放
              </video>
            </div>

            <!-- Audio Preview -->
            <div v-else-if="fileType === 'audio'" class="preview-audio-container">
              <div class="audio-visual">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <audio
                ref="audioRef"
                :src="fileUrl"
                controls
                autoplay
                @error="onAudioError"
              >
                您的浏览器不支持音频播放
              </audio>
              <p class="audio-filename">{{ fileName }}</p>
            </div>

            <!-- PDF Preview -->
            <div v-else-if="fileType === 'pdf'" class="preview-pdf-container" ref="pdfContainerRef" @wheel="handleWheel">
              <canvas ref="pdfCanvasRef"></canvas>
            </div>

            <!-- Markdown Preview -->
            <div v-else-if="fileType === 'markdown'" class="preview-markdown-container">
              <div class="markdown-body" ref="markdownRef" v-html="markdownContent"></div>
            </div>

            <!-- Excel Preview -->
            <div v-else-if="fileType === 'excel'" class="preview-excel-container">
              <div class="excel-table-wrapper" ref="excelRef" v-html="excelContent"></div>
            </div>

            <!-- Word Preview -->
            <div v-else-if="fileType === 'word'" class="preview-word-container">
              <div class="word-content" ref="wordRef" v-html="wordContent"></div>
            </div>

            <!-- Code/Text Preview -->
            <div v-else-if="fileType === 'code' || fileType === 'text'" class="preview-code-container">
              <div class="code-header">
                <span class="code-language">{{ codeLanguage }}</span>
                <button class="copy-btn" @click="copyCode" :class="{ copied: codeCopied }">
                  <svg v-if="!codeCopied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {{ codeCopied ? '已复制' : '复制' }}
                </button>
              </div>
              <pre class="code-content" ref="codeRef"><code v-html="codeContent"></code></pre>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
// Library loading utilities
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const loadStyle = (href) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

// Library CDN URLs
const CDN = {
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  marked: 'https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js',
  hljs: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js',
  hljsStyle: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js',
};

// File type detection
const getFileType = (fileName, contentType = '') => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  // By content type
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType === 'application/pdf') return 'pdf';

  // By extension
  const typeMap = {
    // Images
    image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'],
    // Videos
    video: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'],
    // Audio
    audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'],
    // PDF
    pdf: ['pdf'],
    // Markdown
    markdown: ['md', 'markdown', 'mdown', 'mkd'],
    // Excel
    excel: ['xlsx', 'xls', 'csv'],
    // Word
    word: ['docx', 'doc'],
    // Code
    code: [
      'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte',
      'py', 'pyw', 'pyi',
      'java', 'kt', 'kts', 'scala',
      'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',
      'cs', 'fs', 'fsx',
      'go', 'rs', 'rb', 'php',
      'swift', 'dart', 'r',
      'sql', 'graphql', 'gql',
      'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
      'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
      'json', 'json5', 'jsonc',
      'xml', 'xsl', 'xslt', 'svg',
      'html', 'htm', 'xhtml',
      'css', 'scss', 'sass', 'less', 'styl',
      'lua', 'perl', 'pl', 'tcl', 'awk',
      'dockerfile', 'makefile', 'cmake',
      'tf', 'hcl',
      'proto', 'thrift',
      'asm', 's',
      'nim', 'zig', 'v', 'odin',
      'ex', 'exs', 'erl', 'hrl',
      'clj', 'cljs', 'cljc', 'edn',
      'ml', 'mli', 'hs', 'lhs',
    ],
    // Plain text
    text: ['txt', 'log', 'text', 'readme', 'license', 'changelog', 'gitignore', 'env'],
  };

  for (const [type, extensions] of Object.entries(typeMap)) {
    if (extensions.includes(ext)) return type;
  }

  // Check by content type for text
  if (contentType.startsWith('text/')) return 'text';

  return 'unsupported';
};

// Language detection for code highlighting
const getCodeLanguage = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const langMap = {
    'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'ts': 'typescript', 'tsx': 'tsx', 'jsx': 'jsx',
    'vue': 'vue', 'svelte': 'svelte',
    'py': 'python', 'pyw': 'python', 'pyi': 'python',
    'java': 'java', 'kt': 'kotlin', 'kts': 'kotlin', 'scala': 'scala',
    'c': 'c', 'h': 'c',
    'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp',
    'cs': 'csharp', 'fs': 'fsharp', 'fsx': 'fsharp',
    'go': 'go', 'rs': 'rust', 'rb': 'ruby', 'php': 'php',
    'swift': 'swift', 'dart': 'dart', 'r': 'r',
    'sql': 'sql', 'graphql': 'graphql', 'gql': 'graphql',
    'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'fish',
    'ps1': 'powershell', 'bat': 'batch', 'cmd': 'batch',
    'yaml': 'yaml', 'yml': 'yaml',
    'toml': 'toml', 'ini': 'ini', 'cfg': 'ini', 'conf': 'ini',
    'json': 'json', 'json5': 'json', 'jsonc': 'json',
    'xml': 'xml', 'xsl': 'xml', 'xslt': 'xml', 'svg': 'xml',
    'html': 'html', 'htm': 'html', 'xhtml': 'html',
    'css': 'css', 'scss': 'scss', 'sass': 'scss', 'less': 'less', 'styl': 'stylus',
    'lua': 'lua', 'perl': 'perl', 'pl': 'perl',
    'dockerfile': 'dockerfile', 'makefile': 'makefile', 'cmake': 'cmake',
    'tf': 'hcl', 'hcl': 'hcl',
    'md': 'markdown', 'markdown': 'markdown',
    'txt': 'plaintext', 'log': 'plaintext', 'text': 'plaintext',
  };
  return langMap[ext] || 'plaintext';
};

export default {
  name: 'FilePreview',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileName: {
      type: String,
      default: ''
    },
    contentType: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      loading: true,
      loadingText: '加载中...',
      error: null,
      isFullscreen: false,

      // Zoom
      zoomLevel: 1,
      minZoom: 0.1,
      maxZoom: 5,

      // PDF
      pdfDoc: null,
      pdfCurrentPage: 1,
      pdfTotalPages: 0,
      pdfRendering: false,

      // Markdown
      markdownContent: '',

      // Excel
      excelWorkbook: null,
      excelSheets: [],
      currentSheetIndex: 0,
      excelContent: '',

      // Word
      wordContent: '',

      // Code
      codeContent: '',
      codeLanguage: '',
      codeCopied: false,
      rawCodeContent: '',
    };
  },
  computed: {
    fileType() {
      return getFileType(this.fileName, this.contentType);
    }
  },
  watch: {
    modelValue(val) {
      if (val) {
        this.loadPreview();
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', this.handleKeydown);
      } else {
        this.reset();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', this.handleKeydown);
      }
    }
  },
  methods: {
    close() {
      this.$emit('update:modelValue', false);
    },

    reset() {
      this.loading = true;
      this.loadingText = '加载中...';
      this.error = null;
      this.zoomLevel = 1;
      this.pdfDoc = null;
      this.pdfCurrentPage = 1;
      this.pdfTotalPages = 0;
      this.markdownContent = '';
      this.excelWorkbook = null;
      this.excelSheets = [];
      this.currentSheetIndex = 0;
      this.excelContent = '';
      this.wordContent = '';
      this.codeContent = '';
      this.rawCodeContent = '';
    },

    async loadPreview() {
      this.reset();
      const type = this.fileType;

      try {
        switch (type) {
          case 'image':
            // Images load via img tag
            this.loading = false;
            break;
          case 'video':
          case 'audio':
            // Media loads via native tags
            this.loading = false;
            break;
          case 'pdf':
            await this.loadPDF();
            break;
          case 'markdown':
            await this.loadMarkdown();
            break;
          case 'excel':
            await this.loadExcel();
            break;
          case 'word':
            await this.loadWord();
            break;
          case 'code':
          case 'text':
            await this.loadCode();
            break;
          case 'unsupported':
            this.loading = false;
            break;
        }
      } catch (e) {
        console.error('Preview error:', e);
        this.error = e.message || '加载失败';
        this.loading = false;
      }
    },

    // PDF Preview
    async loadPDF() {
      this.loadingText = '加载 PDF 预览库...';
      await loadScript(CDN.pdfjs);

      // Set worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfjsWorker;

      this.loadingText = '加载 PDF 文件...';
      const loadingTask = window.pdfjsLib.getDocument(this.fileUrl);
      this.pdfDoc = await loadingTask.promise;
      this.pdfTotalPages = this.pdfDoc.numPages;
      this.pdfCurrentPage = 1;

      this.loading = false;
      await this.$nextTick();
      await this.renderPDFPage();
    },

    async renderPDFPage() {
      if (!this.pdfDoc || this.pdfRendering) return;

      this.pdfRendering = true;
      const page = await this.pdfDoc.getPage(this.pdfCurrentPage);

      const canvas = this.$refs.pdfCanvasRef;
      const container = this.$refs.pdfContainerRef;
      if (!canvas || !container) {
        this.pdfRendering = false;
        return;
      }

      const ctx = canvas.getContext('2d');

      // Calculate scale to fit container
      const containerWidth = container.clientWidth - 40;
      const viewport = page.getViewport({ scale: 1 });
      const scale = (containerWidth / viewport.width) * this.zoomLevel;
      const scaledViewport = page.getViewport({ scale });

      // Set canvas size
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      // Render
      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport
      }).promise;

      this.pdfRendering = false;
    },

    prevPage() {
      if (this.pdfCurrentPage > 1) {
        this.pdfCurrentPage--;
        this.renderPDFPage();
      }
    },

    nextPage() {
      if (this.pdfCurrentPage < this.pdfTotalPages) {
        this.pdfCurrentPage++;
        this.renderPDFPage();
      }
    },

    // Markdown Preview
    async loadMarkdown() {
      this.loadingText = '加载 Markdown 预览库...';
      await Promise.all([
        loadScript(CDN.marked),
        loadScript(CDN.hljs),
        loadStyle(CDN.hljsStyle)
      ]);

      this.loadingText = '加载文件内容...';
      const response = await fetch(this.fileUrl);
      const text = await response.text();

      // Configure marked
      window.marked.setOptions({
        highlight: (code, lang) => {
          if (lang && window.hljs.getLanguage(lang)) {
            return window.hljs.highlight(code, { language: lang }).value;
          }
          return window.hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
      });

      this.markdownContent = window.marked.parse(text);
      this.loading = false;
    },

    // Excel Preview
    async loadExcel() {
      this.loadingText = '加载 Excel 预览库...';
      await loadScript(CDN.xlsx);

      this.loadingText = '加载文件内容...';
      const response = await fetch(this.fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      this.excelWorkbook = window.XLSX.read(arrayBuffer, { type: 'array' });
      this.excelSheets = this.excelWorkbook.SheetNames;
      this.currentSheetIndex = 0;

      this.renderCurrentSheet();
      this.loading = false;
    },

    renderCurrentSheet() {
      if (!this.excelWorkbook) return;

      const sheetName = this.excelSheets[this.currentSheetIndex];
      const sheet = this.excelWorkbook.Sheets[sheetName];

      // Convert to HTML table
      this.excelContent = window.XLSX.utils.sheet_to_html(sheet, {
        editable: false
      });
    },

    // Word Preview
    async loadWord() {
      this.loadingText = '加载 Word 预览库...';
      await loadScript(CDN.mammoth);

      this.loadingText = '加载文件内容...';
      const response = await fetch(this.fileUrl);
      const arrayBuffer = await response.arrayBuffer();

      const result = await window.mammoth.convertToHtml({ arrayBuffer });
      this.wordContent = result.value;

      if (result.messages.length > 0) {
        console.warn('Mammoth warnings:', result.messages);
      }

      this.loading = false;
    },

    // Code Preview
    async loadCode() {
      this.loadingText = '加载代码高亮库...';
      await Promise.all([
        loadScript(CDN.hljs),
        loadStyle(CDN.hljsStyle)
      ]);

      this.loadingText = '加载文件内容...';
      const response = await fetch(this.fileUrl);
      const text = await response.text();

      this.rawCodeContent = text;
      this.codeLanguage = getCodeLanguage(this.fileName);

      // Highlight code
      if (window.hljs.getLanguage(this.codeLanguage)) {
        this.codeContent = window.hljs.highlight(text, { language: this.codeLanguage }).value;
      } else {
        this.codeContent = window.hljs.highlightAuto(text).value;
      }

      // Add line numbers
      const lines = this.codeContent.split('\n');
      this.codeContent = lines.map((line, i) =>
        `<span class="line-number">${i + 1}</span>${line}`
      ).join('\n');

      this.loading = false;
    },

    copyCode() {
      navigator.clipboard.writeText(this.rawCodeContent).then(() => {
        this.codeCopied = true;
        setTimeout(() => {
          this.codeCopied = false;
        }, 2000);
      });
    },

    // Zoom
    zoomIn() {
      if (this.zoomLevel < this.maxZoom) {
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, this.maxZoom);
        if (this.fileType === 'pdf') {
          this.renderPDFPage();
        }
      }
    },

    zoomOut() {
      if (this.zoomLevel > this.minZoom) {
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, this.minZoom);
        if (this.fileType === 'pdf') {
          this.renderPDFPage();
        }
      }
    },

    handleWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    },

    // Fullscreen
    toggleFullscreen() {
      this.isFullscreen = !this.isFullscreen;
    },

    // Keyboard
    handleKeydown(e) {
      if (e.key === 'Escape') {
        if (this.isFullscreen) {
          this.isFullscreen = false;
        } else {
          this.close();
        }
      } else if (e.key === 'ArrowLeft' && this.fileType === 'pdf') {
        this.prevPage();
      } else if (e.key === 'ArrowRight' && this.fileType === 'pdf') {
        this.nextPage();
      } else if ((e.key === '+' || e.key === '=') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.zoomIn();
      } else if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.zoomOut();
      }
    },

    // Media error handlers
    onImageLoad() {
      this.loading = false;
    },

    onImageError() {
      this.error = '图片加载失败';
      this.loading = false;
    },

    onVideoError() {
      this.error = '视频加载失败，可能格式不支持';
      this.loading = false;
    },

    onAudioError() {
      this.error = '音频加载失败，可能格式不支持';
      this.loading = false;
    }
  },
  beforeUnmount() {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.handleKeydown);
  }
};
</script>

<style scoped>
/* Overlay */
.file-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

/* Container */
.file-preview-container {
  width: 90vw;
  height: 90vh;
  max-width: 1400px;
  background: var(--card-bg, #fff);
  border-radius: var(--radius-lg, 12px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.file-preview-container.fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  border-radius: 0;
}

/* Header */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e5e5e5);
  flex-shrink: 0;
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.preview-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light, #fff3e6);
  border-radius: 6px;
  flex-shrink: 0;
}

.preview-icon svg {
  width: 16px;
  height: 16px;
  color: var(--primary-color, #f38020);
}

.preview-icon.pdf svg { color: #ef4444; }
.preview-icon.markdown svg { color: #3b82f6; }
.preview-icon.excel svg { color: #10b981; }
.preview-icon.word svg { color: #3b82f6; }
.preview-icon.image svg { color: #3b82f6; }
.preview-icon.video svg { color: #ef4444; }
.preview-icon.audio svg { color: #8b5cf6; }
.preview-icon.code svg { color: #f59e0b; }

.preview-filename {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.preview-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary, #666);
  transition: all 0.2s;
  text-decoration: none;
}

.preview-btn:hover {
  background: var(--hover-bg, #e5e5e5);
  color: var(--text-primary, #333);
}

.preview-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.preview-btn svg {
  width: 18px;
  height: 18px;
}

.preview-btn.close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
}

.preview-divider {
  width: 1px;
  height: 20px;
  background: var(--border-color, #e5e5e5);
  margin: 0 4px;
}

.zoom-level,
.page-info {
  font-size: 12px;
  color: var(--text-secondary, #666);
  min-width: 50px;
  text-align: center;
}

.sheet-select {
  padding: 6px 10px;
  font-size: 13px;
  border: 1px solid var(--border-color, #e5e5e5);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  max-width: 150px;
}

/* Content */
.preview-content {
  flex: 1;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary, #f5f5f5);
}

/* Loading */
.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary, #666);
}

.preview-loading .loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color, #e5e5e5);
  border-top-color: var(--primary-color, #f38020);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error */
.preview-error,
.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  text-align: center;
}

.preview-error svg,
.preview-unsupported svg {
  width: 64px;
  height: 64px;
  color: var(--text-muted, #999);
}

.error-title,
.unsupported-title {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.error-message,
.unsupported-message {
  font-size: 14px;
  color: var(--text-secondary, #666);
  max-width: 300px;
}

.error-download,
.unsupported-download {
  margin-top: 8px;
  padding: 10px 24px;
  background: var(--primary-gradient, linear-gradient(135deg, #f38020, #f5a623));
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

.error-download:hover,
.unsupported-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(243, 128, 32, 0.4);
}

/* Image Preview */
.preview-image-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.preview-image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.2s;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

/* Video Preview */
.preview-video-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #000;
}

.preview-video-container video {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
}

/* Audio Preview */
.preview-audio-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
}

.audio-visual {
  width: 160px;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-light, #fff3e6);
  border-radius: 50%;
}

.audio-visual svg {
  width: 80px;
  height: 80px;
  color: var(--primary-color, #f38020);
}

.preview-audio-container audio {
  width: 100%;
  max-width: 400px;
}

.audio-filename {
  font-size: 14px;
  color: var(--text-secondary, #666);
  text-align: center;
  max-width: 300px;
  word-break: break-all;
}

/* PDF Preview */
.preview-pdf-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #525659;
}

.preview-pdf-container canvas {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  background: white;
}

/* Markdown Preview */
.preview-markdown-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 40px;
  background: var(--card-bg, #fff);
}

.markdown-body {
  max-width: 900px;
  margin: 0 auto;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-primary, #333);
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

.markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--border-color, #e5e5e5); padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--border-color, #e5e5e5); padding-bottom: 0.3em; }
.markdown-body h3 { font-size: 1.25em; }

.markdown-body p {
  margin-bottom: 16px;
}

.markdown-body code {
  padding: 0.2em 0.4em;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 0.9em;
}

.markdown-body pre {
  padding: 16px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.markdown-body pre code {
  padding: 0;
  background: transparent;
  color: #d4d4d4;
}

.markdown-body blockquote {
  padding: 0 1em;
  border-left: 4px solid var(--primary-color, #f38020);
  color: var(--text-secondary, #666);
  margin: 0 0 16px 0;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-body li {
  margin-bottom: 4px;
}

.markdown-body table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
}

.markdown-body th,
.markdown-body td {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e5e5e5);
}

.markdown-body th {
  background: var(--bg-secondary, #f5f5f5);
  font-weight: 600;
}

.markdown-body img {
  max-width: 100%;
  border-radius: 4px;
}

.markdown-body a {
  color: var(--primary-color, #f38020);
  text-decoration: none;
}

.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body hr {
  border: none;
  border-top: 1px solid var(--border-color, #e5e5e5);
  margin: 24px 0;
}

/* Excel Preview */
.preview-excel-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 20px;
  background: var(--card-bg, #fff);
}

.excel-table-wrapper {
  min-width: max-content;
}

.excel-table-wrapper :deep(table) {
  border-collapse: collapse;
  font-size: 13px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.excel-table-wrapper :deep(th),
.excel-table-wrapper :deep(td) {
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
  text-align: left;
  white-space: nowrap;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.excel-table-wrapper :deep(th) {
  background: #f0f0f0;
  font-weight: 600;
  position: sticky;
  top: 0;
}

.excel-table-wrapper :deep(tr:nth-child(even)) {
  background: #fafafa;
}

.excel-table-wrapper :deep(tr:hover) {
  background: #f0f8ff;
}

/* Word Preview */
.preview-word-container {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 40px;
  background: var(--card-bg, #fff);
}

.word-content {
  max-width: 900px;
  margin: 0 auto;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-primary, #333);
  background: white;
  padding: 60px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  min-height: 100%;
}

.word-content :deep(p) {
  margin-bottom: 16px;
}

.word-content :deep(h1),
.word-content :deep(h2),
.word-content :deep(h3) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
}

.word-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.word-content :deep(th),
.word-content :deep(td) {
  padding: 8px 12px;
  border: 1px solid #e5e5e5;
}

.word-content :deep(img) {
  max-width: 100%;
}

/* Code Preview */
.preview-code-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
  flex-shrink: 0;
}

.code-language {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #404040;
  border: none;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: #505050;
  color: white;
}

.copy-btn.copied {
  background: #10b981;
  color: white;
}

.copy-btn svg {
  width: 14px;
  height: 14px;
}

.code-content {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 16px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  background: transparent;
  counter-reset: line;
}

.code-content :deep(.line-number) {
  display: inline-block;
  width: 50px;
  padding-right: 16px;
  text-align: right;
  color: #606060;
  user-select: none;
  border-right: 1px solid #404040;
  margin-right: 16px;
}

/* Transitions */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s ease;
}

.preview-fade-enter-active .file-preview-container,
.preview-fade-leave-active .file-preview-container {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-from .file-preview-container,
.preview-fade-leave-to .file-preview-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .file-preview-container {
    width: 100vw;
    height: 100vh;
    border-radius: 0;
  }

  .preview-header {
    padding: 10px 12px;
  }

  .preview-filename {
    font-size: 13px;
    max-width: 120px;
  }

  .preview-btn {
    width: 32px;
    height: 32px;
  }

  .preview-btn svg {
    width: 16px;
    height: 16px;
  }

  .zoom-level,
  .page-info {
    display: none;
  }

  .preview-divider {
    margin: 0 2px;
  }

  .preview-markdown-container,
  .preview-word-container {
    padding: 20px;
  }

  .word-content {
    padding: 20px;
  }

  .code-content :deep(.line-number) {
    width: 35px;
    padding-right: 10px;
    margin-right: 10px;
  }
}

/* Dark mode support */
[data-theme="dark"] .file-preview-container {
  background: #1a1a1a;
}

[data-theme="dark"] .preview-header {
  background: #2a2a2a;
  border-color: #404040;
}

[data-theme="dark"] .preview-content {
  background: #111;
}

[data-theme="dark"] .preview-icon {
  background: #333;
}

[data-theme="dark"] .preview-filename {
  color: #eee;
}

[data-theme="dark"] .preview-btn {
  color: #aaa;
}

[data-theme="dark"] .preview-btn:hover {
  background: #404040;
  color: #fff;
}

[data-theme="dark"] .sheet-select {
  background: #333;
  border-color: #555;
  color: #eee;
}

[data-theme="dark"] .preview-markdown-container,
[data-theme="dark"] .preview-excel-container,
[data-theme="dark"] .preview-word-container {
  background: #1a1a1a;
}

[data-theme="dark"] .markdown-body {
  color: #ddd;
}

[data-theme="dark"] .markdown-body code {
  background: #333;
}

[data-theme="dark"] .markdown-body h1,
[data-theme="dark"] .markdown-body h2 {
  border-color: #404040;
}

[data-theme="dark"] .markdown-body blockquote {
  color: #999;
}

[data-theme="dark"] .markdown-body th,
[data-theme="dark"] .markdown-body td {
  border-color: #404040;
}

[data-theme="dark"] .markdown-body th {
  background: #333;
}

[data-theme="dark"] .excel-table-wrapper :deep(table) {
  background: #2a2a2a;
}

[data-theme="dark"] .excel-table-wrapper :deep(th),
[data-theme="dark"] .excel-table-wrapper :deep(td) {
  border-color: #404040;
  color: #ddd;
}

[data-theme="dark"] .excel-table-wrapper :deep(th) {
  background: #333;
}

[data-theme="dark"] .excel-table-wrapper :deep(tr:nth-child(even)) {
  background: #252525;
}

[data-theme="dark"] .excel-table-wrapper :deep(tr:hover) {
  background: #2a3a4a;
}

[data-theme="dark"] .word-content {
  background: #2a2a2a;
  color: #ddd;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
}

[data-theme="dark"] .word-content :deep(th),
[data-theme="dark"] .word-content :deep(td) {
  border-color: #404040;
}
</style>
