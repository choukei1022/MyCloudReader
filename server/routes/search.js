/* server/routes/search.js - FTS5 核动力检索引擎与普通搜索路由 */
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import config from '../config.js';
import { runQuery, getQuery } from '../db.js';

const router = express.Router();

let indexStatus = { isRunning: false, isPaused: false, current: 0, total: 0, currentBook: '', indexedCount: 0 };

async function updateIndexedCount() {
    try {
        const rows = await getQuery('SELECT count(*) as cnt FROM indexed_books_tracker');
        indexStatus.indexedCount = rows[0].cnt;
    } catch(e) { indexStatus.indexedCount = 0; }
}

// 启动时更新一下数量
updateIndexedCount();

function isUTF8Buffer(bytes) {
    let i = 0;
    while (i < bytes.length) {
        if (bytes[i] <= 0x7F) i++;
        else if (bytes[i] >= 0xC2 && bytes[i] <= 0xDF) { if (i + 1 < bytes.length && bytes[i+1] >= 0x80 && bytes[i+1] <= 0xBF) i += 2; else return false; }
        else if (bytes[i] >= 0xE0 && bytes[i] <= 0xEF) { if (i + 2 < bytes.length && bytes[i+1] >= 0x80 && bytes[i+1] <= 0xBF && bytes[i+2] >= 0x80 && bytes[i+2] <= 0xBF) i += 3; else return false; }
        else if (bytes[i] >= 0xF0 && bytes[i] <= 0xF4) { if (i + 3 < bytes.length && bytes[i+1] >= 0x80 && bytes[i+1] <= 0xBF && bytes[i+2] >= 0x80 && bytes[i+2] <= 0xBF && bytes[i+3] >= 0x80 && bytes[i+3] <= 0xBF) i += 4; else return false; }
        else return false;
    }
    return true;
}

async function getAllTxtFiles(dir, fileList = []) {
    const items = await fs.promises.readdir(dir);
    for (const item of items) {
        if (item.startsWith('.')) continue; 
        const fullPath = path.join(dir, item);
        const stats = await fs.promises.stat(fullPath);
        if (stats.isDirectory()) { 
            await getAllTxtFiles(fullPath, fileList); 
        } else if (item.toLowerCase().endsWith('.txt')) { 
            fileList.push({ fullPath, mtime: Math.floor(stats.mtimeMs) }); 
        }
    }
    return fileList;
}

async function searchFiles(dir, keyword, results) {
    const items = await fs.promises.readdir(dir);
    for (const item of items) {
        if (item === '.progress.json' || item.startsWith('.search_index.db')) continue; 
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(config.DIRS.BOOKS, fullPath).replace(/\\/g, '/');
        try {
            const stats = await fs.promises.stat(fullPath);
            if (item.toLowerCase().includes(keyword.toLowerCase())) { results.push({ name: item, type: stats.isDirectory() ? 'folder' : 'file', path: relativePath }); }
            if (stats.isDirectory()) { await searchFiles(fullPath, keyword, results); }
        } catch(e) { } 
    }
}

// ==========================================
// 路由接口定义
// ==========================================

// 普通文件名检索
router.get('/search', async (req, res) => {
    try {
        const keyword = req.query.q || '';
        if (!keyword) return res.json([]);
        const results = [];
        await searchFiles(config.DIRS.BOOKS, keyword, results);
        res.json(results.slice(0, 100)); 
    } catch (e) { res.status(500).json([]); }
});

// 获取建库进度
router.get('/index-progress', async (req, res) => { 
    if (!indexStatus.isRunning) await updateIndexedCount();
    res.json(indexStatus); 
});

// 暂停/恢复建库
router.post('/toggle-index-pause', (req, res) => {
    if (indexStatus.isRunning) { indexStatus.isPaused = !indexStatus.isPaused; }
    res.json({ success: true, isPaused: indexStatus.isPaused });
});

