📚 MyCloudReader (私人云端书架)

![alt text](https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=flat-square&logo=vue.js)


![alt text](https://img.shields.io/badge/Node.js-20.LTS-339933?style=flat-square&logo=node.js)


![alt text](https://img.shields.io/badge/SQLite-FTS5-003B57?style=flat-square&logo=sqlite)


![alt text](https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker)


![alt text](https://img.shields.io/badge/License-MIT-blue.svg)

MyCloudReader 是一款专为 NAS（如飞牛 OS、群晖、极空间等）和 Docker 环境打造的高性能、跨平台私人云端阅读器。

它采用全栈 Vue 3 + Node.js 架构，为你提供媲美原生阅读 APP 的沉浸式阅读体验、极致的排版自定义能力。在最新的 V2.0 版本中，它搭载了 SQLite FTS5 工业级全文检索引擎，能瞬间在几万本书海中实现毫秒级的跨书精准检索！

重点

上面这些话都是AI帮我打的，这玩意儿就是纯粹我为了能够在线看我的TXT电子书自己用AI写的应用，发布上来存粹是因为已经没有什么继续开发的思路了，希望大家能给点意见。

我不碰开发已经好多年了，所以做出来的东西应该挺简陋，不过还是要感谢AI，在这个时代能够让我们自由的去做一些自己想做的小玩意儿。

重点
✨ 核心特性 (Features)
📖 智能多格式阅读与排版

    TXT 极速引擎：自动识别 GBK/UTF-8 编码，内置增强型正则引擎（完美支持“第433-434章”、“二部曲”等复杂网文分章），并支持长文卷名折叠与空卷扉页生成。

    多格式支持：除了 TXT，原生支持 DOCX 转换为网页并提取标题大纲，支持 PDF 高清懒加载渲染及内置书签提取。

    精细排版控制：内置三套护眼主题，页边距、字号、行距、段距自由无级调整（甚至支持首行缩进），一键保存为个人模板。

    云端进度记忆：精确到行的阅读进度、绝对字数滚动百分比无缝同步，跨设备随时接续阅读。

⚡ 核动力搜索引擎 (SQLite FTS5)

    毫秒级全库检索：内置 SQLite 数据库与 FTS5 分词引擎。输入关键字，瞬间在数万本书、几千万字中查找结果，点击即可跨书“靶向”跳转，并在正文中精准高亮目标词！

    防爆增量构建：彻底解决万本小说建库卡死问题。底层采用智能 Diff 对比与 O(1) 批量清理。日常新增或修改小说，重建索引瞬间秒出，绝不浪费 NAS 的机械硬盘寿命。

    后台静默执行：几十 GB 的索引构建任务在后台异步执行，甚至支持随时暂停/恢复，完全不影响前台阅读。

🛠️ 硬核阅读工具

    沉浸式正文编辑：发现错别字？点击“编辑”原地唤出输入框，进度严丝合缝，修改后一键热更写入 NAS 源文件（并自动触发增量索引更新）。

    强大的文本替换：支持 A=B 批量规则导入。提供仅当前屏幕的“临时替换”（防屏蔽词）和修改源文件的“永久替换”。

    简繁体一键切换：纯前端无延迟一键转换正文简繁体，翻页、跳章永远默认显示绝对原版内容，只在需要时提供动态翻译。

📁 云盘级文件管理

    动态树状目录，支持多层级文件夹展开与焦点追踪。

    支持网页端直接新建分类，上传单文件或批量上传带有层级的“整个文件夹”（防浏览器剥离路径）。

    支持外部巨型书库挂载：只需在 Docker 中追加一行映射，即可将 NAS 上的任何硬盘目录挂载进书库统一建立检索！

🚀 部署指南 (Deployment)

本项目使用 Docker Compose 进行部署，极度轻量，无需编译，秒级拉起。
1. 准备目录结构

将本项目的源码下载到你的 NAS 或服务器上的任意目录（如 /Docker/MyCloudReader）。
目录结构通常如下：
code Text

MyCloudReader/
├── dist/          # 前端打包后的文件 (无需操作)
├── server/        # 后端源码目录
├── docker-compose.yml 
├── books/         # 你的主书库 (启动后自动生成)
└── fonts/         # 你的字体库 (启动后自动生成)

2. 配置 docker-compose.yml

在项目根目录找到 docker-compose.yml 文件，你可以根据自己的 NAS 路径进行修改：
code Yaml

services:
  mycloudreader:
    # 直接使用官方瘦身版镜像，无需缓慢的本地 build！
    image: node:20-bookworm-slim
    container_name: my-cloud-reader
    restart: unless-stopped
    ports:
      - "48888:3000"  # 左侧为你访问的对外端口，可自由修改
    volumes:
      # 1. 挂载源码目录 (秒级热更)
      - ./:/app
      
      # 2. 隔离缓存 (勿删，防系统冲突)
      - /app/node_modules
      - /app/server/node_modules
      
      # 3. 主书库映射 (冒号左边请换成你 NAS 上的真实绝对路径！)
      - /你的绝对路径/Docker/MyCloudReader/books:/app/books
      
      # [可选黑科技] 4. 把你硬盘里的其他巨型书库，直接“传送”进来！
      # - /vol2/1000/DISK2/其他小说库:/app/books/外部书库
      
      # 5. 字体文件夹
      - /你的绝对路径/Docker/MyCloudReader/fonts:/app/fonts
      
    working_dir: /app
    command: >
      sh -c "npm install --registry=https://registry.npmmirror.com &&
             npm run build &&
             cd server &&
             npm install --registry=https://registry.npmmirror.com &&
             node server.js"

3. 一键启动

在项目根目录执行：
code Bash

docker-compose up -d

(如果你使用的是飞牛 OS、绿联等带有 UI 面板的 NAS，可直接在系统的 Docker 管理界面中选择该 docker-compose.yml 创建项目并启动。首次启动下载基础环境需几十秒，后续重启只需 5 秒！)
⚙️ 初始配置与使用

    默认访问地址：http://你的NAS_IP:48888

    默认访问密码：zhangjing1022
    (如需修改密码，请在部署前修改源码 server/server.js 文件中的 ACCESS_PASSWORD 变量，然后在面板中重启容器即可生效。)

    构建检索引擎：首次登录后，请点击右上角齿轮图标，点击【⚡ 构建全库文本索引】。系统会在后台为你建立毫秒级的检索引擎。

    添加字体：将任何 .ttf 或 .woff 格式的字体文件丢入 fonts 映射文件夹中，刷新网页即可在设置里使用，无需重启服务。

💻 技术栈 (Tech Stack)

    Frontend: Vue 3 (Composition API), Vite, CSS3 (原生 Flexbox/Grid 极简布局)

    Backend: Node.js 20, Express

    Database Engine: SQLite3 + FTS5 (支持纯中文分词检索)

    File System: fs-extra, multer

    Parsers: mammoth.js (DOCX), pdf.js (PDF)

📄 协议 (License)

本项目采用 MIT License 开源协议。欢迎 Fork、提交 PR 或提出 Issue！