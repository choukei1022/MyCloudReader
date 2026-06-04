import { ref } from 'vue';
import { store } from '../../store.js';
import { apiFetch } from '../../utils/request.js';

export function useReplace() {
    const repBatchText = ref('');
    const repScope = ref('temp');

    const doReplace = async () => {
        const batchText = repBatchText.value.trim();
        if(!batchText) return alert("请输入替换规则");
        if(!store.currentBookPath.endsWith('.txt')) return alert("仅 TXT 支持此操作");

        let rules = batchText.split('\n').map(line => {
            let parts = line.split(/[=＝]/); 
            return parts.length >= 2 ? { f: parts[0].trim(), r: parts.slice(1).join('=').trim() } : null;
        }).filter(r => r && r.f);
        if(rules.length === 0) return alert("格式不正确");

        if (repScope.value === 'temp') {
            store.tempReplaceRules = rules; 
            store.showReplaceModal = false; 
            return; 
        } 

        const applyRules = (text) => rules.reduce((res, rule) => res.split(rule.f).join(rule.r), text);

        let newText = repScope.value === 'chapter' 
            ? store.currentFileText.substring(0, store.chaptersData[store.currentChapterIndex].start) 
              + applyRules(store.currentFileText.substring(store.chaptersData[store.currentChapterIndex].start, store.chaptersData[store.currentChapterIndex].end)) 
              + store.currentFileText.substring(store.chaptersData[store.currentChapterIndex].end)
            : applyRules(store.currentFileText);
            
        store.showReplaceModal = false; 
        const originalTitle = store.bookTitle;
        store.bookTitle = "保存中...";
        
        await apiFetch('/api/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ path: store.currentBookPath, content: newText }) });
        store.currentFileText = newText; 
        store.bookTitle = originalTitle;
        store.triggerParse = Date.now(); 
    }

    return { repBatchText, repScope, doReplace };
}