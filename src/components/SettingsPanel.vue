<template>
    <Teleport to="body">
        <div v-show="store.showSettingsPanel" class="settings-backdrop" @click="store.showSettingsPanel = false"></div>
        
        <div id="settings-panel" :class="{ show: store.showSettingsPanel }" @click.stop>
            
            <div class="mobile-tools">
                <button class="mobile-tool-btn" @click="openGlobalSearch"><span v-html="SVG_SEARCH"></span><br>查找</button>
                <button class="mobile-tool-btn" @click="toggleFullEdit" :class="{ 'btn-active': store.isFullEditMode }"><span v-html="SVG_FULL_EDIT"></span><br>全编</button>
                <button class="mobile-tool-btn" @click="toggleEdit" :class="{ 'btn-active': store.isEditMode }"><span v-html="SVG_EDIT"></span><br>编辑</button>
                <button class="mobile-tool-btn" @click="openReplace"><span v-html="SVG_REPLACE"></span><br>替换</button>
                <button class="mobile-tool-btn" @click="toggleSimpTrad"><span v-html="SVG_LANG"></span><br>{{ store.langBtnText }}</button>
            </div>

            <div class="set-row"><span class="row-label">悬浮按钮</span><div class="set-ctrls">
                <button class="set-btn" :class="{ active: store.config.showBackToTop }" @click="store.updateConfig('showBackToTop', true)">开启</button>
                <button class="set-btn" :class="{ active: !store.config.showBackToTop }" @click="store.updateConfig('showBackToTop', false)">关闭</button>
            </div></div>

            <div class="set-row"><span class="row-label">强调色</span><div class="set-ctrls">
                <button class="set-btn color-btn" :class="{ active: store.config.primaryColor === 'blue' }" @click="store.updateConfig('primaryColor', 'blue')"><div class="color-dot" style="background:#3b6991;"></div> 蓝</button>
                <button class="set-btn color-btn" :class="{ active: store.config.primaryColor === 'green' }" @click="store.updateConfig('primaryColor', 'green')"><div class="color-dot" style="background:#10b981;"></div> 绿</button>
            </div></div>

            <div class="set-row-col"><span class="row-label">界面字体</span><div class="set-ctrls">
                <button class="set-btn" :class="{ active: store.config.uiFontFamily === 'sans-serif' }" @click="store.updateConfig('uiFontFamily', 'sans-serif')" style="font-family: sans-serif;">黑体</button>
                <button class="set-btn" :class="{ active: store.config.uiFontFamily === 'Songti SC, Noto Serif CJK SC, SimSun, STSong, serif' }" @click="store.updateConfig('uiFontFamily', 'Songti SC, Noto Serif CJK SC, SimSun, STSong, serif')" style="font-family: 'Songti SC', SimSun, serif;">宋体</button>
                <button class="set-btn" :class="{ active: store.config.uiFontFamily === 'Kaiti SC, STKaiti, KaiTi, serif' }" @click="store.updateConfig('uiFontFamily', 'Kaiti SC, STKaiti, KaiTi, serif')" style="font-family: 'Kaiti SC', KaiTi, serif;">楷体</button>
                <button v-if="store.customFonts.length > 0" class="set-btn" @click="showMoreUiFonts = !showMoreUiFonts">⋯</button>
            </div></div>
            <div v-show="showMoreUiFonts && store.customFonts.length > 0" class="font-drawer">
                <button v-for="font in store.customFonts" :key="'ui-'+font" class="set-btn" :class="{ active: store.config.uiFontFamily === font.split('.')[0] }" @click="store.updateConfig('uiFontFamily', font.split('.')[0])" :style="{ fontFamily: font.split('.')[0] }">{{ font.split('.')[0] }}</button>
            </div>

            <div class="set-row-col"><span class="row-label">正文字体</span><div class="set-ctrls">
                <button class="set-btn" :class="{ active: store.config.readerFontFamily === 'sans-serif' }" @click="store.updateConfig('readerFontFamily', 'sans-serif')" style="font-family: sans-serif;">黑体</button>
                <button class="set-btn" :class="{ active: store.config.readerFontFamily === 'Songti SC, Noto Serif CJK SC, SimSun, STSong, serif' }" @click="store.updateConfig('readerFontFamily', 'Songti SC, Noto Serif CJK SC, SimSun, STSong, serif')" style="font-family: 'Songti SC', SimSun, serif;">宋体</button>
                <button class="set-btn" :class="{ active: store.config.readerFontFamily === 'Kaiti SC, STKaiti, KaiTi, serif' }" @click="store.updateConfig('readerFontFamily', 'Kaiti SC, STKaiti, KaiTi, serif')" style="font-family: 'Kaiti SC', KaiTi, serif;">楷体</button>
                <button v-if="store.customFonts.length > 0" class="set-btn" @click="showMoreReaderFonts = !showMoreReaderFonts">⋯</button>
            </div></div>
            <div v-show="showMoreReaderFonts && store.customFonts.length > 0" class="font-drawer">
                <button v-for="font in store.customFonts" :key="'reader-'+font" class="set-btn" :class="{ active: store.config.readerFontFamily === font.split('.')[0] }" @click="store.updateConfig('readerFontFamily', font.split('.')[0])" :style="{ fontFamily: font.split('.')[0] }">{{ font.split('.')[0] }}</button>
            </div>
            
            <div class="set-row"><span class="row-label">主题</span><div class="set-ctrls">
                <button class="set-btn" :class="{ active: store.config.theme === 'light' }" @click="store.updateConfig('theme', 'light')">白</button>
                <button class="set-btn" :class="{ active: store.config.theme === 'sepia' }" @click="store.updateConfig('theme', 'sepia')">黄</button>
                <button class="set-btn" :class="{ active: store.config.theme === 'dark' }" @click="store.updateConfig('theme', 'dark')">黑</button>
            </div></div>
            <div class="set-row"><span class="row-label">宽度 (<span>{{ store.config.contentWidth }}</span>)</span><div class="set-ctrls"><button class="set-btn" @click="changeSetting('contentWidth', -100, 300, 2000)">-</button><button class="set-btn" @click="changeSetting('contentWidth', 100, 300, 2000)">+</button></div></div>
            <div class="set-row"><span class="row-label">字号 (<span>{{ store.config.fontSize }}</span>)</span><div class="set-ctrls"><button class="set-btn" @click="changeSetting('fontSize', -2, 14, 32)">A-</button><button class="set-btn" @click="changeSetting('fontSize', 2, 14, 32)">A+</button></div></div>
            <div class="set-row"><span class="row-label">行距 (<span>{{ Number(store.config.lineHeight).toFixed(1) }}</span>)</span><div class="set-ctrls"><button class="set-btn" @click="changeSetting('lineHeight', -0.2, 0.5, 4.0)">-</button><button class="set-btn" @click="changeSetting('lineHeight', 0.2, 0.5, 4.0)">+</button></div></div>
            <div class="set-row"><span class="row-label">段距 (<span>{{ Number(store.config.paraSpace).toFixed(1) }}</span>)</span><div class="set-ctrls"><button class="set-btn" @click="changeSetting('paraSpace', -0.2, 0.5, 4.0)">-</button><button class="set-btn" @click="changeSetting('paraSpace', 0.2, 0.5, 4.0)">+</button></div></div>
            
            <div class="action-btn-group">
                <button class="action-btn" @click="doSaveTemplate">💾 存为模板</button>
                <button class="action-btn danger-outline" @click="store.resetConfig()">🔄 恢复默认</button>
            </div>

            <!-- 全文检索引擎控制台 -->
            <div style="margin-top:20px; border-top:1px dashed var(--border-light); padding-top:15px;">
                <span class="row-label" style="display:block; margin-bottom:8px;">全文检索引擎 (已索引: {{ indexStatus.indexedCount || 0 }} 本)</span>
                <div v-if="indexStatus.isRunning" style="background:var(--bg-muted); padding:10px; border-radius:6px; font-size:12px; text-align:center; color:var(--text);">
                    <div style="margin-bottom: 4px;">正在构建索引: {{ indexStatus.current }} / {{ indexStatus.total }} 本</div>
                    <span style="color:var(--primary); font-weight:bold; display:inline-block; margin-bottom:10px;">{{ indexStatus.isPaused ? '⏸ 已暂停挂起' : indexStatus.currentBook }}</span>
                    <button class="action-btn" style="width:100%; border-color:var(--primary); color:var(--primary);" @click="toggleIndexPause">{{ indexStatus.isPaused ? '▶ 继续构建' : '⏸ 暂停构建' }}</button>
                </div>
                <button v-else class="action-btn" style="width:100%; border-color:var(--primary); color:var(--primary);" @click="buildIndex">⚡ 构建全库文本索引</button>
            </div>

            <div style="margin-top:10px;"><button class="action-btn danger-solid" style="width: 100%;" @click="doLogout">🚪 退出登录</button></div>
        </div>
    </Teleport>
