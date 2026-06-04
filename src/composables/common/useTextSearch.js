import { ref } from 'vue';
import { store } from '../../store.js';

export function useTextSearch() {
    const gsInput = ref('');
    const gsResults = ref([]);
    const isSearching = ref(false);

    const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));

    const doGlobalSearch = () => {
        const keyword = gsInput.value.trim();
        if(!keyword) return;
        isSearching.value = true; gsResults.value = [];
        
        setTimeout(() => {
            const results = []; const textLen = store.currentFileText.length;
            let matchIdx = store.currentFileText.indexOf(keyword, 0);
            
            while(matchIdx !== -1 && results.length < 2000) {
                let startCtx = Math.max(0, matchIdx - 25), endCtx = Math.min(textLen, matchIdx + keyword.length + 25);
                let beforeStr = store.currentFileText.substring(startCtx, matchIdx).replace(/\n/g, ' ');
                let targetStr = store.currentFileText.substring(matchIdx, matchIdx + keyword.length).replace(/\n/g, ' ');
                let afterStr = store.currentFileText.substring(matchIdx + keyword.length, endCtx).replace(/\n/g, ' ');

                let highlighted = escapeHTML(beforeStr) + `<span style="color:var(--primary);font-weight:bold;">${escapeHTML(targetStr)}</span>` + escapeHTML(afterStr);
                let chapIdx = store.chaptersData.findIndex(c => matchIdx >= c.start && matchIdx < c.end);
                if(chapIdx === -1) chapIdx = store.chaptersData.length - 1;
                
                results.push({ 
                    html: (startCtx > 0 ? "..." : "") + highlighted + (endCtx < textLen ? "..." : ""), 
                    percent: ((matchIdx / textLen) * 100).toFixed(1), 
                    chapIdx, 
                    localOffset: matchIdx - store.chaptersData[chapIdx].start, 
                    matchLen: keyword.length 
                });
                matchIdx = store.currentFileText.indexOf(keyword, matchIdx + keyword.length);
            }
            gsResults.value = results; isSearching.value = false;
        }, 50);
    }

    const jumpToSearchResult = (res) => {
        store.searchHighlightOffset = res.localOffset; 
        store.searchHighlightLength = res.matchLen;
        store.searchKeyword = gsInput.value.trim();
        store.showGlobalSearch = false;
        store.currentChapterIndex = res.chapIdx;
        store.triggerJump = Date.now(); 
    }

    return { gsInput, gsResults, isSearching, doGlobalSearch, jumpToSearchResult };
}