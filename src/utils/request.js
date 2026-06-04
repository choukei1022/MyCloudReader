/* src/utils/request.js - 纯净的全局网络请求封装 */
export const apiFetch = async (url, options = {}) => {
    // 直接从本地读取 Token，解除与 store.js 的强耦合
    const token = localStorage.getItem('reader_token');
    
    if (!options.headers) options.headers = {};
    if (token) options.headers['Authorization'] = token;
    
    const res = await fetch(url, options);
    
    // 全局 401 拦截
    if (res.status === 401) { 
        localStorage.removeItem('reader_token'); 
        window.location.reload(); // 强制刷新回登录页
        throw new Error("Unauthorized"); 
    }
    return res;
};