/* 
 * 文件路径：src/composables/usePdfEngine.js
 * 主要作用：【逻辑外脑】PDF 高清异步渲染引擎。
 * 包含功能：拉取 PDF 源文件，挂载 IntersectionObserver 实现滚动按需渲染（懒加载），计算 Canvas 高清缩放比例。
 */
import { shallowRef, onUnmounted } from 'vue';
import { store } from '../../store.js';

export function usePdfEngine(readerRef, pdfViewRef, scheduleSaveProgress) {
    const nonReactivePdfDoc = shallowRef(null);
    
    async function renderPdfPage(num, wrapper) {
        wrapper.setAttribute('data-rendered', 'true');
        const page = await nonReactivePdfDoc.value.getPage(num);
        const containerWidth = readerRef.value.clientWidth - 40; 
        let scale = Math.max(1, Math.min(2.5, containerWidth / page.getViewport({scale: 1}).width)); 
        const viewport = page.getViewport({scale: scale});
        const canvas = wrapper.querySelector('canvas'); 
        const ctx = canvas.getContext('2d');
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale); 
        canvas.height = Math.floor(viewport.height * outputScale); 
        canvas.style.width = Math.floor(viewport.width) + "px";
        await page.render({ canvasContext: ctx, transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null, viewport: viewport }).promise;
        wrapper.style.minHeight = 'auto'; wrapper.querySelector('span').style.display = 'none'; canvas.style.display = 'block';
    }

    async function loadPDF(path) {
        pdfViewRef.value.innerHTML = '<div class="empty-hint">正在拉取高质量 PDF 资源...</div>';
        try {
            const loadingTask = window.pdfjsLib?.getDocument({ url: `/api/book?path=${encodeURIComponent(path)}`, httpHeaders: { 'Authorization': store.userToken } });
            nonReactivePdfDoc.value = await loadingTask.promise;
            window.pdfDocGlobal = nonReactivePdfDoc.value; 
            store.bookTitle = path.split('/').pop().replace('.pdf','');
            pdfViewRef.value.innerHTML = '';
            store.pdfOutlineData = await nonReactivePdfDoc.value.getOutline() || [];

            if (window.pdfObserver) window.pdfObserver.disconnect();
            window.pdfObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const pageNum = parseInt(entry.target.getAttribute('data-page-num'));
                        if (!entry.target.getAttribute('data-rendered')) renderPdfPage(pageNum, entry.target);
                        if (entry.intersectionRatio > 0.1) { store.pdfPageNum = pageNum; scheduleSaveProgress(); }
                    }
                });
            }, { root: readerRef.value, rootMargin: '800px 0px' }); 

            for (let i = 1; i <= nonReactivePdfDoc.value.numPages; i++) {
                const wrapper = document.createElement('div'); wrapper.className = 'pdf-page-wrapper'; wrapper.setAttribute('data-page-num', i);
                wrapper.style.cssText = 'flex-shrink:0; width:100%; max-width:1000px; min-height:800px; margin-bottom:20px; display:flex; justify-content:center; align-items:center; background:rgba(0,0,0,0.02); border-radius:8px;';
                const canvas = document.createElement('canvas'); canvas.style.cssText = 'max-width:100%; height:auto; border-radius:8px; display:none; box-shadow:0 4px 15px rgba(0,0,0,0.1);';
                const loadingText = document.createElement('span'); loadingText.style.color = '#999'; loadingText.innerText = `第 ${i} 页 加载中...`;
                wrapper.appendChild(loadingText); wrapper.appendChild(canvas); pdfViewRef.value.appendChild(wrapper);
                window.pdfObserver.observe(wrapper);
            }
        } catch(e) { pdfViewRef.value.innerHTML = '<div style="color:red;">PDF 解析失败</div>'; }
    }

    onUnmounted(() => { if (window.pdfObserver) window.pdfObserver.disconnect(); })

    return { nonReactivePdfDoc, loadPDF };
}