# FlareDrive - Cloudflare R2 网盘系统

基于 Cloudflare R2 + Pages 搭建的现代化在线网盘系统。

[汉化修改自 longern/FlareDrive](https://github.com/longern/FlareDrive)

![FlareDrive](https://img.shields.io/badge/Cloudflare-R2-F38020?style=flat-square&logo=cloudflare)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

---

## ✨ 功能特性

### 核心功能
- 📁 **文件管理** - 上传、下载、重命名、移动、删除
- 📂 **文件夹支持** - 创建文件夹、文件夹下载（打包ZIP）
- 🔍 **文件搜索** - 快速搜索当前目录文件
- 🖼️ **缩略图预览** - 图片和视频自动生成缩略图
- 📱 **响应式设计** - 完美支持 PC 和移动端

### 现代化 UI
- 🌓 **主题切换** - 支持亮色/暗色模式，跟随系统或手动切换
- 🎴 **卡片布局** - 类 Notion 风格的现代化界面
- 📊 **统计面板** - 存储概览、文件统计、类型分布
- 📈 **操作统计** - R2 A类/B类操作次数统计（需配置）

### 批量操作
- ☑️ **多选模式** - 批量选择文件和文件夹
- 📦 **批量下载** - 多文件打包 ZIP 下载
- 🗑️ **批量删除** - 一键删除多个文件
- 📁 **批量移动** - 批量移动到指定目录

### 权限系统
- 👤 **多用户支持** - 支持多管理员账户
- 🔐 **目录授权** - 为不同用户分配不同目录权限
- 👥 **访客模式** - 可配置访客可写目录
- 🎨 **现代化登录** - 自定义登录界面，非浏览器弹窗
- 🔑 **权限面板** - 可视化查看当前用户权限

---

## 🚀 快速部署

### 前置要求

- Cloudflare 账户
- GitHub 账户

### 部署步骤

#### 第一步：Fork 仓库

点击本仓库右上角的 **Fork** 按钮，将仓库复制到你的 GitHub 账户。

#### 第二步：创建 R2 存储桶

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 左侧菜单选择 **R2 对象存储**
3. 点击 **创建存储桶**
4. 输入存储桶名称（如 `my-drive`），选择地区，点击创建
5. 进入存储桶 → **设置** → **公开访问**
6. 点击 **允许访问**，复制 **公共存储桶 URL**（格式如：`https://pub-xxx.r2.dev`）

#### 第三步：创建 Pages 项目

1. 进入 Cloudflare 控制台 → **Workers 和 Pages**
2. 点击 **创建** → **Pages** → **连接到 Git**
3. 选择你 Fork 的仓库
4. 项目名称可自定义（如 `my-drive`）
5. **框架预设** 保持默认（无）
6. 展开 **环境变量（高级）**，添加以下变量：

| 变量名称 | 值 | 说明 |
|---------|-----|------|
| `PUBURL` | `https://pub-xxx.r2.dev` | 你的公共存储桶 URL |
| `GUEST` | `public/` | 访客可写目录（留空则禁止） |
| `admin:你的密码` | `*` | 管理员账户，`*` 表示所有目录权限 |

7. 点击 **保存并部署**

#### 第四步：绑定 R2 存储桶

1. 部署完成后，进入 Pages 项目
2. **设置** → **函数** → **R2 存储桶绑定**
3. 点击 **添加绑定**
4. 变量名称填写：`BUCKET`
5. R2 存储桶选择你创建的存储桶
6. 点击保存

#### 第五步：重新部署

1. 进入 **部署** 页面
2. 找到最新的部署，点击右侧 **...** → **重试部署**
3. 等待部署完成，访问你的域名即可使用

---

## ⚙️ 环境变量配置

### 基础配置

| 变量名 | 必需 | 示例值 | 说明 |
|--------|------|--------|------|
| `PUBURL` | ✅ | `https://pub-xxx.r2.dev` | R2 公共存储桶 URL（服务端获取文件用） |
| `FILE_BASE_URL` | ❌ | `https://cdn.example.com` | 前端文件访问 URL（CDN 回源场景使用） |
| `GUEST` | ❌ | `public/` | 访客可写目录，多个用逗号分隔 |

### 用户配置

用户以 `用户名:密码` 格式作为变量名，值为允许写入的目录列表。

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `admin:123456` | `*` | 管理员，`*` 表示所有目录权限 |
| `user1:password1` | `user1/,shared/` | 普通用户，只能写入指定目录 |
| `user2:password2` | `user2/` | 普通用户，只能写入 user2 目录 |

> ⚠️ **注意**：目录值前后不要加逗号，否则会授予所有目录权限！

### 操作统计配置（可选）

如需启用 R2 操作统计（A类/B类操作次数），需添加以下变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `CF_ACCOUNT_ID` | ✅ | Cloudflare 账户 ID |
| `CF_API_TOKEN` | ✅ | API Token（需 Analytics 读取权限） |
| `R2_BUCKET_NAME` | ❌ | 指定统计的存储桶名称（不填则统计所有） |

#### 获取账户 ID

1. 登录 Cloudflare 控制台
2. 右侧边栏可以看到 **账户 ID**
3. 复制该 ID

#### 创建 API Token

1. 进入 [API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **创建令牌**
3. 选择 **创建自定义令牌**
4. 配置权限：
   - **账户** → **Account Analytics** → **读取**
5. 账户资源选择你的账户
6. 点击 **继续以显示摘要** → **创建令牌**
7. 复制生成的 Token

#### 操作类型说明

| 类型 | 包含操作 | 计费 |
|------|---------|------|
| **A类操作** | PUT、POST、DELETE、ListObjects、上传、复制等 | 较高 |
| **B类操作** | GET、HEAD、下载、查询等 | 较低 |

统计周期为最近 30 天，数据缓存 30 分钟。

### CDN 回源配置（可选）

如果你想通过第三方 CDN（如 Edge One、又拍云等）回源访问文件，可以配置 `FILE_BASE_URL`。

#### 使用场景

```
用户浏览器
    ↓ 访问
CDN (例如 Edge One)
    ↓ 回源
Cloudflare Pages (本项目)
    ↓ API 请求
R2 存储桶
```

#### 配置步骤

1. **配置 CDN 回源到 R2**
   - 在 CDN 控制台创建站点（如 `cdn.example.com`）
   - 配置回源地址为 R2 公共 URL（如 `https://pub-xxx.r2.dev`）

2. **设置环境变量**
   ```
   FILE_BASE_URL = https://cdn.example.com
   ```

3. **工作原理**
   - 前端请求文件时会使用 `FILE_BASE_URL`（如 `https://cdn.example.com/file.jpg`）
   - 用户浏览器直接请求 CDN
   - CDN 回源到 R2 获取文件

#### 不配置时的默认行为

如果不配置 `FILE_BASE_URL`：
- 前端使用 `/raw/file.jpg` 相对路径
- 请求通过 Cloudflare Pages Function 代理到 R2

---

## 📖 使用指南

### 基本操作

#### 上传文件
- 点击右下角 **上传按钮**
- 或直接 **拖拽文件** 到页面任意位置

#### 创建文件夹
- 点击上传按钮 → 选择 **新建文件夹**
- 或点击工具栏的文件夹图标

#### 文件操作
- **单击文件**：预览/下载
- **右键/长按**：打开操作菜单（重命名、下载、复制、移动、删除）

### 批量操作

1. 点击工具栏的 **选择图标** 进入选择模式
2. 点击文件卡片左上角的复选框选择文件
3. 底部浮动栏显示已选数量和操作按钮
4. 可进行批量下载、移动、删除

### 登录与权限

#### 登录
1. 点击顶部导航栏右侧的 **登录按钮**
2. 在弹出的登录对话框中输入用户名和密码
3. 登录成功后会显示用户头像和用户名

#### 查看权限
- 登录后点击用户头像，展开下拉菜单
- 可以看到当前用户的角色（管理员/普通用户）
- 显示可写入的目录列表
- 管理员拥有所有目录权限

#### 退出登录
- 点击用户头像 → 点击 **退出登录**
- 退出后将以访客身份浏览

### 主题切换

点击顶部导航栏右侧的 **太阳/月亮图标** 切换亮色/暗色主题。

### 视图切换

工具栏提供两种视图：
- **网格视图**：卡片式布局，适合浏览图片
- **列表视图**：紧凑列表，适合查看详细信息

---

## 🔧 本地开发

```bash
# 克隆仓库
git clone https://github.com/你的用户名/Cloudflare-R2-oss.git
cd Cloudflare-R2-oss

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

开发服务器启动后访问 `http://localhost:8788`

---

## 📁 项目结构

```
Cloudflare-R2-oss/
├── assets/                 # 前端资源
│   ├── App.vue            # 主应用组件
│   ├── Header.vue         # 顶部导航栏（含用户菜单）
│   ├── StatsCards.vue     # 统计卡片
│   ├── Breadcrumb.vue     # 面包屑导航
│   ├── Toolbar.vue        # 工具栏
│   ├── FileCard.vue       # 文件卡片
│   ├── BatchBar.vue       # 批量操作栏
│   ├── Dialog.vue         # 对话框组件
│   ├── LoginDialog.vue    # 登录对话框
│   ├── Menu.vue           # 菜单组件
│   ├── UploadPopup.vue    # 上传弹窗
│   ├── MimeIcon.vue       # 文件图标
│   ├── main.css           # 全局样式
│   ├── main.mjs           # 工具函数
│   ├── favicon.svg        # 网站图标
│   └── manifest.json      # PWA 配置
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       ├── auth.ts        # 认证 API
│       ├── stats.ts       # 统计 API
│       ├── children/      # 文件列表 API
│       └── write/         # 文件操作 API
├── utils/                  # 工具函数
│   └── auth.ts            # 权限验证
├── index.html             # 入口页面
└── README.md              # 说明文档
```

---

## ❓ 常见问题

### Q: 上传失败怎么办？
A: 检查是否已正确绑定 R2 存储桶，变量名必须是 `BUCKET`。

### Q: 为什么看不到操作统计？
A: 操作统计需要配置 `CF_ACCOUNT_ID` 和 `CF_API_TOKEN` 环境变量。

### Q: 支持多大的文件？
A: 单文件支持最大 5GB（使用分片上传）。

### Q: 如何自定义域名？
A: 在 Pages 项目设置中添加自定义域名，Cloudflare 会自动配置 SSL。

### Q: 忘记密码怎么办？
A: 在 Pages 环境变量中修改对应用户的密码，重新部署即可。

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

---

## 🙏 致谢

- [longern/FlareDrive](https://github.com/longern/FlareDrive) - 原项目
- [Cloudflare](https://cloudflare.com) - 提供免费的 R2 存储和 Pages 托管
- [Vue.js](https://vuejs.org) - 前端框架
- [JSZip](https://stuk.github.io/jszip/) - ZIP 打包库
