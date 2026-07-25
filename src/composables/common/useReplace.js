/* 
 * 文件路径：src/composables/common/useReplace.js
 * 主要作用：【逻辑外脑】全局批量文本替换引擎。
 * 包含功能：支持临时/单章/全书替换，防屏蔽词，完美保留替换目标前后的空格，精准过滤 Windows 回车符。
 */
import { ref } from 'vue';
import { store } from '../../store.js';
import { apiFetch } from '../../utils/request.js';

export function useReplace() {
    const repBatchText = ref('');
    const repScope = ref('temp');

    const doReplace = async () => {
        // 👑 修复1：不再 trim 整个文本框，保护最后一行末尾的空格！
        const batchText = repBatchText.value;
        if(!batchText.trim()) return alert("请输入替换规则");
        if(!store.currentBookPath.endsWith('.txt')) return alert("仅 TXT 支持此操作");

        let rules = batchText.split('\n').map(line => {
            // 👑 修复2：只精准杀掉 Windows 带来的 \r，绝不碰你的空格！
            let safeLine = line.replace(/\r$/, '');
            let parts = safeLine.split(/[=＝]/); 
            
            // 👑 修复3：左边(查找词)保留 trim() 防手抖，右边(替换词)全盘保留，不准吃空格！
            return parts.length >= 2 ? { f: parts[0].trim(), r: parts.slice(1).join('=') } : null;
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
        
        try {
            await apiFetch('/api/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ path: store.currentBookPath, content: newText }) });
            store.currentFileText = newText; 
            store.triggerParse = Date.now(); 
        } catch (e) {
            alert("替换保存失败，请检查网络！");
        } finally {
            store.bookTitle = originalTitle;
        }
    }

    return { repBatchText, repScope, doReplace };
}