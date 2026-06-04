import sqlite3 from 'sqlite3';
import config from './config.js';

const sqlite = sqlite3.verbose();

// 连接主库
export const db = new sqlite.Database(config.FILES.SEARCH_DB);

export const runQuery = (sql, params = []) => new Promise((resolve, reject) => { 
    db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); }); 
});

export const getQuery = (sql, params = []) => new Promise((resolve, reject) => { 
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }); 
});

// 初始化表结构与护盘配置
export const initDB = () => {
    db.serialize(() => {
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA synchronous = NORMAL;');
        db.run('PRAGMA wal_autocheckpoint = 10000;'); 
        db.run('PRAGMA cache_size = -64000;'); 
        db.run('PRAGMA temp_store = MEMORY;');
        db.run('PRAGMA mmap_size = 268435456;'); 

        db.run(`CREATE VIRTUAL TABLE IF NOT EXISTS fts_books USING fts5(book_path UNINDEXED, book_name UNINDEXED, abs_offset UNINDEXED, total_length UNINDEXED, raw_content UNINDEXED, content_spaced)`);
        db.run(`CREATE TABLE IF NOT EXISTS indexed_books_tracker (book_path TEXT PRIMARY KEY, mtime INTEGER)`);
        db.run(`ALTER TABLE indexed_books_tracker ADD COLUMN mtime INTEGER`, (err) => {});
    });
};