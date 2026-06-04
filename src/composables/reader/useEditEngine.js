/* 
 * 文件路径：src/composables/useEditEngine.js
 * 主要作用：【逻辑外脑】编辑模式与正文的双向同步引擎。
 * 包含功能：根据滚动百分比或绝对字数计算，保证在“阅读视图”和“编辑视图”切换时，光标严丝合缝地停留在同一行，并处理最终的热更保存。
 */
import { ref, watch, nextTick } from 'vue';
import { store, apiFetch } from '../../store.js';

export function useEditEngine(readerRef, editAreaRef, pendingScrollPercent, getRenderRange) {
    const editContent = ref('');
    const cancelEdit = () => { store.isEditMode = false; store.isFullEditMode = false; }

    watch(() => store.isEditMode, async (isEdit) => {
        if(isEdit) {
            const scrollPercent = readerRef.value.scrollTop / Math.max(1, readerRef.value.scrollHeight - readerRef.value.clientHeight);
            const range = getRenderRange();
            editContent.value = store.currentFileText.substring(range.start, range.end);
            await nextTick(); 
            if (editAreaRef.value) editAreaRef.value.scrollTop = scrollPercent * Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
        } else {
            const scrollPercent = editAreaRef.value ? (editAreaRef.value.scrollTop / Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight)) : 0;
            await nextTick();
            if (readerRef.value) readerRef.value.scrollTop = scrollPercent * Math.max(1, readerRef.value.scrollHeight - readerRef.value.clientHeight);
        }
    });

    watch(() => store.isFullEditMode, async (isFull) => {
        if(isFull) {
            const scrollPercent = readerRef.value.scrollTop / Math.max(1, readerRef.value.scrollHeight - readerRef.value.clientHeight);
            const range = getRenderRange();
            const absolutePos = range.start + ((range.end - range.start) * scrollPercent);
            const totalPercent = absolutePos / store.currentFileText.length;
            
            editContent.value = store.currentFileText; 
            await nextTick(); 
            if (editAreaRef.value) editAreaRef.value.scrollTop = totalPercent * Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
        } else {
            if (editAreaRef.value) {
                const totalPercent = editAreaRef.value.scrollTop / Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
                const absolutePos = totalPercent * store.currentFileText.length;
                let targetIdx = store.chaptersData.findIndex(ch => absolutePos >= ch.start && absolutePos < ch.end);
                if (targetIdx === -1) targetIdx = store.chaptersData.length - 1;
                
                const c = store.chaptersData[targetIdx];
                pendingScrollPercent.value = (absolutePos - c.start) / Math.max(1, c.end - c.start);
                
                store.currentChapterIndex = targetIdx;
                store.triggerJump = Date.now();
            }
        }
    });

    const saveEdit = async () => {
        if (!confirm("确定要保存修改并覆盖源文件吗？")) return;
        
        if (store.isFullEditMode) {
            store.currentFileText = editContent.value;
        } else {
            const range = getRenderRange();
            store.currentFileText = store.currentFileText.substring(0, range.start) + editContent.value + store.currentFileText.substring(range.end);
        }
        
        const originalTitle = store.bookTitle;
        store.bookTitle = "保存中...";
        
        await apiFetch('/api/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ path: store.currentBookPath, content: store.currentFileText }) });
        
        store.bookTitle = originalTitle;
        
        if (store.isFullEditMode && editAreaRef.value) {
            const totalPercent = editAreaRef.value.scrollTop / Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
            const absolutePos = totalPercent * store.currentFileText.length;
            let targetIdx = store.chaptersData.findIndex(ch => absolutePos >= ch.start && absolutePos < ch.end);
            if (targetIdx === -1) targetIdx = store.chaptersData.length - 1;
            const c = store.chaptersData[targetIdx];
            pendingScrollPercent.value = (absolutePos - c.start) / Math.max(1, c.end - c.start);
        } else {
            pendingScrollPercent.value = editAreaRef.value ? (editAreaRef.value.scrollTop / Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight)) : 0;
        }
        
        store.isEditMode = false; store.isFullEditMode = false;
        store.triggerParse = Date.now(); 
    }

    return { editContent, cancelEdit, saveEdit };
}