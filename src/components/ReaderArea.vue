<!-- 
 * 文件路径：src/components/ReaderArea.vue
 * 主要作用：【视图总装车间】阅读器的核心渲染区。
 * 包含功能：不包含任何重度计算，只负责 HTML 模板骨架，并统一调度解析外脑、排版外脑、PDF外脑和编辑外脑。
-->
<template>
  <div id="vue-reader" class="reader-container" ref="readerRef" @scroll="onReaderScroll" @click="handleReaderClick">
      
      <!-- 👑 修复 1：增加 !isWordView 保护原有的 TXT 渲染区不被污染 -->
      <div id="content" class="content-wrapper" v-show="!store.isEditMode && !store.isFullEditMode && !isPdfView && !isWordView">
          <div v-if="!store.currentBookPath" class="welcome-box">
              <h2>重构完成！</h2>
              <p>Vue 3 现代化模块引擎已成功组装。告别巨石代码，拥抱纯净渲染。</p>
          </div>

          <template v-else>
              <div v-if="parsedParagraphs.length > 0">
                  <h2 class="chapter-title">{{ currentChapterTitle }}</h2>
                  <template v-for="(p, index) in parsedParagraphs" :key="index">
                      <div v-if="p.isTitle" v-html="p.html"></div>
                      <p v-else v-html="p.html"></p>
                  </template>
              </div>
              
              <div v-else class="volume-cover-page">
                  <div class="volume-cover-inner">
                      <h2 class="volume-title-large">{{ currentChapterTitle }}</h2>
                      <div class="volume-decoration"></div>
                  </div>
              </div>
              
              <div class="chapter-nav" v-if="store.chaptersData.length > 1">
                  <button class="nav-prev" @click.stop="goPrevChapter">上一章</button>
                  <button class="nav-next" @click.stop="goNextChapter">下一章</button>
              </div>
              <div v-else style="height: 50px;"></div>
          </template>
      </div>

      <!-- 👑 修复 2：新增 Word 专属响应式渲染舱！ -->
      <div id="word-view" class="content-wrapper word-view" v-show="!store.isEditMode && !store.isFullEditMode && isWordView" v-html="wordHtmlContent"></div>
      
      <textarea id="edit-area" ref="editAreaRef" class="edit-area" v-model="editContent" v-show="store.isEditMode || store.isFullEditMode" @click.stop></textarea>
      <div class="edit-controls" v-show="store.isEditMode || store.isFullEditMode" @click.stop>
          <button class="header-btn" @click="cancelEdit">取消修改</button>
          <button class="header-btn primary" @click="saveEdit">💾 保存修改</button>
      </div>
      
      <div id="pdf-view" class="pdf-view" ref="pdfViewRef" v-show="isPdfView"></div>
      
      <button class="back-to-top-btn" v-show="store.isToolbarShow && !store.isEditMode && !store.isFullEditMode && store.config.showBackToTop" @click.stop="scrollToTop">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
      </button>
  </div>
</template>

<script setup>
// 👇 加上这行救命的代码！
import { ref, watch, nextTick } from 'vue'

import { store, apiFetch } from '../store.js'

// 👑 引入阅读器外脑 (注意咱们之前改过的 reader 路径)
import { useBookParser } from '../composables/reader/useBookParser.js'
import { useReaderProgress } from '../composables/reader/useReaderProgress.js'
import { useTextRenderer } from '../composables/reader/useTextRenderer.js'
import { usePdfEngine } from '../composables/reader/usePdfEngine.js'
import { useEditEngine } from '../composables/reader/useEditEngine.js'

// --- 基础 DOM 引用与状态 ---
const readerRef = ref(null)
const editAreaRef = ref(null)
const pdfViewRef = ref(null)

const isPdfView = ref(false)
const isWordView = ref(false)       // 👑 新增：标识当前是否为 Word 视图
const wordHtmlContent = ref('')     // 👑 新增：存放 Word 转换出来的 HTML
const pendingScrollPercent = ref(0)