</template>

<script setup>
// 👇 就是丢了这一行！补上 ref 和 watch
import { ref, watch } from 'vue'

import { store } from '../store.js'

// 👑 从 topbar 目录引入建库轮询外脑
import { useIndexer } from '../composables/topbar/useIndexer.js'

// 挂载轮询引擎
const { indexStatus, buildIndex, toggleIndexPause, checkIndexProgress } = useIndexer();

// 图标常量 (供手机端快捷栏使用)
const SVG_SEARCH = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
const SVG_FULL_EDIT = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
const SVG_EDIT = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const SVG_LANG = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`;
const SVG_REPLACE = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`;

const showMoreUiFonts = ref(false); 
const showMoreReaderFonts = ref(false);

const changeSetting = (key, step, min, max) => { 
    let val = store.config[key] + step; 
    val = Math.max(min, Math.min(max, val)); 
    if (key === 'lineHeight' || key === 'paraSpace') val = Number(val.toFixed(1)); 
    store.updateConfig(key, val); 
}

const doSaveTemplate = () => { store.saveTemplate(); alert('模板已保存，下次打开生效！'); }
const doLogout = () => { if(confirm("确定要退出登录吗？")) store.logout(); }

// 手机端快捷按钮逻辑
const openGlobalSearch = () => { store.showSettingsPanel = false; if(!store.currentBookPath.endsWith('.txt')) return alert("仅TXT支持全书检索"); store.showGlobalSearch = true; }
const toggleEdit = () => { store.showSettingsPanel = false; if (store.currentBookPath.endsWith('.pdf')) return alert("PDF不支持编辑"); if (!store.currentFileText) return alert("请先打开小说"); store.isEditMode = !store.isEditMode; store.isFullEditMode = false; }
const toggleFullEdit = () => { store.showSettingsPanel = false; if (store.currentBookPath.endsWith('.pdf') || store.currentBookPath.endsWith('.docx')) return alert("仅TXT支持"); if (!store.currentFileText) return alert("请先打开小说"); store.isFullEditMode = !store.isFullEditMode; store.isEditMode = false; }
const toggleSimpTrad = () => { store.showSettingsPanel = false; if(window.toggleSimpTrad) window.toggleSimpTrad(); store.langBtnText = store.langBtnText === '繁' ? '简' : '繁'; }
const openReplace = () => { store.showSettingsPanel = false; store.showReplaceModal = true; }

