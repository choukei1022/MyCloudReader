/* src/composables/useBookParser.js - TXT 智能分卷分章正则引擎 */
import { store } from '../../store.js';

export function useBookParser() {
    
    const parseTxtChapters = (targetIdx = 0) => {
        let tempChapters = []; 
        let lines = store.currentFileText.split('\n'); 
        let currentPos = 0;
        
        // 神级正则常量
        const baseNum = "\\d+|[一二三四五六七八九十百千万零〇两廿卅卌]+|[壹贰叁肆伍陆柒捌玖拾佰仟]+|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ]+";
        const nums = `(?:${baseNum})(?:\\s*[-－~～—]+\\s*(?:${baseNum}))*`;
        const decors = `^[ \\t★☆○●◎◇◆□■△▲※【】\\[\\]\\(\\)（）《》<>_\\-~～]*`;
        
        const volRegex = new RegExp(`${decors}第?\\s*(?:${nums})\\s*[卷部篇集]`);
        const chapRegex = new RegExp(`${decors}(?:第?\\s*(?:${nums})\\s*[章回幕折话]|楔子|引子|序[言章]?|前言|尾声|后记|番外(?:\\s*${nums})?|外传(?:\\s*${nums})?)`);
        const jieRegex = new RegExp(`${decors}第?\\s*(?:${nums})\\s*节`);

        let hasVolume = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.length > 0 && line.length <= 35 && !/[。！？! \?]$/.test(line)) {
                let isVol = volRegex.test(line);
                let isChap = chapRegex.test(line) || jieRegex.test(line);
                
                if (isVol || isChap) { 
                    if (isVol) hasVolume = true;
                    tempChapters.push({ title: line, start: currentPos, isVolume: isVol }); 
                }
            }
            currentPos += lines[i].length + 1; 
        }
        
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

        // 处理跨书跳转的靶向定位
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