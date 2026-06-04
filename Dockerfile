# ==========================================
# 阶段 1：构建 Vue 前端 (Frontend Builder)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
# 淘宝镜像加速
RUN npm install --registry=https://registry.npmmirror.com
COPY . .
# 产物输出到 /app/dist
RUN npm run build

# ==========================================
# 阶段 2：带武器库的后端编译环境 (Backend Builder)
# ==========================================
FROM node:22-alpine AS backend-builder
WORKDIR /app/server

# 核心绝杀：换阿里云源，防止下载卡死
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 👑 保留你的战果：安装 Python3 和 C++ 编译武器库，专门用来对付 sqlite3
RUN apk add --no-cache python3 py3-setuptools make g++

COPY server/package*.json ./
# 只安装生产依赖。这时候 sqlite3 会愉快地调用 g++ 进行编译
# 👑 终极绝杀：强行指定 node-gyp 从国内淘宝镜像下载 Node 源码头文件，防卡死！同时开启 verbose 看日志！
RUN npm install --omit=dev \
    --registry=https://registry.npmmirror.com \
    --disturl=https://npmmirror.com/mirrors/node \
    --verbose

# ==========================================
# 阶段 3：终极瘦身运行环境 (Production)
# ==========================================
# 这个镜像里【没有】Python，【没有】g++，【没有】前端源码！
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

# 1. 把阶段 1 编译好的纯净前端静态文件拷过来
COPY --from=frontend-builder /app/dist ./dist

# 2. 把后端的代码拷过来
COPY server ./server

# 3. 👑 最爽的一步：把阶段 2 里编译好的 sqlite3 (.node 核心) 连同 node_modules 拷过来！
COPY --from=backend-builder /app/server/node_modules ./server/node_modules

# 提前创建挂载目录，防止飞牛 OS 挂载时出现权限问题
RUN mkdir -p /app/books /app/fonts

# 暴露 3000 端口
EXPOSE 3000

# 启动服务器
CMD ["node", "server/server.js"]