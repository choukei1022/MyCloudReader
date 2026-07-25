/* 
 * 文件路径：src/composables/sidebar/useSidebarFiles.js
 * 主要作用：【逻辑外脑】侧边栏：网盘文件与上传引擎。
 * 包含功能：重命名、删除、新建分类、剪切/复制/粘贴、以及文件的批量上传。
 */
import { store } from '../../store.js';
import { apiFetch } from '../../utils/request.js';

export function useSidebarFiles(fetchFolder) {
    
    const doRename = async (node) => {
        let ext = ""; let baseName = node.name;
        if (node.type === 'file') { 
            const lastDotIdx = node.name.lastIndexOf('.'); 
            if (lastDotIdx !== -1) { ext = node.name.substring(lastDotIdx); baseName = node.name.substring(0, lastDotIdx); } 
        }
        let newBaseName = prompt(`重命名 [${baseName}]:`, baseName);
        if (!newBaseName || newBaseName === baseName) return; 
        
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
        const newPath = parentPath ? `${parentPath}/${newBaseName}${ext}` : `${newBaseName}${ext}`;
        
        try {
            const res = await apiFetch('/api/rename', { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'}, 
                body: JSON.stringify({ oldPath: node.path, newPath }) 
            });
            const data = await res.json();
            
            // 👑 修复点1：加入了严格的状态判断，成功则刷新，失败则大声报错！
            if (data.success) {
                fetchFolder(parentPath === node.path ? "" : parentPath);
                
                // 👑 修复点2：如果你改的恰好是现在正在看的这本书，顶部标题也会顺滑地跟着变！
                if (store.currentBookPath === node.path) {
                    store.currentBookPath = newPath;
                    store.bookTitle = newBaseName;
                }
            } else {
                alert(`重命名被服务器拒绝！\n原因: ${data.msg || '未知错误'}`);
            }
        } catch (e) {
            alert("网络或接口错误，重命名请求未送达！");
        }
    }

    const doDelete = async (node) => {
        if(!confirm(`永久删除 [${node.name}] 吗？`)) return;
        try {
            const res = await apiFetch('/api/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({path: node.path}) });
            if(store.currentPath.startsWith(node.path)) store.currentPath = "";
            const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));
            fetchFolder(parentPath === node.path ? "" : parentPath);
        } catch(e) {
            alert("删除失败！可能是权限不足。");
        }
    }

    const pasteClipboard = async () => {
        const targetDir = store.currentPath; 
        store.bookTitle = "处理中...";
        try {
            const res = await apiFetch(`/api/${store.clipboard.action}`, { 
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ source: store.clipboard.path, targetDir }) 
            });
            const data = await res.json();
            if (data.success) { 
                await fetchFolder(targetDir); 
                if (store.clipboard.action === 'move') {
                    const sourceParent = store.clipboard.path.substring(0, store.clipboard.path.lastIndexOf('/'));
                    if (sourceParent !== targetDir) fetchFolder(sourceParent === store.clipboard.path ? "" : sourceParent);
                }
                store.clipboard = null; 
            } else { 
                alert(`操作失败！\n原因: ${data.msg || '目录冲突或存在同名文件'}`); 
            }
        } catch (e) { 
            alert("请求失败"); 
        } finally { 
            // 恢复原来的标题
            store.bookTitle = store.currentBookPath ? store.currentBookPath.split('/').pop().replace(/\.(txt|pdf|docx)$/i, '') : "我的书库"; 
        }
    }

    const makeDir = async () => {
        const name = prompt(`将在 [${store.currentPath || '根目录'}] 下建分类:`);
        if(!name) return;
        const newPath = (store.currentPath ? store.currentPath + '/' : '') + name;
        try {
            await apiFetch('/api/mkdir', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ path: newPath }) });
            fetchFolder(store.currentPath); store.currentPath = newPath;
        } catch(e) { 
            alert("新建文件夹失败"); 
        }
    }

    const uploadFiles = async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData(); 
        formData.append('path', store.currentPath); 
        for(let f of files) { 
            if(/\.(txt|pdf|docx)$/i.test(f.name)) {
                const safePath = (f.webkitRelativePath || f.name).replace(/\//g, '___PATH_SEP___');
                formData.append('files', f, safePath); 
            } 
        }
        
        // 👑 核心修复1：重置 input 弹匣，允许你无限次重复点击、上传同一个文件！
        event.target.value = '';

        store.bookTitle = "上传中..."; 

        // 👑 核心修复2：给挂载 NAS 的底层 I/O 操作加上超时熔断器（60秒）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            // 将熔断信号传递给底层的 fetch
            const res = await apiFetch('/api/upload', { 
                method: 'POST', 
                body: formData,
                signal: controller.signal 
            }); 
            clearTimeout(timeoutId); // 如果顺利完成，取消熔断读秒

            if (!res.ok) throw new Error("上传被服务器拒绝");
            fetchFolder(store.currentPath); 
            
        } catch(e) { 
            if (e.name === 'AbortError') {
                alert("上传超时！可能是覆盖同名大文件时被 NAS 底层系统锁定，请稍后再试。");
            } else {
                alert("上传遇到网络错误，请重试！"); 
            }
        } finally { 
            // 无论成功还是被熔断拦截，最后必定将标题恢复为原样！
            store.bookTitle = store.currentBookPath ? store.currentBookPath.split('/').pop().replace(/\.(txt|pdf|docx)$/i, '') : "我的书库"; 
        }
    }

    return { doRename, doDelete, pasteClipboard, makeDir, uploadFiles };
}