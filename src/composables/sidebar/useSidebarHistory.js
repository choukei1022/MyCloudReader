/* src/composables/useSidebarHistory.js - 侧边栏：阅读历史管理引擎 */
import { ref } from 'vue';
import { store } from '../../store.js';
import { apiFetch } from '../../utils/request.js';

export function useSidebarHistory() {
    const historyList = ref([]);
    const isLoadingHistory = ref(false);

    const loadHistory = async () => {
        isLoadingHistory.value = true;
        try {
            const res = await apiFetch(`/api/history?_t=${Date.now()}`);
            historyList.value = await res.json();
        } catch(e) { } 
        finally { isLoadingHistory.value = false; }
    }

    const deleteHistory = async (path) => {
        if (!confirm("确定要从历史记录中移除吗？")) return;
        try {
            await apiFetch('/api/history/delete', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ path }) 
            });
            historyList.value = historyList.value.filter(item => item.path !== path);
        } catch(err) { alert("移除失败！"); }
    }

    const jumpToHistory = (item) => {
        store.currentBookPath = item.path;
        store.triggerParse = Date.now(); 
        if (window.innerWidth < 768) store.isSidebarHidden = true;
    }

    return { historyList, isLoadingHistory, loadHistory, deleteHistory, jumpToHistory };
}