import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
    // 以后可以从环境变量读，现在先保持原样
    ACCESS_PASSWORD: process.env.ACCESS_PASSWORD || 'zhangjing1022',
    PORT: process.env.PORT || 3000,
    
    // 物理路径映射 (完美适配你的飞牛OS Docker)
    DIRS: {
        BOOKS: path.join(__dirname, '../books'),
        FONTS: path.join(__dirname, '../fonts'),
        DIST: path.join(__dirname, '../dist'),
    },
    
    // 数据库文件路径
    FILES: {
        PROGRESS: path.join(__dirname, '../books/.progress.json'),
        SEARCH_DB: path.join(__dirname, '../books/.search_index.db'),
    }
};

// 确保基础物理目录存在
fs.ensureDirSync(config.DIRS.BOOKS);
fs.ensureDirSync(config.DIRS.FONTS);

export default config;