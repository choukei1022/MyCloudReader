import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import config from '../config.js';

const router = express.Router();

router.get('/tree', async (req, res) => {
    try {
        const targetDir = req.query.dir || '';
        const fullPath = path.join(config.DIRS.BOOKS, targetDir);
        if (!fullPath.startsWith(config.DIRS.BOOKS)) return res.status(403).send('Forbidden');
        if (!fs.existsSync(fullPath)) return res.json([]);
        const items = await fs.promises.readdir(fullPath);
        const promises = items.map(async (item) => {
            if (item === '.progress.json' || item === '.search_index.db' || item === '.search_index.db-wal' || item === '.search_index.db-shm') return null; 
            const itemPath = path.join(fullPath, item);
            const relativePath = path.relative(config.DIRS.BOOKS, itemPath).replace(/\\/g, '/');
            try {
                const stats = await fs.promises.stat(itemPath);
                if (stats.isDirectory()) { return { name: item, type: 'folder', path: relativePath }; } 
                else if (item.endsWith('.txt') || item.endsWith('.pdf') || item.endsWith('.docx')) { return { name: item, type: 'file', path: relativePath }; }
            } catch(err) { return null; }
            return null;
        });
        const results = (await Promise.all(promises)).filter(Boolean);
        results.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name, 'zh-CN', { numeric: true });
        });
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

router.post('/mkdir', async (req, res) => { try { await fs.ensureDir(path.join(config.DIRS.BOOKS, req.body.path)); res.send('ok'); } catch(e) { res.status(500).send('error'); }});
router.post('/delete', async (req, res) => { try { await fs.remove(path.join(config.DIRS.BOOKS, req.body.path)); res.send('ok'); } catch (e) { res.status(500).send('error'); } });
router.post('/rename', async (req, res) => {
    try {
        const oldPath = path.join(config.DIRS.BOOKS, req.body.oldPath);
        const newPath = path.join(config.DIRS.BOOKS, req.body.newPath);
        if (!oldPath.startsWith(config.DIRS.BOOKS) || !newPath.startsWith(config.DIRS.BOOKS)) return res.status(403).send('Forbidden');
        if (fs.existsSync(newPath)) return res.status(400).json({success: false, msg: "目标名称已存在"});
        await fs.rename(oldPath, newPath);
        res.json({success: true});
    } catch (e) { res.status(500).json({success: false, msg: e.message}); }
});
router.post('/save', async (req, res) => { try { await fs.writeFile(path.join(config.DIRS.BOOKS, req.body.path), req.body.content, 'utf-8'); res.send('ok'); } catch (e) { res.status(500).send('error'); }});
router.post('/move', async (req, res) => {
    try {
        const src = path.join(config.DIRS.BOOKS, req.body.source), dest = path.join(config.DIRS.BOOKS, req.body.targetDir, path.basename(req.body.source));
        if (!src.startsWith(config.DIRS.BOOKS) || !dest.startsWith(config.DIRS.BOOKS)) return res.status(403).send('Forbidden');
        if (dest.startsWith(src + path.sep) || dest === src) return res.status(400).json({success: false, msg: "不能移动到自身或其子目录"});
        await fs.move(src, dest); res.json({success: true});
    } catch (e) { res.status(500).json({success: false, msg: e.message}); }
});
router.post('/copy', async (req, res) => {
    try {
        const src = path.join(config.DIRS.BOOKS, req.body.source), dest = path.join(config.DIRS.BOOKS, req.body.targetDir, path.basename(req.body.source));
        if (!src.startsWith(config.DIRS.BOOKS) || !dest.startsWith(config.DIRS.BOOKS)) return res.status(403).send('Forbidden');
        if (dest.startsWith(src + path.sep) || dest === src) return res.status(400).json({success: false, msg: "不能复制到自身或其子目录"});
        await fs.copy(src, dest); res.json({success: true});
    } catch (e) { res.status(500).json({success: false, msg: e.message}); }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let safeOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        let decodedPath = safeOriginalName.split('___PATH_SEP___').join('/');
        const dest = path.join(config.DIRS.BOOKS, req.body.path || '', path.parse(decodedPath).dir);
        fs.ensureDirSync(dest); 
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        let safeOriginalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        let decodedPath = safeOriginalName.split('___PATH_SEP___').join('/');
        cb(null, path.parse(decodedPath).base);
    }
});
const upload = multer({ storage });
router.post('/upload', upload.array('files'), (req, res) => res.send('ok'));
router.get('/book', (req, res) => res.sendFile(path.join(config.DIRS.BOOKS, req.query.path)));

export default router;