// --- 挂载引擎 ---
const { getBlockStartIdx, getRenderRange, currentChapterTitle, parsedParagraphs } = useTextRenderer();
const { nonReactivePdfDoc, loadPDF } = usePdfEngine(readerRef, pdfViewRef, () => scheduleSaveProgress());
const { scheduleSaveProgress } = useReaderProgress(readerRef, nonReactivePdfDoc);
const { parseTxtChapters } = useBookParser();
const { editContent, cancelEdit, saveEdit } = useEditEngine(readerRef, editAreaRef, pendingScrollPercent, getRenderRange);

// --- 交互控制调度中心 ---
let lastScrollTop = 0;

const goPrevChapter = () => {
    let currentBlockStart = getBlockStartIdx(store.currentChapterIndex);
    let targetIdx = currentBlockStart - 1;
    if (targetIdx >= 0) targetIdx = getBlockStartIdx(targetIdx);
    store.navigateChapter(targetIdx - store.currentChapterIndex);
};

const goNextChapter = () => {
    let currentBlockStart = getBlockStartIdx(store.currentChapterIndex);
    let currentBlockEnd = currentBlockStart;
    if (store.chaptersData[currentBlockStart]?.isVolume && currentBlockStart + 1 < store.chaptersData.length && !store.chaptersData[currentBlockStart + 1].isVolume) {
        currentBlockEnd = currentBlockStart + 1;
    }
    let targetIdx = currentBlockEnd + 1;
    store.navigateChapter(targetIdx - store.currentChapterIndex);
};

const onReaderScroll = (e) => {
    scheduleSaveProgress();
    if (Date.now() < store.settingChangeLock) return;
    const currentScrollTop = e.target.scrollTop;
    if (Math.abs(currentScrollTop - lastScrollTop) > 5) store.showSettingsPanel = false;
    lastScrollTop = currentScrollTop;
}

const handleReaderClick = (e) => {
    // 💥 暴力破解 1：彻底干掉 window.getSelection() 的拦截判定！
    // 狐猴/Via 等浏览器在点击时必定产生幽灵光标，导致死锁。我们现在全部放行！

    store.searchHighlightOffset = -1; 
    store.searchKeyword = '';
    
    if(store.isEditMode || store.isFullEditMode) return;
    store.showSettingsPanel = false;
    
    const isButton = e.target.closest('button');
    const isInteractive = e.target.closest('textarea') || e.target.closest('input') || e.target.closest('.edit-controls');

    // 只要不是点在按钮或输入框上，点击屏幕任何空白处都统统生效！
    if (!isButton && !isInteractive) {
        if (window.innerWidth >= 768) {
            // 💻 PC端：固定顶栏，点击正文唤出左侧目录
            if (store.isSidebarHidden) store.isSidebarHidden = false;
            if (!isPdfView.value) store.currentTab = 'chapters';
        } else {
            // 📱 手机端：纯粹地切换顶部工具栏的显示与隐藏！
            store.isToolbarShow = !store.isToolbarShow;
            
            // 💥 暴力破解 2：强行清理底层焦点和幽灵选区
            // 防止某些安卓输入法键盘或残留光标卡死整个页面
            if (document.activeElement) document.activeElement.blur();
            const sel = window.getSelection ? window.getSelection() : null;
            if (sel) sel.removeAllRanges();
        }
    }
}

const scrollToTop = () => { if (readerRef.value) readerRef.value.scrollTo({ top: 0, behavior: 'smooth' }); }

// --- 文档路由分发中心 ---
watch(() => store.triggerParse, async () => { if (store.currentBookPath) await loadBook(store.currentBookPath); });
watch(() => store.currentChapterIndex, () => {
    if (window.isTradMode && window.toggleSimpTrad) window.toggleSimpTrad(); 
    store.langBtnText = '繁'; 
});

