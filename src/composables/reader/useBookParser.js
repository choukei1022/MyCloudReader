/* 
 * 文件路径：src/composables/reader/useBookParser.js
 * 主要作用：【逻辑外脑】TXT 智能分卷分章正则引擎。
 * 包含功能：利用智能正则提取卷、章、节，利用“密度雷达 3.0”智能剔除开篇假目录，计算跨书跳转偏移量。
 */
import { store } from '../../store.js';

export function useBookParser() {
    
    const parseTxtChapters = (targetIdx = 0) => {
        let tempChapters = []; 
        let lines = store.currentFileText.split('\n'); 
        let currentPos = 0;
        
        const baseNum = "\\d+|[一二三四五六七八九十百千万零〇两廿卅卌]+|[壹贰叁肆伍陆柒捌玖拾佰仟]+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+";
        const nums = `(?:${baseNum})(?:\\s*[-－~～—]+\\s*(?:${baseNum}))*`;
        const decors = `^[ \\t★☆○●◎◇◆□■△▲※【】\\[\\]\\(\\)（）《》<>_\\-~～]*`;
        
        const volRegex = new RegExp(`${decors}第?\\s*(?:${nums})\\s*[卷部篇集]`);
        const chapRegex = new RegExp(`${decors}(?:第?\\s*(?:${nums})\\s*[章回幕折话]|终\\s*章|楔子|引子|序\\s*[言章幕]?|前言|尾声|后记|番外(?:\\s*${nums})?|外传(?:\\s*${nums})?)`);
        const jieRegex = new RegExp(`${decors}第?\\s*(?:${nums})\\s*节(?:\\s|[:：，、_\\-—]|$|[【\\[（\\(《])`);

        let hasVolume = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.length > 0 && line.length <= 45 && !/[。\.]$/.test(line)) {
                let isVol = volRegex.test(line);
                let isChap = chapRegex.test(line) || jieRegex.test(line);
                
                if (isVol || isChap) { 
                    if (isVol) hasVolume = true;
                    tempChapters.push({ title: line, start: currentPos, isVolume: isVol }); 
                }
            }
            currentPos += lines[i].length + 1; 
        }
        
        // ========================================================
        // 👑 修复2：智能“密度雷达 3.0” —— 修复“误伤友军” Bug！
        // ========================================================
        if (tempChapters.length > 0) {
            let isDense = new Array(tempChapters.length).fill(false);
            
            // 第一遍扫描：只对“自身内容极少”的章节定罪！
            for (let i = 0; i < tempChapters.length - 1; i++) {
                let dist = tempChapters[i+1].start - tempChapters[i].start;
                // 如果到下一章的距离 < 80 字符，说明本章基本没内容，是假目录
                if (dist < 80) {
                    isDense[i] = true;
                    // 👑 核心修复：绝对不牵连下一章！下一章是死是活，由下一章自己的字数决定。
                }
            }
            
            // 第二遍扫描：赦免真实的“卷+章”连体婴儿
            for (let i = 0; i < tempChapters.length - 1; i++) {
                if (tempChapters[i].isVolume && !tempChapters[i+1].isVolume) {
                    isDense[i] = false;
                }
            }

            // 第三遍扫描：连续 4 个以上的密集章节，才会被定罪为“假目录”
            let streak = 0;
            for (let i = 0; i <= tempChapters.length; i++) {
                if (i < tempChapters.length && isDense[i]) {
                    streak++;
                } else {
                    if (streak > 0 && streak < 4) {
                        for (let j = i - streak; j < i; j++) {
                            isDense[j] = false; 
                        }
                    }
                    streak = 0;
                }
            }
            
            // 第四遍清洗：无情剔除前 20% 文本中的假目录组合！
            let validChapters = [];
            let docLength = store.currentFileText.length;
            for (let i = 0; i < tempChapters.length; i++) {
                if (!isDense[i] || tempChapters[i].start > docLength * 0.2) {
                    validChapters.push(tempChapters[i]);
                }
            }
            tempChapters = validChapters;
        }
        // ========================================================

        if(tempChapters.length === 0) {
            tempChapters.push({ title: `全文展示`, start: 0, end: store.currentFileText.length, isVolume: false });
        } else {
            if (tempChapters[0].start > 0) {
                let preText = store.currentFileText.substring(0, tempChapters[0].start).trim();
                if (preText.length > 0) {
                    tempChapters.unshift({ title: `卷首/前言`, start: 0, isVolume: false });
                }
            }
            for(let i=0; i<tempChapters.length; i++) {
                tempChapters[i].end = i+1 < tempChapters.length ? tempChapters[i+1].start : store.currentFileText.length; 
                tempChapters[i].indent = hasVolume && !tempChapters[i].isVolume;
            }
        }
        
        store.chaptersData = tempChapters;

        // 处理靶向定位
        if (store.pendingCrossBookOffset !== -1) {
            const absOffset = store.pendingCrossBookOffset;
            let jumpChapIdx = store.chaptersData.findIndex(ch => absOffset >= ch.start && absOffset < ch.end);
            if (jumpChapIdx === -1) jumpChapIdx = store.chaptersData.length - 1;
            
            store.searchHighlightOffset = absOffset - store.chaptersData[jumpChapIdx].start;
            store.searchHighlightLength = store.pendingCrossBookKeyword.length;
            store.searchKeyword = store.pendingCrossBookKeyword;
            
            store.currentChapterIndex = jumpChapIdx;
            store.pendingCrossBookOffset = -1;
            store.pendingCrossBookKeyword = '';
        } else {
            store.currentChapterIndex = Math.max(0, Math.min(targetIdx, store.chaptersData.length - 1));
        }

        store.triggerJump = Date.now(); 
    }

    return { parseTxtChapters };
}