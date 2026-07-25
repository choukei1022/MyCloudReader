/* 
 * 文件路径：src/composables/reader/useBookParser.js
 * 主要作用：【逻辑外脑】TXT 智能分卷分章正则引擎。
 * 包含功能：四维 NLP 交叉验证正则、智能雷达探测剔除 TOC、跨书靶向定位。
 */
import { store } from '../../store.js';

export function useBookParser() {
    
    const parseTxtChapters = (targetIdx = 0) => {
        let tempChapters = []; 
        let lines = store.currentFileText.split('\n'); 
        let currentPos = 0;
        
        // 基础构建块
        const baseNum = "\\d+|[一二三四五六七八九十百千万零〇两廿卅卌]+|[壹贰叁肆伍陆柒捌玖拾佰仟]+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+";
        const nums = `(?:${baseNum})(?:\\s*[-－~～—]+\\s*(?:${baseNum}))*`;
        const decors = `^[ \\t★☆○●◎◇◆□■△▲※【】\\[\\]\\(\\)（）《》<>_\\-~～]*`;
        
        // 👑 终极杀招 1：严格边界限制 (不允许逗号、顿号，必须是空格、冒号或结尾)
        const strictBoundary = `(?:\\s|[:：_\\-—]|$|[【\\[（\\(《])`;
        // 👑 终极杀招 2：毒药字符黑名单 (章节名后面绝不可能紧跟着这些语法助词)
        const poisonChars = `[的地得与和或并却也便就是了着过啊呢呀吗吧里的内上中下在又还被向对从跟把]`;

        // ==========================================
        // 🤖 四维 NLP 交叉验证引擎
        // ==========================================
        
        // 防线 1：【容易误用的量词】卷部篇集 幕折话节 -> 必须有严格边界！(防 "一部电影"、"第三幕的")
        const volRegex = new RegExp(`${decors}第?\\s*(?:${nums})\\s*[卷部篇集幕折话节]${strictBoundary}`);

        // 防线 2：【带"第"字的章回】 -> 允许不加空格直接连正文，但触发毒药检测！(防 "第一章的内容"，允许 "第170章给森重宽")
        const chapWithDiRegex = new RegExp(`${decors}第\\s*(?:${nums})\\s*[章回](?!\\s*${poisonChars})`);

        // 防线 3：【不带"第"字的章回】 -> 既然你连"第"都不写，那必须有严格边界！(防 "一章的内容")
        const chapWithoutDiRegex = new RegExp(`${decors}(?:${nums})\\s*[章回]${strictBoundary}`);

        // 防线 4：【特殊独立章节】 -> 必须有严格边界！(防 "前言不搭后语")
        const specialRegex = new RegExp(`${decors}(?:终\\s*章|楔子|引子|序\\s*[言章幕]?|前言|尾声|后记|番外(?:\\s*${nums})?|外传(?:\\s*${nums})?)${strictBoundary}`);

        let hasVolume = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            // 长度限制在 45 以内
            if (line.length > 0 && line.length <= 45) {
                
                let isVol = volRegex.test(line);
                let isChap = chapWithDiRegex.test(line) || chapWithoutDiRegex.test(line) || specialRegex.test(line);
                
                if (isVol || isChap) { 
                    if (isVol) hasVolume = true;
                    // 顺手给作者擦屁股：剃掉手抖打的句号
                    let cleanTitle = line.replace(/[。\.]$/, '');
                    tempChapters.push({ title: cleanTitle, start: currentPos, isVolume: isVol }); 
                }
            }
            currentPos += lines[i].length + 1; 
        }
        
        // ========================================================
        // 智能“密度雷达 3.0” —— 防止假目录 (TOC) 与误伤友军
        // ========================================================
        if (tempChapters.length > 0) {
            let isDense = new Array(tempChapters.length).fill(false);
            
            for (let i = 0; i < tempChapters.length - 1; i++) {
                let dist = tempChapters[i+1].start - tempChapters[i].start;
                if (dist < 80) isDense[i] = true;
            }
            
            for (let i = 0; i < tempChapters.length - 1; i++) {
                if (tempChapters[i].isVolume && !tempChapters[i+1].isVolume) {
                    isDense[i] = false;
                }
            }

            let streak = 0;
            for (let i = 0; i <= tempChapters.length; i++) {
                if (i < tempChapters.length && isDense[i]) {
                    streak++;
                } else {
                    if (streak > 0 && streak < 4) {
                        for (let j = i - streak; j < i; j++) isDense[j] = false; 
                    }
                    streak = 0;
                }
            }
            
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