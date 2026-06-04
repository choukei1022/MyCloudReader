# 📚 MyCloudReader (私人云端书架)

![Vue.js](https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=flat-square&logo=vue.js)
![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js)
![SQLite](https://img.shields.io/badge/SQLite-FTS5-003B57?style=flat-square&logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)

这是一款专为 NAS（如飞牛 OS、群晖、极空间等）和 Docker 环境打造的跨平台私人阅读器。

## 💡 开发初衷

我已经很多年不写代码了。最初做这个东西，纯粹是因为想在自己的 NAS 上存几万本 TXT 小说，并且能在手机和电脑上随时随地看，还要能同步阅读进度。

早期的代码是靠着 AI 一点点“搓”出来的单体大杂烩。后来为了长久维护，我花了些时间把它按照现代企业级的标准重构了一遍：**前后端完全解耦、引入 Vue 3 组合式函数 (Composables) 提取业务逻辑、使用 Docker 多阶段构建缩减体积**。

现在的代码比较干净，自己用得很舒服，开源出来给大家图个乐，或者给想用 AI 辅助写全栈项目的朋友做个参考。

## ✨ 核心功能

*   **多格式支持**：
    *   **TXT**：自动识别 GBK/UTF-8 编码，内置正则引擎自动提取卷名和章节。
    *   **PDF**：基于 PDF.js 的懒加载渲染，支持提取原生大纲目录。
    *   **Word (docx)**：原生解析并提取多级标题。
*   **全文检索**：底层采用 SQLite 的 FTS5 引擎。支持数万本书的后台增量建库，跨书搜索结果能在正文中精准高亮并靶向跳转。
*   **多端适配**：电脑端固定顶部与侧边栏；手机端采用沉浸式全屏阅读，点击唤出悬浮菜单，解决了各种移动端点击穿透和兼容性问题。
*   **阅读辅助**：支持临时/全局文本替换（防屏蔽词）、单章或全书在线编辑热更新、繁简体一键切换。
*   **进度同步**：精确到行的阅读进度、绝对字数百分比，跨设备无缝同步。
*   **多书库挂载**：支持在 Docker 中挂载本地 NAS 的多个不同硬盘目录，并在前端聚合成统一的树状文件库。

## 🚀 部署指南 (基于 Docker Compose)

本项目使用 Docker Compose 进行部署，采用多阶段构建 (Multi-stage build)，运行时镜像极度精简，秒级启动。

### 1. 准备目录结构
将本项目的源码下载到你的 NAS 上的任意目录（如 `/vol1/Docker/MyCloudReader`）。

### 2. 配置环境变量
在项目根目录新建一个 `.env` 文件，设置你的专属访问密码：
```env
# 访问密码
ACCESS_PASSWORD=your_password_here
# 内部端口（通常无需修改）
PORT=3000