// 核心：构建全文索引 (防爆增量版)
router.post('/build-index', async (req, res) => {
    if (indexStatus.isRunning) return res.json({ success: false });
    res.json({ success: true });
    
    indexStatus.isRunning = true;
    indexStatus.isPaused = false;
    
    try {
        indexStatus.currentBook = "正在扫描对比增量文件...";
        
        const dbBooks = await getQuery('SELECT book_path, mtime FROM indexed_books_tracker');
        const dbMap = new Map();
        dbBooks.forEach(row => dbMap.set(row.book_path, row.mtime));

        const diskFiles = await getAllTxtFiles(config.DIRS.BOOKS);
        const diskMap = new Map();
        diskFiles.forEach(f => {
            const relPath = path.relative(config.DIRS.BOOKS, f.fullPath).replace(/\\/g, '/');
            diskMap.set(relPath, f);
        });

        const toDelete = []; const toUpdate = []; const toAdd = []; const toTagLegacy = [];

        for (const dbPath of dbMap.keys()) { if (!diskMap.has(dbPath)) toDelete.push(dbPath); }

        for (const [relPath, fileInfo] of diskMap.entries()) {
            if (!dbMap.has(relPath)) { toAdd.push({ ...fileInfo, relPath }); } 
            else {
                const dbMtime = dbMap.get(relPath);
                if (dbMtime == null) { toTagLegacy.push({ relPath, mtime: fileInfo.mtime }); } 
                else if (fileInfo.mtime > dbMtime + 2000) { toUpdate.push({ ...fileInfo, relPath }); }
            }
        }

        indexStatus.total = toAdd.length + toUpdate.length + toDelete.length + toTagLegacy.length;
        indexStatus.current = 0;

        if (indexStatus.total === 0) {
            indexStatus.currentBook = "全库已是最新，无需更新！";
            await new Promise(r => setTimeout(r, 2500)); 
            return;
        }

        await runQuery('PRAGMA synchronous = OFF;');

        if (toTagLegacy.length > 0) {
            indexStatus.currentBook = "正在为旧库快速升级智能时间戳...";
            await runQuery('BEGIN TRANSACTION');
            for (const item of toTagLegacy) {
                await runQuery('UPDATE indexed_books_tracker SET mtime = ? WHERE book_path = ?', [item.mtime, item.relPath]);
                indexStatus.current++;
            }
            await runQuery('COMMIT');
        }

        const pathsToClear = [...toDelete, ...toUpdate.map(u => u.relPath)];
        if (pathsToClear.length > 0) {
            indexStatus.currentBook = "正在批量清理失效的旧版索引 (仅需一次全表扫描)...";
            await runQuery('BEGIN TRANSACTION');
            await runQuery('CREATE TEMP TABLE IF NOT EXISTS temp_clear_books (path TEXT PRIMARY KEY)');
            await runQuery('DELETE FROM temp_clear_books'); 
            
            for (const p of pathsToClear) { await runQuery('INSERT INTO temp_clear_books VALUES (?)', [p]); }
            await runQuery('DELETE FROM fts_books WHERE book_path IN (SELECT path FROM temp_clear_books)');
            for (const delPath of toDelete) { await runQuery('DELETE FROM indexed_books_tracker WHERE book_path = ?', [delPath]); indexStatus.current++; }
            
            await runQuery('DROP TABLE temp_clear_books');
            await runQuery('COMMIT');
        }

        const filesToInsert = [...toUpdate, ...toAdd];
        for (const fileInfo of filesToInsert) {
            while (indexStatus.isPaused) { await new Promise(r => setTimeout(r, 1000)); }

            indexStatus.currentBook = `[增量更新] ` + path.basename(fileInfo.fullPath);
            try {
                const buffer = await fs.promises.readFile(fileInfo.fullPath);
                let text = '';
                if (isUTF8Buffer(buffer)) { text = buffer.toString('utf-8'); } 
                else { try { text = new TextDecoder('gbk').decode(buffer); } catch (e) { text = buffer.toString('utf-8'); } }
                
                const bookName = path.basename(fileInfo.fullPath, '.txt');
                const textLen = text.length; 
                const CHUNK_SIZE = 50000; 
                
                await runQuery('BEGIN TRANSACTION');
                await runQuery('INSERT OR REPLACE INTO indexed_books_tracker (book_path, mtime) VALUES (?, ?)', [fileInfo.relPath, fileInfo.mtime]);
                
                for (let offset = 0; offset < textLen; offset += CHUNK_SIZE) {
                    let chunk = text.substring(offset, offset + CHUNK_SIZE);
                    let spacedChunk = chunk.split('').join(' ');
                    await runQuery(`INSERT INTO fts_books (book_path, book_name, abs_offset, total_length, raw_content, content_spaced) VALUES (?, ?, ?, ?, ?, ?)`, [fileInfo.relPath, bookName, offset, textLen, chunk, spacedChunk]);
                }
                await runQuery('COMMIT');
            } catch(e) { await runQuery('ROLLBACK').catch(()=>{}); } 
            
            indexStatus.current++; 
            if (indexStatus.current % 10 === 0) await new Promise(r => setTimeout(r, 10)); 
        }
        
        if (pathsToClear.length + filesToInsert.length > 500) {
            indexStatus.currentBook = "数据变动较大，正在深度优化底层索引碎片 (可能需要数分钟)...";
            await runQuery(`INSERT INTO fts_books(fts_books) VALUES('optimize')`);
        }
        
    } catch(e) { console.error(e); } 
    finally { 
        await runQuery('PRAGMA synchronous = NORMAL;');
        await updateIndexedCount(); 
        indexStatus.isRunning = false; 
        indexStatus.isPaused = false;
    }
});

// 全文精准靶向检索
router.get('/search-fulltext', async (req, res) => {
    try {
        let keyword = (req.query.q || '').trim().replace(/"/g, ''); if (!keyword) return res.json([]);
        const ftsQuery = '"' + keyword.split('').join(' ') + '"';
        const rows = await getQuery(`SELECT book_path, book_name, abs_offset, total_length, raw_content FROM fts_books WHERE content_spaced MATCH ? LIMIT 150`, [ftsQuery]);
        
        const results = [];
        rows.forEach(row => {
            let localMatchIdx = row.raw_content.indexOf(keyword);
            if (localMatchIdx !== -1) {
                let startCtx = Math.max(0, localMatchIdx - 20); let endCtx = Math.min(row.raw_content.length, localMatchIdx + keyword.length + 20);
                results.push({
                    path: row.book_path, bookName: row.book_name,
                    context: row.raw_content.substring(startCtx, endCtx).replace(/\n/g, ' '),
                    absoluteOffset: row.abs_offset + localMatchIdx,
                    percent: (((row.abs_offset + localMatchIdx) / row.total_length) * 100).toFixed(1)
                });
            }
        });
        res.json(results);
    } catch (e) { res.status(500).json([]); }
});

export default router;