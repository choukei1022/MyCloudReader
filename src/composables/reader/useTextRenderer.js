/* 
 * 文件路径：src/composables/useTextRenderer.js
 * 主要作用：【逻辑外脑】纯文本排版与高亮计算引擎。
 * 包含功能：根据当前章节进度，截取对应的字符串，处理搜索关键词的 HTML 高亮插桩，处理卷/章合并渲染逻辑，最终输出可供 v-for 渲染的数组。
 */
import { computed } from 'vue';
import { store } from '../../store.js';

export function useTextRenderer() {
    const getBlockStartIdx = (idx) => {
        if (idx <= 0) return idx;
        const chap = store.chaptersData[idx];
        if (chap && !chap.isVolume && store.chaptersData[idx - 1]?.isVolume) return idx - 1;
        return idx;
    }

    const getRenderRange = () => {
        const c = store.chaptersData[store.currentChapterIndex];
        if (!c) return null;
        let startIdx = getBlockStartIdx(store.currentChapterIndex);
        let startChap = store.chaptersData[startIdx];
        let endChap = startChap;
        let isMerged = false;
        let mergedChapTitle = '';

        if (startChap.isVolume && startIdx + 1 < store.chaptersData.length && !store.chaptersData[startIdx + 1].isVolume) {
            endChap = store.chaptersData[startIdx + 1];
            isMerged = true;
            mergedChapTitle = endChap.title.trim();
        }
        return { start: startChap.start, end: endChap.end, isMerged, mergedChapTitle, startChapTitle: startChap.title.trim() };
    };

    const currentChapterTitle = computed(() => {
        if (!store.chaptersData || store.chaptersData.length === 0) return '全文展示';
        const range = getRenderRange();
        return range ? range.startChapTitle : '';
    });

    const parsedParagraphs = computed(() => {
        if (!store.currentFileText || store.chaptersData.length === 0) return [];
        const range = getRenderRange();
        if (!range || range.start > store.currentFileText.length) return [];
        
        let rawText = store.currentFileText.substring(range.start, range.end);

        if (store.searchHighlightOffset !== -1 && store.searchHighlightLength > 0) {
            const offset = store.searchHighlightOffset;
            const len = store.searchHighlightLength;
            if (offset >= 0 && offset + len <= rawText.length) {
                const before = rawText.substring(0, offset);
                const match = rawText.substring(offset, offset + len);
                const after = rawText.substring(offset + len);
                rawText = before + `_SEARCH_MARK_START_${match}_SEARCH_MARK_END_` + after;
            }
        }

        let paragraphs = rawText.split('\n').map(p => p.trim()).filter(p => p);
        if (store.tempReplaceRules && store.tempReplaceRules.length > 0) {
            paragraphs = paragraphs.map(p => {
                let res = p;
                store.tempReplaceRules.forEach(rule => { res = res.split(rule.f).join(rule.r); });
                return res;
            });
        }

        const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));
        const cTitle = range.startChapTitle;
        paragraphs = paragraphs.filter(p => p.replace(/_SEARCH_MARK_START_|_SEARCH_MARK_END_/g, '') !== cTitle);

        return paragraphs.map(p => {
            let cleanP = p.replace(/_SEARCH_MARK_START_|_SEARCH_MARK_END_/g, '');
            if (range.isMerged && cleanP === range.mergedChapTitle) {
                let html = escapeHTML(p).replace(/_SEARCH_MARK_START_/g, '<mark class="search-target">').replace(/_SEARCH_MARK_END_/g, '</mark>');
                return { html: `<div class="merged-chapter-title">${html}</div>`, isTitle: true };
            }
            let safeHtml = escapeHTML(p);
            if (p.includes('_SEARCH_MARK_START_')) {
                safeHtml = safeHtml.replace(/_SEARCH_MARK_START_/g, '<mark class="search-target">').replace(/_SEARCH_MARK_END_/g, '</mark>');
            }
            return { html: safeHtml, isTitle: false };
        });
    });

    return { getBlockStartIdx, getRenderRange, currentChapterTitle, parsedParagraphs };
}