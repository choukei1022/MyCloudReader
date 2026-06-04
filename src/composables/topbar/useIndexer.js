/* src/composables/useIndexer.js - 后台建库与轮询引擎 */
import { ref, onMounted, onUnmounted } from 'vue';
import { apiFetch } from '../../utils/request.js';

export function useIndexer() {
    const indexStatus = ref({ isRunning: false, isPaused: false, current: 0, total: 0, currentBook: '', indexedCount: 0 });
    let indexTimer = null;

    const checkIndexProgress = async () => {
        try {
            const res = await apiFetch('/api/index-progress');
            indexStatus.value = await res.json();
            if (indexStatus.value.isRunning) {
                if (!indexTimer) indexTimer = setInterval(checkIndexProgress, 1000); 
            } else {
                if (indexTimer) { clearInterval(indexTimer); indexTimer = null; }
            }
        } catch(e) {}
    }

    const buildIndex = async () => {
        if(!confirm("根据书籍数量，这可能需要几分钟。此操作在后台进行，不影响阅读。是否开始构建全文索引？")) return;
        try { 
            await apiFetch('/api/build-index', { method: 'POST' }); 
            checkIndexProgress(); 
        } catch (e) { alert("启动失败"); }
    }

    const toggleIndexPause = async () => {
        try { 
            const res = await apiFetch('/api/toggle-index-pause', { method: 'POST' }); 
            const data = await res.json(); 
            indexStatus.value.isPaused = data.isPaused; 
            checkIndexProgress(); 
        } catch (e) { alert("操作失败"); }
    }

    onMounted(() => { checkIndexProgress(); });
    onUnmounted(() => { if(indexTimer) clearInterval(indexTimer); });

    return { indexStatus, buildIndex, toggleIndexPause, checkIndexProgress };
}