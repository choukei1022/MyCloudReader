import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import config from '../config.js';

const router = express.Router();

function getProgressDb() {
    if (!fs.existsSync(config.FILES.PROGRESS)) return {};
    return fs.readJsonSync(config.FILES.PROGRESS, { throws: false }) || {};
}

router.get('/progress', (req, res) => {
    const dbData = getProgressDb();
    res.json({ success: true, data: dbData[req.query.path] || null });
});

router.post('/progress', (req, res) => {
    try {
        const dbData = getProgressDb();
        dbData[req.body.path] = { 
            chapterIndex: req.body.chapterIndex, 
            title: req.body.title, 
            scroll: req.body.scroll, 
            totalPercent: req.body.totalPercent, 
            time: Date.now() 
        };
        fs.writeJsonSync(config.FILES.PROGRESS, dbData);
        res.json({ success: true });
    } catch(e) { res.status(500).json({success: false}); }
});

router.get('/history', (req, res) => {
    try {
        const dbData = getProgressDb();
        const historyList = [];
        let hasDeadLinks = false; 

        for (let bookPath in dbData) {
            const fullPath = path.join(config.DIRS.BOOKS, bookPath);
            if (fs.existsSync(fullPath)) {
                historyList.push({
                    path: bookPath,
                    name: bookPath.split('/').pop().replace(/\.(txt|pdf|docx)$/i, ''),
                    ...dbData[bookPath]
                });
            } else {
                delete dbData[bookPath];
                hasDeadLinks = true;
            }
        }
        if (hasDeadLinks) fs.writeJsonSync(config.FILES.PROGRESS, dbData);
        historyList.sort((a, b) => (b.time || 0) - (a.time || 0));
        res.json(historyList.slice(0, 50));
    } catch(e) { res.status(500).json([]); }
});

router.post('/history/delete', (req, res) => {
    try {
        const pathToDelete = req.body.path;
        if (!pathToDelete) return res.status(400).json({ success: false });

        const dbData = getProgressDb();
        if (dbData[pathToDelete]) {
            delete dbData[pathToDelete]; 
            fs.writeJsonSync(config.FILES.PROGRESS, dbData); 
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

export default router;