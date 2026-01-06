# StaroDrive - Cloudflare R2 网盘系统

基于 Cloudflare R2 + Pages 搭建的现代化在线网盘系统。

[汉化修改自 longern/FlareDrive](https://github.com/longern/FlareDrive)

![StaroDrive](https://img.shields.io/badge/Cloudflare-R2-F38020?style=flat-square&logo=cloudflare)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Vue](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=flat-square&logo=vue.js)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare)

---

## 目录

- [功能特性](#-功能特性)
- [界面预览](#-界面预览)
- [快速部署](#-快速部署)
- [环境变量配置](#️-环境变量配置)
  - [基础配置](#基础配置)
  - [用户与权限配置](#用户与权限配置)
  - [操作统计配置](#操作统计配置可选)
  - [CDN 回源配置](#cdn-回源配置可选)
- [使用指南](#-使用指南)
  - [分享管理](#分享管理管理员功能)
  - [API Key 管理](#api-key-管理管理员功能)
- [本地开发](#-本地开发)
- [项目结构](#-项目结构)
- [常见问题](#-常见问题)
- [更新日志](#-更新日志)
- [注意事项](#️-注意事项)
- [免责声明](#-免责声明)
- [开源协议](#-开源协议)
- [致谢](#-致谢)

---

## ✨ 功能特性

### 核心功能
| 功能 | 说明 |
|------|------|
| 📁 **文件管理** | 上传、下载、重命名、移动、删除 |
| 📂 **文件夹支持** | 创建文件夹、文件夹重命名、文件夹下载（打包ZIP） |
| 🔍 **高级搜索** | 支持文件名、类型、扩展名、大小多维度搜索 |
| 🖼️ **缩略图预览** | 图片和视频自动生成缩略图 |
| 👁️ **文件预览** | 支持 PDF、Excel、Word、Markdown、代码等格式在线预览 |
| 📱 **响应式设计** | 完美支持 PC 和移动端 |
| 📤 **大文件上传** | 支持最大 5GB 文件（分片上传） |

### 现代化 UI
| 功能 | 说明 |
|------|------|
| 🌓 **主题切换** | 支持亮色/暗色模式，跟随系统或手动切换 |
| 🎴 **卡片布局** | 类 Notion 风格的现代化界面 |
| 📊 **统计面板** | 存储概览、文件统计、类型分布 |
| 📈 **操作统计** | R2 A类/B类操作次数统计（需配置） |

### 批量操作
| 功能 | 说明 |
|------|------|
| ☑️ **多选模式** | 批量选择文件和文件夹 |
| 📦 **批量下载** | 多文件打包 ZIP 下载 |
| 🗑️ **批量删除** | 一键删除多个文件 |
| 📁 **批量移动** | 批量移动到指定目录 |

### 文件分享
| 功能 | 说明 |
|------|------|
| 🔗 **分享链接** | 生成文件分享链接 |
| ⏰ **时效控制** | 支持 1小时/1天/7天/30天/永久/自定义 |
| 🔒 **密码保护** | 可选设置访问密码 |
| 📊 **下载限制** | 可选限制最大下载次数 |
| 💻 **wget 命令** | 自动生成 wget 下载命令 |

### 权限系统
| 功能 | 说明 |
|------|------|
| 👤 **多用户支持** | 支持多管理员账户 |
| 🔐 **目录授权** | 为不同用户分配不同目录权限 |
| 👁️ **只读用户** | 支持只能查看和下载的只读账户 |
| 👥 **访客模式** | 可配置访客可访问的目录（仅查看） |
| 🔑 **API Key** | 支持创建 API 密钥，用于程序化访问（如 PicGo 图床） |
| 🎨 **现代化登录** | 自定义登录界面，非浏览器弹窗 |
| 🛠️ **管理工具** | 管理员专属工具（清理孤立缩略图等） |

---

## 📸 界面预览

### 主界面 - 亮色主题
![主界面-亮色](docs/images/home-light.png)
### 主界面 - 暗色主题
![主界面-暗色](docs/images/home-dark.png)

### 文件上传
![文件上传](docs/images/upload.png)

### 高级搜索
![高级搜索](docs/images/search.png)

### 文件分享
![文件分享](docs/images/share.png)

### 统计面板
![统计面板](docs/images/stats.png)

### 登录界面
![登录界面](docs/images/login.png)

### 分享管理
![分享管理](docs/images/share-manage.png)

### 移动端适配
![移动端](docs/images/mobile.png)

---

## 🚀 快速部署

### 前置要求

- Cloudflare 账户（免费即可）
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

> 💡 **建议**：同时设置 **对象生命周期规则**，添加"中止未完成的分段上传（1天）"，避免上传中断产生的垃圾数据。

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
| `GUEST` | `public/` | 访客可访问目录（留空则禁止） |
| `admin:你的密码` | `*` | 管理员账户，`*` 表示所有目录权限 |

7. 点击 **保存并部署**

#### 第四步：绑定 R2 存储桶

1. 部署完成后，进入 Pages 项目
2. **设置** → **函数** → **R2 存储桶绑定**
3. 点击 **添加绑定**
4. 变量名称填写：`BUCKET`
5. R2 存储桶选择你创建的存储桶
6. 点击保存

#### 第五步：绑定 KV 命名空间（分享功能需要）

1. 进入 Cloudflare 控制台 → **Workers 和 Pages** → **KV**
2. 点击 **创建命名空间**，名称填写 `ossShares`
3. 回到 Pages 项目 → **设置** → **函数** → **KV 命名空间绑定**
4. 点击 **添加绑定**
5. 变量名称填写：`ossShares`
6. KV 命名空间选择刚创建的 `ossShares`
7. 点击保存

#### 第六步：重新部署

1. 进入 **部署** 页面
2. 找到最新的部署，点击右侧 **...** → **重试部署**
3. 等待部署完成，访问你的域名即可使用

---

## ⚙️ 环境变量配置

### 配置概览

| 变量名 | 必需 | 说明 | 示例 |
|--------|:----:|------|------|
| `PUBURL` | ✅ | R2 公共存储桶 URL | `https://pub-xxx.r2.dev` |
| `BUCKET` | ✅ | R2 存储桶绑定（在函数设置中配置） | - |
| `ossShares` | ❌ | KV 命名空间绑定（分享功能需要） | - |
| `FILE_BASE_URL` | ❌ | 前端文件访问 URL（CDN 回源场景） | `https://cdn.example.com` |
| `GUEST` | ❌ | 访客可访问目录 | `public/` |
| `GUEST_UPLOAD_PASSWORD` | ❌ | 访客上传密码 | `your_password` |
| `CF_ACCOUNT_ID` | ❌ | Cloudflare 账户 ID（操作统计需要） | `abc123...` |
| `CF_API_TOKEN` | ❌ | API Token（操作统计需要） | `xxx...` |
| `R2_BUCKET_NAME` | ❌ | 指定统计的存储桶名称 | `my-drive` |

### 基础配置

#### PUBURL（必需）

R2 公共存储桶的访问 URL，用于服务端获取文件。

```
PUBURL = https://pub-xxx.r2.dev
```

获取方式：进入 R2 存储桶 → 设置 → 公开访问 → 复制公共存储桶 URL

#### FILE_BASE_URL（可选）

前端文件访问的基础 URL。用于 CDN 回源场景，如果不配置则使用 Pages Function 代理。

```
FILE_BASE_URL = https://cdn.example.com
```

### 用户与权限配置

#### 用户账户配置

用户以 `用户名:密码` 格式作为**变量名**，权限配置作为**值**。

| 变量名（用户名:密码） | 值（权限） | 说明 |
|---------------------|-----------|------|
| `admin:123456` | `*` | 管理员，拥有所有权限 |
| `user1:password1` | `photos/, documents/` | 普通用户，可读写指定目录 |
| `viewer:password2` | `readonly, public/` | 只读用户，只能查看和下载 |

#### 权限值说明

| 权限值 | 说明 |
|--------|------|
| `*` | 管理员，拥有所有目录的读写权限 |
| `path1/, path2/` | 普通用户，可读写指定目录（多个用逗号分隔） |
| `readonly, path/` | 只读用户，只能查看和下载指定目录 |

#### 访客配置

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GUEST` | `public/, shared/` | 访客可访问的目录（仅查看和下载） |
| `GUEST_UPLOAD_PASSWORD` | `your_password` | 访客上传密码（可选） |

> ⚠️ **注意事项**：
> - 目录路径**不要**以 `/` 开头
> - 目录路径**建议**以 `/` 结尾
> - 访客默认只能查看和下载，不能上传
> - 配置 `GUEST_UPLOAD_PASSWORD` 后，访客输入正确密码可上传文件
> - 访客看不到统计面板

#### 配置示例

```bash
# 管理员账户
admin:MySecurePassword123 = *

# 普通用户 - 可以读写 photos 和 documents 目录
alice:alice123 = photos/, documents/

# 只读用户 - 只能查看 public 目录
bob:bob456 = readonly, public/

# 访客可访问的目录
GUEST = public/, shared/

# 访客上传密码（可选）
GUEST_UPLOAD_PASSWORD = guest_upload_2024
```

### 操作统计配置（可选）

如需启用 R2 操作统计（A类/B类操作次数），需添加以下变量：

| 变量名 | 必需 | 说明 |
|--------|:----:|------|
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

> 📊 统计周期为最近 30 天，数据缓存 30 分钟。

### CDN 回源配置（可选）

如果你想通过第三方 CDN（如 EdgeOne、又拍云等）回源访问文件，可以配置 `FILE_BASE_URL`。

#### 架构示意

```
用户浏览器
    ↓ 访问
CDN (例如 EdgeOne)
    ↓ 回源
R2 公共存储桶
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

### 高级搜索

支持两种搜索方式：

#### 方式一：可视化搜索面板
点击搜索框右侧的 **筛选图标** 打开高级搜索面板，可以：
- 选择文件类型（图片、视频、文档、压缩包、程序等）
- 输入扩展名筛选（如 `.pdf`、`.jar`）
- 设置文件大小范围

#### 方式二：搜索语法
直接在搜索框输入查询语法：

| 语法 | 说明 | 示例 |
|------|------|------|
| `type:类型` | 按文件类型筛选 | `type:图片`、`type:视频`、`type:压缩` |
| `ext:扩展名` 或 `.扩展名` | 按扩展名筛选 | `ext:pdf`、`.jar`、`ext:mp4,mkv` |
| `size>大小` | 大于指定大小 | `size>100MB`、`size>=1GB` |
| `size<大小` | 小于指定大小 | `size<50KB`、`size<=10MB` |
| `size:范围` | 大小范围 | `size:100MB-1GB`、`size:10KB..500KB` |
| `关键词` | 文件名包含 | `backup`、`2024` |

**支持的文件类型：**
| 类型 | 关键词 |
|------|--------|
| 图片 | `image`、`图片`、`img` |
| 视频 | `video`、`视频`、`vid` |
| 文档 | `document`、`文档`、`doc`、`text` |
| 压缩包 | `archive`、`压缩`、`zip` |
| 程序 | `executable`、`程序`、`exe` |
| 其他 | `other`、`其他` |

**支持的大小单位：** `B`、`KB`、`MB`、`GB`、`TB`（不区分大小写）

**组合查询示例：**
```bash
# 查找所有大于 100MB 的压缩包
type:压缩 size>100MB

# 查找所有 JAR 文件
.jar

# 查找文件名包含 backup 的 PDF 文件
backup ext:pdf

# 查找 10MB 到 500MB 之间的视频
type:视频 size:10MB-500MB
```

### 文件预览

点击文件即可打开预览窗口，支持以下格式：

| 类型 | 支持格式 | 说明 |
|------|---------|------|
| 图片 | jpg, png, gif, webp, svg, bmp, ico, avif | 支持缩放 |
| 视频 | mp4, webm, ogg, mov, avi, mkv | 原生播放器 |
| 音频 | mp3, wav, ogg, flac, m4a, aac | 原生播放器 |
| PDF | pdf | 支持翻页、缩放 |
| Excel | xlsx, xls, csv | 支持多工作表切换 |
| Word | docx | 转换为 HTML 预览 |
| Markdown | md, markdown | 支持语法高亮 |
| 代码 | js, ts, py, java, go, rust 等 50+ 种 | 语法高亮 + 行号 |

#### 预览快捷键
| 快捷键 | 功能 |
|--------|------|
| `Esc` | 关闭预览 / 退出全屏 |
| `←` `→` | PDF 翻页 |
| `Ctrl` + `+` | 放大 |
| `Ctrl` + `-` | 缩小 |
| `Ctrl` + 滚轮 | 缩放 |

### 文件分享

#### 创建分享
1. 右键点击文件 → 选择 **分享**
2. 设置分享选项：
   - **有效期**：1小时/1天/7天/30天/永久/自定义分钟
   - **密码保护**：可选，设置访问密码
   - **下载限制**：可选，限制最大下载次数
3. 点击 **创建分享链接**
4. 复制分享链接或 wget 命令

#### 分享链接格式
| 类型 | 格式 |
|------|------|
| 网页访问 | `https://your-domain.com/s/{shareId}` |
| 直接下载 | `https://your-domain.com/s/{shareId}/download` |
| 带密码下载 | `https://your-domain.com/s/{shareId}/download?pwd=密码` |

#### wget 下载示例
```bash
# 无密码
wget --content-disposition "https://your-domain.com/s/abc123/download"

# 有密码
wget --content-disposition "https://your-domain.com/s/abc123/download?pwd=mypassword"
```

### 分享管理（管理员功能）

管理员可以查看和管理所有用户创建的分享链接。

#### 打开分享管理
1. 以管理员身份登录
2. 点击顶部导航栏的用户头像
3. 在下拉菜单中点击 **分享管理**

#### 分享列表信息
| 字段 | 说明 |
|------|------|
| 文件名 | 分享的文件名称 |
| 文件大小 | 文件大小 |
| 密码状态 | 是否设置了访问密码 |
| 创建时间 | 分享创建的时间 |
| 过期状态 | 显示剩余时间或已过期 |
| 下载次数 | 已下载次数 / 最大下载次数 |
| 创建者 | 创建分享的用户 |

#### 管理操作
- **复制链接**：快速复制分享链接
- **删除分享**：删除该分享（文件本身不会被删除）

#### 过期状态说明
| 状态 | 颜色 | 说明 |
|------|------|------|
| 永久 | 绿色 | 永久有效的分享 |
| X天/小时后 | 灰色/黄色 | 即将过期 |
| 已过期 | 红色 | 分享已失效 |

### 管理工具（管理员功能）

管理员可以使用管理工具进行系统维护。

#### 打开管理工具
1. 以管理员身份登录
2. 点击顶部导航栏的用户头像
3. 在下拉菜单中点击 **管理工具**

#### 清理孤立缩略图

当文件被删除或修改后，其对应的缩略图可能不再被引用，成为"孤立缩略图"。此工具可以扫描并清理这些无用的缩略图，释放存储空间。

**使用步骤：**
1. 打开管理工具后会自动开始扫描
2. 查看扫描结果：
   - 已扫描文件数
   - 使用中缩略图数
   - 总缩略图数
   - 孤立缩略图数
3. 如有孤立缩略图，点击 **清理** 按钮删除
4. 清理完成后显示释放的空间大小

> 💡 **提示**：缩略图使用内容哈希命名，相同内容的图片共享同一个缩略图，因此清理是安全的。

### API Key 管理（管理员功能）

API Key 允许第三方应用程序（如 PicGo 图床、备份脚本等）通过 API 访问你的网盘，无需使用用户名密码。

#### 打开 API Key 管理
1. 以管理员身份登录
2. 点击顶部导航栏的用户头像
3. 在下拉菜单中点击 **API Key**

#### 创建 API Key
1. 点击 **新建密钥** 按钮
2. 填写密钥信息：
   - **名称**：用于识别密钥用途（如"PicGo图床"、"备份脚本"）
   - **权限**：选择"全部目录"或指定目录（多个目录用逗号分隔）
   - **只读**：勾选后该密钥只能下载，不能上传/删除
   - **有效期**：永久 / 7天 / 30天 / 90天 / 1年
3. 点击 **创建**
4. **立即复制**生成的密钥（关闭后无法再次查看！）

#### API Key 使用方式

支持两种认证方式：

**方式一：Bearer Token（推荐）**
```bash
curl -X PUT "https://your-domain.com/api/write/items/images/photo.jpg" \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

**方式二：X-API-Key 头**
```bash
curl -X PUT "https://your-domain.com/api/write/items/images/photo.jpg" \
  -H "X-API-Key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: image/jpeg" \
  --data-binary @photo.jpg
```

#### PicGo 图床配置示例

在 PicGo 中使用"自定义 Web 图床"插件：

| 配置项 | 值 |
|-------|-----|
| API 地址 | `https://your-domain.com/api/write/items/` |
| POST 参数名 | `file` |
| JSON 路径 | `key` |
| 自定义请求头 | `{"Authorization": "Bearer sk-xxx"}` |
| 自定义Body | `{}` |
| 自定义URL前缀 | `https://your-domain.com/raw/` |

#### 管理 API Key
- **启用/禁用**：临时禁用密钥而不删除
- **编辑**：修改权限和只读设置
- **删除**：永久删除密钥

#### 密钥状态说明
| 状态 | 说明 |
|------|------|
| 正常 | 密钥可正常使用 |
| 已禁用 | 密钥被管理员禁用 |
| 已过期 | 密钥已超过有效期 |
| 只读 | 密钥只能下载，不能上传/删除 |

---

## 🔧 本地开发

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

### 开发步骤

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

### 构建部署

```bash
# 构建
pnpm build

# 部署到 Cloudflare Pages
pnpm deploy
```

---

## 📁 项目结构

```
Cloudflare-R2-oss/
├── assets/                 # 前端资源
│   ├── App.vue            # 主应用组件
│   ├── Header.vue         # 顶部导航栏（含用户菜单、搜索）
│   ├── AdvancedSearchPanel.vue # 高级搜索面板
│   ├── StatsCards.vue     # 统计卡片
│   ├── Breadcrumb.vue     # 面包屑导航
│   ├── Toolbar.vue        # 工具栏
│   ├── FileCard.vue       # 文件卡片
│   ├── BatchBar.vue       # 批量操作栏
│   ├── Dialog.vue         # 对话框基础组件
│   ├── LoginDialog.vue    # 登录对话框
│   ├── ShareDialog.vue    # 分享对话框
│   ├── ShareListDialog.vue # 分享列表对话框
│   ├── AdminTools.vue     # 管理工具对话框
│   ├── ApiKeyDialog.vue   # API Key 管理对话框
│   ├── FilePreview.vue    # 文件预览组件
│   ├── InputDialog.vue    # 输入对话框
│   ├── ConfirmDialog.vue  # 确认对话框
│   ├── Toast.vue          # 消息提示组件
│   ├── Menu.vue           # 菜单组件
│   ├── UploadPopup.vue    # 上传弹窗
│   ├── MimeIcon.vue       # 文件图标
│   ├── search.mjs         # 搜索解析引擎
│   ├── main.css           # 全局样式
│   ├── main.mjs           # 工具函数（上传、缩略图等）
│   ├── favicon.svg        # 网站图标
│   └── manifest.json      # PWA 配置
├── functions/              # Cloudflare Pages Functions
│   ├── api/
│   │   ├── auth.ts        # 认证 API
│   │   ├── config.ts      # 配置 API
│   │   ├── stats.ts       # 统计 API
│   │   ├── cleanup-thumbnails.ts # 缩略图清理 API
│   │   ├── apikeys/       # API Key 管理 API
│   │   ├── children/      # 文件列表 API
│   │   ├── share/         # 分享管理 API
│   │   └── write/         # 文件操作 API
│   ├── raw/               # 文件代理
│   └── s/                 # 分享页面
│       └── [id].ts        # 分享详情页
├── utils/                  # 工具函数
│   ├── auth.ts            # 权限验证
│   ├── apikey.ts          # API Key 工具函数
│   └── share.ts           # 分享工具
├── docs/                   # 文档资源
│   └── images/            # 截图图片
├── index.html             # 入口页面
├── wrangler.toml          # Wrangler 配置
├── package.json           # 项目配置
└── README.md              # 说明文档
```

---

## ❓ 常见问题

### 部署相关

<details>
<summary><b>Q: 上传失败怎么办？</b></summary>

检查以下几点：
1. 是否已正确绑定 R2 存储桶，变量名必须是 `BUCKET`
2. R2 存储桶是否已开启公开访问
3. `PUBURL` 环境变量是否配置正确

</details>

<details>
<summary><b>Q: 为什么看不到操作统计？</b></summary>

操作统计需要配置以下环境变量：
- `CF_ACCOUNT_ID`：Cloudflare 账户 ID
- `CF_API_TOKEN`：API Token（需 Analytics 读取权限）

请参考 [操作统计配置](#操作统计配置可选) 章节。

</details>

<details>
<summary><b>Q: 如何自定义域名？</b></summary>

在 Pages 项目设置中添加自定义域名，Cloudflare 会自动配置 SSL。

</details>

<details>
<summary><b>Q: 忘记密码怎么办？</b></summary>

在 Pages 环境变量中查看、修改对应用户的密码，修改后重新部署即可。

</details>

### 文件操作相关

<details>
<summary><b>Q: 支持多大的文件？</b></summary>

单文件支持最大 **5GB**（使用分片上传）。

> ⚠️ 大文件上传建议使用稳定的网络环境，避免上传中断。

</details>

<details>
<summary><b>Q: R2 控制台显示"正在进行的多部分上传"无法删除怎么办？</b></summary>

这些是**未完成的分段上传**（Multipart Uploads），通常是因为大文件上传中断或失败导致的。它们不是真正的文件对象，所以无法通过常规方式删除。

**解决方法：设置生命周期规则（推荐）**

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)
2. 进入 **R2 对象存储** → 选择你的存储桶
3. 点击 **设置（Settings）** 标签
4. 找到 **对象生命周期规则（Object lifecycle rules）**
5. 添加规则：**中止未完成的分段上传**，设置为 1 天后自动删除
6. 保存后等待规则生效，那些未完成的上传会被自动清理

</details>

<details>
<summary><b>Q: 重命名文件夹后，原文件夹没有被删除？</b></summary>

这通常是因为原文件夹中存在**未完成的多部分上传**。

**原因说明：**
- 重命名文件夹时，系统会复制所有文件到新路径，然后删除原文件
- R2 的 `list` 操作只返回**已完成的对象**，不会返回"正在进行的多部分上传"
- 所以那些未完成的上传不会被迁移，残留在原路径下
- 因为有这些残留的"对象"，R2 会继续显示原文件夹

**解决方法：** 参考上一个问题，设置生命周期规则清理未完成的分段上传，清理后原文件夹会自动消失。

</details>

<details>
<summary><b>Q: 为什么重命名文件夹这么慢？能不能直接改名？</b></summary>

这是对象存储（S3/R2）的**固有限制**，无法绕过。

**技术原因：**
- R2（以及 AWS S3）中没有真正的"文件夹"概念
- 文件夹只是通过对象 key 的**前缀**来模拟的
- 例如 `docs/file.pdf` 就是一个完整的 key，不是"docs 文件夹里的 file.pdf"
- 要把它变成 `文档/file.pdf`，必须创建新对象、删除旧对象

**R2/S3 API 限制：**
- ❌ 不支持重命名操作（rename）
- ❌ 不支持移动操作（move）
- ✅ 只能通过复制（copy）+ 删除（delete）实现

即使是 AWS S3 官方控制台，重命名文件夹也是同样的实现方式。Cloudflare R2 控制台目前甚至不提供文件夹重命名功能。

**建议：** 如果经常需要重命名文件夹，建议在创建时就想好名字，避免后续大量文件的复制操作。对于包含大量文件的文件夹，重命名的成本较高（耗时 + R2 操作次数计费）。

</details>

---

## 📋 更新日志

查看完整的更新历史和版本变更，请参阅 [CHANGELOG.md](CHANGELOG.md)。

### 最近更新

- **API Key 管理**：支持创建 API 密钥用于程序化访问，可配置权限和有效期
- **文件预览**：支持 PDF、Excel、Word、Markdown、代码等格式在线预览
- **管理工具**：新增孤立缩略图清理功能
- **Bug 修复**：修复缩略图 Content-Type、CORS 跨域、权限验证等问题

---

## ⚠️ 注意事项

### 安全建议

1. **密码安全**
   - 请使用强密码，避免使用简单密码如 `123456`
   - 定期更换密码
   - 不同用户使用不同密码

2. **权限配置**
   - 遵循最小权限原则，只给用户必要的目录权限
   - 敏感文件不要放在访客可访问的目录
   - 定期检查用户权限配置

3. **分享链接**
   - 敏感文件分享时建议设置密码和有效期
   - 定期清理过期的分享链接
   - 注意下载次数限制

### 费用说明

| 项目 | 免费额度 | 超出费用 |
|------|---------|---------|
| R2 存储 | 10 GB/月 | $0.015/GB/月 |
| R2 A类操作 | 100万次/月 | $4.50/百万次 |
| R2 B类操作 | 1000万次/月 | $0.36/百万次 |
| Pages 请求 | 无限制 | 免费 |
| KV 存储 | 1 GB | $0.50/GB/月 |

> 💡 对于个人使用，免费额度通常足够。大量文件操作（如批量重命名、移动）会消耗较多 A 类操作次数。

### 已知限制

- 单文件最大支持 5GB
- 文件夹重命名/移动需要复制所有文件（对象存储限制）
- 暂不支持文件夹上传（浏览器限制）
- 搜索仅支持当前目录，不支持全局搜索

---

## 📜 免责声明

1. **使用风险**
   - 本项目仅供学习和个人使用，请勿用于非法用途
   - 使用本项目产生的任何后果由用户自行承担
   - 请遵守当地法律法规和 Cloudflare 服务条款

2. **数据安全**
   - 请定期备份重要数据
   - 本项目不对数据丢失负责
   - 建议为 R2 存储桶开启版本控制（如需要）

3. **服务可用性**
   - 本项目依赖 Cloudflare 服务，可用性受 Cloudflare 影响
   - 不保证 100% 可用性
   - Cloudflare 服务变更可能影响本项目功能

4. **隐私声明**
   - 本项目不收集任何用户数据
   - 所有数据存储在用户自己的 Cloudflare R2 存储桶中
   - 分享链接的访问记录存储在用户自己的 KV 命名空间中

5. **开源声明**
   - 本项目基于 [longern/FlareDrive](https://github.com/longern/FlareDrive) 修改
   - 遵循 MIT 开源协议
   - 欢迎贡献代码和提交 Issue

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

```
MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 致谢

- [longern/FlareDrive](https://github.com/longern/FlareDrive) - 原项目
- [Cloudflare](https://cloudflare.com) - 提供免费的 R2 存储和 Pages 托管
- [Vue.js](https://vuejs.org) - 前端框架
- [JSZip](https://stuk.github.io/jszip/) - ZIP 打包库

---

<p align="center">
  如果这个项目对你有帮助，欢迎 Star ⭐
</p>
