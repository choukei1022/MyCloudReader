/* src/composables/useReaderProgress.js - 云端心跳与进度同步引擎 */
import { store } from '../../store.js';
import { apiFetch } from '../../utils/request.js';

export function useReaderProgress(readerRef, nonReactivePdfDoc) {
    let saveProgressTimer = null;

    const scheduleSaveProgress = () => {
        if (!store.currentBookPath || store.isEditMode || store.isFullEditMode) return;
        const pathToSave = store.currentBookPath;
        
        clearTimeout(saveProgressTimer);
        // 1.5秒防抖，防止疯狂写入
        saveProgressTimer = setTimeout(async () => {
            if (store.currentBookPath !== pathToSave || !readerRef.value) return;
            
            const maxScroll = readerRef.value.scrollHeight - readerRef.value.clientHeight;
            const scrollPercent = maxScroll > 0 ? (readerRef.value.scrollTop / maxScroll) : 0;
            
            let cIdx = store.currentChapterIndex;
            let cTitle = "全文展示";
            let tPercent = 0; 
            
            if (pathToSave.endsWith('.pdf')) { 
                cIdx = store.pdfPageNum; 
                cTitle = "PDF 第 " + store.pdfPageNum + " 页"; 
                tPercent = nonReactivePdfDoc.value ? (store.pdfPageNum / nonReactivePdfDoc.value.numPages) : 0;
            }
            else if (pathToSave.endsWith('.docx')) { 
                cIdx = 0; 
                cTitle = "Word 文档"; 
                tPercent = scrollPercent;
            } 
            else if (store.chaptersData[cIdx]) { 
                const c = store.chaptersData[cIdx]; 
                cTitle = c.title; 
                if (store.currentFileText.length > 0) {
                    tPercent = (c.start + (c.end - c.start) * scrollPercent) / store.currentFileText.length;
                }
            }
            
            try {
                await apiFetch('/api/progress', {
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        path: pathToSave, 
                        chapterIndex: cIdx, 
                        title: cTitle, 
                        scroll: scrollPercent, 
                        totalPercent: tPercent 
                    })
                });
            } catch(e) {}
        }, 1500); 
    }

    return { scheduleSaveProgress };
}