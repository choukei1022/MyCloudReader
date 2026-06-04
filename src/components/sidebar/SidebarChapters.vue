<template>
  <div class="scroll-container" ref="scrollContainerRef">
      <!-- PDF 大纲 -->
      <template v-if="isPdfBook">
          <div v-if="flattenedPdfOutline.length === 0" class="empty-hint">该 PDF 无内置大纲</div>
          <div v-for="(item, idx) in flattenedPdfOutline" :key="'pdf-'+idx" class="item-row" @click="jumpPdfOutline(item)">
              <div class="item-content" :title="item.title" :style="{ paddingLeft: (15 + item.level * 15) + 'px' }">{{ item.title }}</div>
          </div>
      </template>
      <!-- Word 大纲 -->
      <template v-else-if="isWordBook">
          <div v-if="store.chaptersData.length === 0" class="empty-hint">该 Word 无标准标题</div>
          <div v-for="(chap, idx) in store.chaptersData" :key="'word-'+idx" class="item-row" @click="jumpWordOutline(chap)">
              <div class="item-content" :style="{ paddingLeft: (15 + (parseInt(chap.level) - 1) * 12) + 'px' }">{{ chap.title }}</div>
          </div>
      </template>
      <!-- TXT 小说章节 -->
      <template v-else>
          <template v-for="chap in displayChapters" :key="chap.originalIndex">
              <div v-show="chap.isVolume || chap.volumeParent === -1 || expandedVolumes.has(chap.volumeParent)"
                   :id="'chap-node-' + chap.originalIndex" 
                   class="item-row" 
                   :class="{ 'reading-active': isChapterActive(chap.originalIndex), 'volume-node': chap.isVolume }" 
                   @click="clickChapter(chap)">
                  <div class="item-content" :style="{ paddingLeft: chap.isVolume ? '10px' : (chap.indent ? '45px' : '30px') }" :title="chap.title">
                      <span v-if="chap.isVolume" class="caret-container">
                          <span class="volume-caret" :class="{ 'expanded': expandedVolumes.has(chap.originalIndex) }" :style="{ visibility: chap.hasChildren ? 'visible' : 'hidden' }" v-html="SVG_CARET"></span>
                      </span>
                      {{ chap.title }}
                  </div>
              </div>
          </template>
      </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { store } from '../../store.js'

const SVG_CARET = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
const scrollContainerRef = ref(null);

const isPdfBook = computed(() => store.currentBookPath.endsWith('.pdf'));
const isWordBook = computed(() => store.currentBookPath.endsWith('.docx'));

const flattenedPdfOutline = computed(() => {
    const res = [];
    const traverse = (items, level) => { items.forEach(item => { res.push({ ...item, level }); if (item.items && item.items.length) traverse(item.items, level + 1); }); };
    if (store.pdfOutlineData && store.pdfOutlineData.length) traverse(store.pdfOutlineData, 0);
    return res;
});

const jumpPdfOutline = async (item) => {
    if (item.dest && window.pdfDocGlobal) {
        try {
            const destArray = typeof item.dest === 'string' ? await window.pdfDocGlobal.getDestination(item.dest) : item.dest;
            const pageIndex = await window.pdfDocGlobal.getPageIndex(destArray[0]);
            const targetWrapper = document.querySelector(`.pdf-page-wrapper[data-page-num="${pageIndex + 1}"]`);
            if (targetWrapper) targetWrapper.scrollIntoView({ behavior: 'smooth' });
            if (window.innerWidth < 768) store.isSidebarHidden = true;
        } catch(e) {}
    }
}

const jumpWordOutline = (chap) => {
    const targetEl = document.getElementById(chap.id);
    if(targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
    if(window.innerWidth < 768) store.isSidebarHidden = true;
}

const expandedVolumes = ref(new Set());
const displayChapters = computed(() => {
    let currentVolIndex = -1;
    const chapters = store.chaptersData.map((chap, index) => {
        if (chap.isVolume) currentVolIndex = index;
        return { ...chap, originalIndex: index, volumeParent: currentVolIndex, hasChildren: false };
    });
    chapters.forEach(chap => { if (!chap.isVolume && chap.volumeParent !== -1) chapters[chap.volumeParent].hasChildren = true; });
    return chapters;
});

const isChapterActive = (index) => {
    const activeIdx = store.currentChapterIndex;
    if (index === activeIdx) return true; 
    const activeChapDisplay = displayChapters.value[activeIdx];
    if (!activeChapDisplay) return false;
    if (index === activeChapDisplay.volumeParent) return true;
    if (activeChapDisplay.isVolume && index === activeIdx + 1 && !store.chaptersData[index].isVolume) return true;
    return false;
};

const syncVolumeState = () => {
    if (store.chaptersData.length === 0) return;
    let volIdx = -1;
    for (let i = store.currentChapterIndex; i >= 0; i--) { if (store.chaptersData[i].isVolume) { volIdx = i; break; } }
    if (volIdx !== -1) { expandedVolumes.value.clear(); expandedVolumes.value.add(volIdx); }
};

const clickChapter = (chap) => {
    const index = chap.originalIndex;
    if (chap.isVolume) {
        if (expandedVolumes.value.has(index)) expandedVolumes.value.delete(index);
        else { expandedVolumes.value.clear(); expandedVolumes.value.add(index); }
    }
    store.currentChapterIndex = index;
    store.triggerJump = Date.now(); 
    if (window.innerWidth < 768) store.isSidebarHidden = true;
}

const scrollToCurrentChapter = async () => {
    if (store.currentTab === 'chapters' && !isPdfBook.value && !isWordBook.value) {
        syncVolumeState(); 
        await nextTick();
        setTimeout(() => {
            const activeNode = document.getElementById('chap-node-' + store.currentChapterIndex);
            if (activeNode && scrollContainerRef.value) activeNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    }
};

watch(() => store.currentChapterIndex, scrollToCurrentChapter);
watch(() => store.currentTab, (newTab) => { if (newTab === 'chapters') scrollToCurrentChapter(); }, { immediate: true });
</script>

<style scoped>
.scroll-container { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 10px 0; }
.empty-hint { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
.item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; cursor: pointer; color: var(--text); font-size: 14px; transition: background 0.1s; }
.item-row:hover { background-color: rgba(0,0,0,0.03); }
.item-row.reading-active { background-color: rgba(var(--primary-rgb), 0.12); border-left: 3px solid var(--primary); font-weight: bold; color: var(--primary); }
.volume-node .item-content { font-weight: bold; font-size: 14.5px; }
.caret-container { display: inline-flex; align-items: center; justify-content: center; width: 20px; flex-shrink: 0; }
.volume-caret { display: inline-flex; align-items: center; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0.6; }
.volume-caret.expanded { transform: rotate(90deg); }
.item-content { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; display: flex; align-items: center; }
</style>