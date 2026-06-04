/* src/composables/useSidebarFiles.js - 侧边栏：网盘文件与上传引擎 */
import { store } from '../../store.js';
import { apiFetch } from '../../utils/request.js';

// 传入 fetchFolder 以便在文件操作后刷新目录树
export function useSidebarFiles(fetchFolder) {
    const doRename = async (node) => {
        let ext = ""; let baseName = node.name;
        if (node.type === 'file') { 
            const lastDotIdx = node.name.lastIndexOf('.'); 
            if (lastDotIdx !== -1) { ext = node.name.substring(lastDotIdx); baseName = node.name.substring(0, lastDotIdx); } 
        }
        let newBaseName = prompt(`重命名:`, baseName);
        if (!newBaseName || newBaseName === baseName) return; 
        
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        const newPath = parentPath ? `${parentPath}/${newBaseName}${ext}` : `${newBaseName}${ext}`;
        
        const res = await apiFetch('/api/rename', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ oldPath: node.path, newPath }) });
        if ((await res.json()).success) fetchFolder(parentPath === node.path ? "" : parentPath);
    }

    const doDelete = async (node) => {
        if(!confirm(`永久删除 [${node.name}] 吗？`)) return;
        await apiFetch('/api/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({path: node.path}) });
        if(store.currentPath.startsWith(node.path)) store.currentPath = "";
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        fetchFolder(parentPath === node.path ? "" : parentPath);
    }

    const pasteClipboard = async () => {
        const targetDir = store.currentPath; 
        store.bookTitle = "处理中...";
        try {
            const res = await apiFetch(`/api/${store.clipboard.action}`, { 
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ source: store.clipboard.path, targetDir }) 
            });
            if ((await res.json()).success) { 
                await fetchFolder(targetDir); 
                if (store.clipboard.action === 'move') {
                    const sourceParent = store.clipboard.path.substring(0, store.clipboard.path.lastIndexOf('/'));
                    if (sourceParent !== targetDir) fetchFolder(sourceParent === store.clipboard.path ? "" : sourceParent);
                }
                store.clipboard = null; 
            } else { alert("操作失败"); }
        } catch (e) { alert("请求失败"); } finally { store.bookTitle = store.currentBookPath ? store.bookTitle : "云书架"; }
    }

    const makeDir = async () => {
        const name = prompt(`将在 [${store.currentPath || '根目录'}] 下建分类:`);
        if(!name) return;
        const newPath = (store.currentPath ? store.currentPath + '/' : '') + name;
        await apiFetch('/api/mkdir', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ path: newPath }) });
        fetchFolder(store.currentPath); store.currentPath = newPath;
    }

    const uploadFiles = async (files) => {
        const formData = new FormData(); 
        formData.append('path', store.currentPath); 
        for(let f of files) { 
            if(/\.(txt|pdf|docx)$/i.test(f.name)) {
                const safePath = (f.webkitRelativePath || f.name).replace(/\//g, '___PATH_SEP___');
                formData.append('files', f, safePath); 
            } 
        }
        store.bookTitle = "上传中..."; 
        await apiFetch('/api/upload', { method: 'POST', body: formData }); 
        fetchFolder(store.currentPath); 
        store.bookTitle = store.currentBookPath ? store.bookTitle : "上传成功";
    }

    return { doRename, doDelete, pasteClipboard, makeDir, uploadFiles };
}