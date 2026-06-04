/* 
 * 文件路径：src/composables/useSidebarSearch.js
 * 主要作用：【逻辑外脑】专门负责侧边栏顶部的“搜索文件/搜索全文”功能。
 * 包含功能：处理单选框状态、调用后端普通搜索或全文检索接口、用正则高亮返回的关键字、以及点击搜索结果后的智能跳转与跨书定位。
 */
import { ref } from 'vue'
import { store, apiFetch } from '../../store.js'

export function useSidebarSearch(fetchFolder, folderCache, clickTreeNode) {
    const searchMode = ref('name'); 
    const fileSearchKeyword = ref('');
    const isShowingFileSearch = ref(false); 
    const isSearching = ref(false); 
    const fileSearchResults = ref([]);
    
    const clearFileSearch = () => { fileSearchKeyword.value = ''; isShowingFileSearch.value = false; }

    const triggerSearch = async () => {
        if (!fileSearchKeyword.value.trim()) { clearFileSearch(); return; }
        isShowingFileSearch.value = true; isSearching.value = true;
        try {
            const keyword = fileSearchKeyword.value.trim();
            const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));

            if (searchMode.value === 'name') {
                const res = await apiFetch(`/api/search?q=${encodeURIComponent(keyword)}`);
                fileSearchResults.value = (await res.json()).map(item => {
                    item.highlightedName = escapeHTML(item.name).replace(regex, match => `<span style="color:var(--primary);font-weight:bold;">${match}</span>`);
                    item.parentDir = item.path.substring(0, item.path.lastIndexOf('/')); return item;
                });
            } else {
                const res = await apiFetch(`/api/search-fulltext?q=${encodeURIComponent(keyword)}`);
                fileSearchResults.value = (await res.json()).map(item => {
                    const escapedCtx = (item.context.indexOf(keyword) > 0 ? "..." : "") + escapeHTML(item.context) + "...";
                    item.highlightedContext = escapedCtx.replace(regex, match => `<span style="color:var(--primary);font-weight:bold;">${match}</span>`);
                    return item;
                });
            }
        } catch (e) { fileSearchResults.value = []; } finally { isSearching.value = false; }
    }

    const selectSearchResult = async (item) => {
        const safeKeyword = fileSearchKeyword.value.trim(); clearFileSearch(); 
        if (searchMode.value === 'name') {
            const parts = item.path.split('/'); let pathAcc = "";
            for (let i = 0; i < parts.length - 1; i++) {
                pathAcc = pathAcc ? pathAcc + '/' + parts[i] : parts[i];
                store.openFolders.add(pathAcc);
                if (!folderCache.value[pathAcc]) await fetchFolder(pathAcc);
            }
            clickTreeNode(item); 
        } else {
            store.pendingCrossBookOffset = item.absoluteOffset; store.pendingCrossBookKeyword = safeKeyword;
            if (store.currentBookPath === item.path) { store.triggerParse = Date.now(); if (window.innerWidth < 768) store.isSidebarHidden = true; } 
            else { clickTreeNode({ type: 'file', path: item.path, name: item.bookName }); }
        }
    }

    return { searchMode, fileSearchKeyword, isShowingFileSearch, isSearching, fileSearchResults, clearFileSearch, triggerSearch, selectSearchResult };
}