// 当面板打开时，主动触发一次进度拉取
watch(() => store.showSettingsPanel, (newVal) => { if (newVal) checkIndexProgress(); });
</script>

<style scoped>
.settings-backdrop { position: fixed; inset: 0; z-index: 99998; background: transparent; }
#settings-panel { position: fixed; top: 60px; right: 20px; width: 320px; background-color: var(--card, #ffffff); isolation: isolate; border: 1px solid var(--border-light); border-radius: 8px; padding: 15px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); z-index: 99999; display: none; max-height: calc(100vh - 80px); overflow-y: auto; }
#settings-panel.show { display: block; }
.set-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; color: var(--text); }
.set-row-col { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 15px; font-size: 14px; color: var(--text); }
.row-label { font-weight: bold; opacity: 0.8; font-size: 13px; margin-right: 10px; white-space: nowrap; }
.set-ctrls { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; flex: 1; }
.set-btn { background: transparent; color: var(--text); border: 1px solid var(--border-light); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.2s; margin: 0; }
.set-btn.active { background-color: rgba(var(--primary-rgb), 0.1); color: var(--primary); border-color: var(--primary); font-weight: bold; }
.color-btn { display: flex; align-items: center; gap: 4px; }
.color-dot { width: 10px; height: 10px; border-radius: 50%; }
.font-drawer { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; background: var(--bg-muted); padding: 10px; border-radius: 6px; margin-bottom: 15px; border: 1px dashed var(--border-light); width: 100%; box-sizing: border-box; }
.action-btn-group { display: flex; gap: 10px; margin-top: 20px; border-top: 1px dashed var(--border-light); padding-top: 15px; flex-wrap: wrap; }
.action-btn { display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1; padding: 10px 0; border-radius: 6px; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.2s; background: var(--bg-muted); color: var(--text); border: 1px solid var(--border-light); }
.action-btn:hover { background: var(--border-light); }
.action-btn.danger-outline { color: #ef4444; border-color: rgba(239,68,68,0.3); background: transparent; }
.action-btn.danger-outline:hover { background: rgba(239,68,68,0.05); }
.action-btn.danger-solid { background: #ef4444; color: #fff; border: none; }
.action-btn.danger-solid:hover { background: #dc2626; }
.mobile-tools { display: none; }
@media (max-width: 768px) {
    .mobile-tools { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid var(--border-light); }
    .mobile-tool-btn { background: var(--card); border: 1px solid var(--border-light); border-radius: 4px; padding: 8px 0; font-size: 11px; color: var(--text); cursor: pointer; line-height: 1.5; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .mobile-tool-btn.btn-active { color: var(--primary); border-color: var(--primary); font-weight: bold; background: rgba(var(--primary-rgb), 0.05); }
    #settings-panel { top: 60px; right: 50%; transform: translateX(50%); width: 90%; max-width: 360px; }
}
</style>