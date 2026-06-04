/* 
 * 文件路径：src/composables/useSidebarTree.js
 * 主要作用：【逻辑外脑】专门负责侧边栏“文件树”的核心计算与操作。
 * 包含功能：向后端请求文件夹数据、递归展平多层级目录、处理节点点击（展开/折叠/打开书籍）、以及智能定位当前阅读书籍在文件树中的位置。
 */
import { ref, computed, nextTick, watch } from 'vue'
import { store, apiFetch } from '../../store.js'

export function useSidebarTree(scrollContainerRef) {
    const folderCache = ref({}); 
    const isLoadingFolder = ref(false);

    const fetchFolder = async (dirPath) => {
        isLoadingFolder.value = true;
        try {
            const res = await apiFetch(`/api/tree?dir=${encodeURIComponent(dirPath)}`);
            folderCache.value[dirPath] = await res.json();
        } catch (e) { } finally { isLoadingFolder.value = false; }
    }

    const visibleFileTree = computed(() => {
        const result = [];
        const traverse = (dirPath, level) => {
            const items = folderCache.value[dirPath] || [];
            for (const item of items) {
                result.push({ ...item, level });
                if (item.type === 'folder' && store.openFolders.has(item.path)) traverse(item.path, level + 1);
            }
        };
        traverse('', 0); return result;
    });

    const clickRootFolder = () => { store.currentPath = ''; store.currentBookPath = ''; fetchFolder(''); }

    const clickTreeNode = (node) => {
        if (node.type === 'folder') {
            store.currentPath = node.path;
            if (store.openFolders.has(node.path)) store.openFolders.delete(node.path); 
            else { store.openFolders.add(node.path); if (!folderCache.value[node.path]) fetchFolder(node.path); }
        } else {
            store.currentPath = node.path.substring(0, node.path.lastIndexOf('/'));
            if (store.currentBookPath !== node.path) { store.currentBookPath = node.path; store.triggerParse = Date.now(); }
            if (window.innerWidth < 768) store.isSidebarHidden = true; 
        }
    }
    
    const displayPath = computed(() => store.currentPath ? store.currentPath : '根目录');

    const locateCurrentBook = async () => {
        if (!store.currentBookPath) return;
        const parts = store.currentBookPath.split('/'); let pathAcc = "";
        if (!folderCache.value['']) await fetchFolder('');
        for (let i = 0; i < parts.length - 1; i++) {
            pathAcc = pathAcc ? pathAcc + '/' + parts[i] : parts[i];
            store.openFolders.add(pathAcc);
            if (!folderCache.value[pathAcc]) await fetchFolder(pathAcc);
        }
        await nextTick();
        setTimeout(() => {
            if (scrollContainerRef && scrollContainerRef.value) {
                const activeNode = scrollContainerRef.value.querySelector('.item-row.reading-active');
                if (activeNode) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    watch(() => store.currentTab, async (newTab) => {
        if (newTab === 'files') {
            if (store.currentBookPath) await locateCurrentBook();
            else if (!folderCache.value['']) fetchFolder('');
        }
    }, { immediate: true });

    watch(() => store.userToken, (token) => { if (token) fetchFolder(''); }, { immediate: true });

    return { folderCache, isLoadingFolder, fetchFolder, visibleFileTree, clickRootFolder, clickTreeNode, displayPath };
}