watch(() => store.triggerJump, async () => {
    if(store.chaptersData.length > 0 && !isPdfView.value) {
        await nextTick(); 
        if (store.searchHighlightOffset !== -1) {
            setTimeout(() => {
                const mark = readerRef.value?.querySelector('.search-target');
                if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        } else if (pendingScrollPercent.value > 0) {
            const maxScroll = Math.max(1, readerRef.value.scrollHeight - readerRef.value.clientHeight);
            readerRef.value.scrollTop = maxScroll * pendingScrollPercent.value;
            pendingScrollPercent.value = 0;
        } else {
            readerRef.value.scrollTop = store.jumpDirection === -1 ? readerRef.value.scrollHeight : 0;
        }
        store.jumpDirection = 1;
    }
});

async function loadBook(path) {
    store.isEditMode = false; store.isFullEditMode = false; store.showSettingsPanel = false;
    if (window.isTradMode && window.toggleSimpTrad) window.toggleSimpTrad();
    store.langBtnText = '繁';

    const nameLower = path.toLowerCase();
    const currentReqPath = path; 
    store.bookTitle = "加载中..."; store.bookFormatHint = '';
    
    // PDF 处理
    if (nameLower.endsWith('.pdf')) {
        isPdfView.value = true;
        isWordView.value = false; // 👑 状态重置
        store.currentTab = 'files';
        await loadPDF(path); return;
    }
    
    // Word 处理
    if (nameLower.endsWith('.docx')) {
        isPdfView.value = false;
        isWordView.value = true; // 👑 激活 Word 视图
        store.currentTab = 'chapters';
        try {
            const res = await apiFetch(`/api/book?path=${encodeURIComponent(path)}`);
            const arrayBuffer = await res.arrayBuffer();
            if (currentReqPath !== store.currentBookPath) return; 
            
            if (!window.mammoth) throw new Error("缺少 Mammoth 引擎");
            const result = await window.mammoth.convertToHtml({arrayBuffer: arrayBuffer});
            
            let tempArr = []; let headingCount = 0;
            const tempDiv = document.createElement('div'); tempDiv.innerHTML = result.value;
            tempDiv.childNodes.forEach(node => {
                if (node.nodeName.match(/^H[1-6]$/i)) {
                    let hId = `docx-h-${headingCount}`; node.id = hId;
                    tempArr.push({ title: node.innerText, id: hId, level: node.nodeName.substring(1) });
                    headingCount++;
                }
            });
            store.chaptersData = tempArr;
            
            // 👑 绝杀：摒弃危险的 DOM 操作，直接赋值给 Vue 响应式变量！
            wordHtmlContent.value = tempDiv.innerHTML;
            
            if(readerRef.value) readerRef.value.scrollTop = 0; 
            store.bookTitle = path.split('/').pop().replace('.docx','');
            store.bookFormatHint = '[Word]';
        } catch(e) { console.error("Word 解析失败"); }
        return;
    }

    // TXT 处理
    isPdfView.value = false; 
    isWordView.value = false; // 👑 状态重置
    store.currentTab = 'chapters';
    try {
        const res = await apiFetch(`/api/book?path=${encodeURIComponent(path)}`);
        const buffer = await res.arrayBuffer();
        if (currentReqPath !== store.currentBookPath) return; 
        
        const byteArr = new Uint8Array(buffer);
        const isU8 = (() => { let i=0; while(i<byteArr.length){ if(byteArr[i]<=0x7F)i++; else if(byteArr[i]>=0xC2&&byteArr[i]<=0xDF){if(i+1<byteArr.length&&byteArr[i+1]>=0x80&&byteArr[i+1]<=0xBF)i+=2;else return false;} else if(byteArr[i]>=0xE0&&byteArr[i]<=0xEF){if(i+2<byteArr.length&&byteArr[i+1]>=0x80&&byteArr[i+1]<=0xBF&&byteArr[i+2]>=0x80&&byteArr[i+2]<=0xBF)i+=3;else return false;} else if(byteArr[i]>=0xF0&&byteArr[i]<=0xF4){if(i+3<byteArr.length&&byteArr[i+1]>=0x80&&byteArr[i+1]<=0xBF&&byteArr[i+2]>=0x80&&byteArr[i+2]<=0xBF&&byteArr[i+3]>=0x80&&byteArr[i+3]<=0xBF)i+=4;else return false;} else return false;} return true;})();
        
        let fetchedText = isU8 ? new TextDecoder('utf-8').decode(buffer) : new TextDecoder('gbk').decode(buffer);
        let targetIdx = 0; pendingScrollPercent.value = 0;
        
        if (store.pendingCrossBookOffset === -1) {
            try {
                const pRes = await apiFetch(`/api/progress?path=${encodeURIComponent(path)}&_t=${Date.now()}`);
                const pData = await pRes.json();
                if (currentReqPath !== store.currentBookPath) return; 
                if (pData.success && pData.data) { 
                    if (confirm(`发现云端书签：[ ${pData.data.title} ]\n是否跳转？`)) {
                        targetIdx = parseInt(pData.data.chapterIndex) || 0; 
                        pendingScrollPercent.value = parseFloat(pData.data.scroll) || 0; 
                    }
                }
            } catch(e) {}
        }
        
        store.currentFileText = fetchedText;
        store.bookTitle = path.split('/').pop().replace('.txt','');
        store.bookFormatHint = `[${isU8?'UTF-8':'GBK'}]`;

        parseTxtChapters(targetIdx); 
        
    } catch (err) {
        console.error("加载TXT书籍失败:", err); store.bookTitle = "读取失败"; store.bookFormatHint = "[ERROR]";
    }
}
</script>

<style scoped>
/* CSS 保持不变 */
.reader-container { width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden; background: transparent; }
.content-wrapper { width: 100%; max-width: var(--content-w, 800px); margin: 0 auto; box-sizing: border-box; padding: 0 20px; font-family: var(--reader-font, sans-serif); font-size: var(--font-size, 18px); line-height: var(--line-height, 2.2); color: var(--text); }
.welcome-box { text-align: center; margin-top: 50px; color: var(--text-muted); }
.content-wrapper p { margin-bottom: var(--para-space, 1.2em); line-height: inherit; text-indent: 2em; }
.chapter-title { text-align: center; font-size: 1.5em; font-weight: bold; margin-top: 30px; margin-bottom: 30px; color: var(--text); text-indent: 0; }
/* 👑 防止 Word 里的图片撑爆手机屏幕 */
:deep(.word-view img) { max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
:deep(.merged-chapter-title) { text-align: center; font-size: 1.25em; font-weight: bold; color: var(--primary); margin: 50px 0 30px 0; text-indent: 0; position: relative; }
:deep(.merged-chapter-title::after) { content: ""; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); width: 40px; height: 2px; background: var(--border-light); }
.volume-cover-page { display: flex; align-items: center; justify-content: center; min-height: 40vh; margin: 40px 0; user-select: none; }
.volume-cover-inner { text-align: center; animation: fadeIn 0.5s ease-in-out; }
.volume-title-large { font-size: 2em; font-weight: bold; color: var(--text); margin-bottom: 20px; letter-spacing: 2px; }
.volume-decoration { width: 60px; height: 4px; background-color: var(--primary); margin: 0 auto; border-radius: 2px; opacity: 0.6; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
:deep(.search-target) { background: #e11d48; color: #fff; border-radius: 4px; padding: 0 2px; box-shadow: 0 0 10px rgba(225,29,72,0.5); }
.chapter-nav { display: flex; gap: 15px; margin-top: 50px; margin-bottom: 50px; }
.chapter-nav button { flex: 1; padding: 12px 0; border-radius: 6px; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.2s; border: none; }
.nav-prev { background-color: var(--bg-muted); color: var(--text); border: 1px solid var(--border-light); }
.nav-prev:hover { background-color: var(--border-light); }
.nav-next { background-color: var(--primary); color: #fff; }
.nav-next:hover { opacity: 0.85; }
.edit-area { width: 100%; max-width: var(--content-w, 800px); margin: 20px auto; display: block; box-sizing: border-box; padding: 20px; border: 1px solid var(--border-light); background-color: var(--bg); color: var(--text); outline: none; border-radius: 8px; font-family: var(--reader-font, sans-serif); font-size: var(--font-size, 18px); line-height: var(--line-height, 1.8); min-height: 70vh; resize: vertical; box-shadow: inset 0 2px 6px rgba(0,0,0,0.02); }
.edit-controls { display: flex; max-width: var(--content-w, 800px); margin: 10px auto; justify-content: center; gap: 15px; }
.header-btn { padding: 10px 20px; border: 1px solid var(--border-light); background: transparent; color: var(--text); border-radius: 6px; cursor: pointer; }
.header-btn.primary { background: var(--primary); color: #fff; border: none; }
.pdf-view { display: flex; flex-direction: column; align-items: center; width: 100%; }
.back-to-top-btn { position: fixed; bottom: 30px; right: 20px; width: 44px; height: 44px; border-radius: 50%; background-color: var(--primary); color: white; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 1000; opacity: 0.85; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.back-to-top-btn:active { opacity: 1; transform: scale(0.9); }
</style>