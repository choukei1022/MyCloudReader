/* 
 * 文件路径：src/composables/reader/useEditEngine.js
 * 主要作用：【逻辑外脑】编辑模式与正文的双向同步引擎。
 * 包含功能：利用“绝对行数百分比”算法，精准同步“阅读视图”和“全书编辑视图”的光标位置，彻底解决长文本的视觉扭曲问题。
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
            // 1. 获取当前阅读区所在的章节起点和当前百分比
            const scrollPercent = readerRef.value.scrollTop / Math.max(1, readerRef.value.scrollHeight - readerRef.value.clientHeight);
            const range = getRenderRange();
            const absolutePos = range.start + ((range.end - range.start) * scrollPercent);
            
            // 👑 终极同步算法：抛弃字符百分比，改用“绝对行数百分比”
            const textBefore = store.currentFileText.substring(0, absolutePos);
            const linesBefore = (textBefore.match(/\n/g) || []).length;
            const totalLines = (store.currentFileText.match(/\n/g) || []).length || 1;
            const linePercent = linesBefore / totalLines;
            
            editContent.value = store.currentFileText; 
            await nextTick(); 
            if (editAreaRef.value) {
                editAreaRef.value.scrollTop = linePercent * Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
            }
        } else {
            if (editAreaRef.value) {
                // 1. 获取全书编辑区的滚动行数百分比
                const scrollPercent = editAreaRef.value.scrollTop / Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
                
                // 👑 逆向计算：根据行数百分比，推算出真实的绝对字符位置
                const totalLines = (store.currentFileText.match(/\n/g) || []).length || 1;
                const targetLine = Math.floor(scrollPercent * totalLines);
                
                let absolutePos = 0;
                const linesArr = store.currentFileText.split('\n');
                for (let i = 0; i < targetLine && i < linesArr.length; i++) {
                    absolutePos += linesArr[i].length + 1; // 补偿被 split 吃掉的回车符
                }
                
                // 2. 将计算出的真实字符位置映射回章节进度
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
            // 保存时也使用行数算法进行精准定位还原
            const scrollPercent = editAreaRef.value.scrollTop / Math.max(1, editAreaRef.value.scrollHeight - editAreaRef.value.clientHeight);
            const totalLines = (store.currentFileText.match(/\n/g) || []).length || 1;
            const targetLine = Math.floor(scrollPercent * totalLines);
            
            let absolutePos = 0;
            const linesArr = store.currentFileText.split('\n');
            for (let i = 0; i < targetLine && i < linesArr.length; i++) {
                absolutePos += linesArr[i].length + 1; 
            }
            
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