/* server/server.js - 现代化重构：极简入口，路由全解耦 */
import express from 'express';
import fs from 'fs-extra';
import path from 'path';

import config from './config.js';
import { initDB } from './db.js';

// 👑 导入分层路由
import searchRouter from './routes/search.js';
import progressRouter from './routes/progress.js';
import bookRouter from './routes/book.js';

const app = express();

app.use(express.json({ limit: '50mb' }));

// 静态资源：字体
app.use('/api/fonts/files', express.static(config.DIRS.FONTS));
app.get('/api/fonts', async (req, res) => {
    try {
        const files = await fs.promises.readdir(config.DIRS.FONTS);
        const fonts = files.filter(f => /\.(ttf|otf|woff|woff2|ttc)$/i.test(f));
        res.json(fonts);
    } catch (e) { res.json([]); }
});

// 登录接口
app.post('/api/login', (req, res) => {
    if (req.body.password === config.ACCESS_PASSWORD) { res.json({ success: true, token: config.ACCESS_PASSWORD }); } 
    else { res.status(401).json({ success: false, msg: "密码错误" }); }
});

// 👑 全局鉴权拦截器
app.use('/api', (req, res, next) => {
    if (req.path === '/login') return next();
    if (req.headers.authorization !== config.ACCESS_PASSWORD) return res.status(401).send('Unauthorized');
    next();
});

// 👑 挂载路由模块
app.use('/api', searchRouter);
app.use('/api', progressRouter);
app.use('/api', bookRouter);

// 兜底静态资源处理 (前端 Vue 构建产物)
app.use(express.static(config.DIRS.DIST));
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return res.status(404).send('Not Found');
    res.sendFile(path.join(config.DIRS.DIST, 'index.html'));
});

// 初始化数据库并启动
initDB();
app.listen(config.PORT, () => { 
    console.log(`🚀 MyCloudReader 核动力服务端已启动，监听端口: ${config.PORT}`); 
});