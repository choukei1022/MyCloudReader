<template>
  <div class="topbar-wrapper">
    <header class="app-header">
        
        <div class="header-left">
            <button @click="toggleSidebar" class="header-btn">
                <span class="icon-svg" v-html="SVG_MENU"></span>
                <span class="responsive-text">目录</span>
            </button>
        </div>
        
        <div class="book-title-display">
            {{ store.bookTitle }} 
            <span class="format-hint" v-if="store.bookFormatHint" v-html="store.bookFormatHint"></span>
        </div>
        
        <div class="header-right">
            <div class="desktop-tools">
                <button @click="openGlobalSearch" class="header-btn" title="全书搜索">
                    <span class="icon-svg" v-html="SVG_SEARCH"></span><span>查找</span>
                </button>
                <button @click="toggleFullEdit" class="header-btn" :class="{ 'btn-active': store.isFullEditMode }" title="全书编辑">
                    <span class="icon-svg" v-html="SVG_FULL_EDIT"></span><span>全编</span>
                </button>
                <button @click="toggleEdit" class="header-btn" :class="{ 'btn-active': store.isEditMode }" title="单章编辑">
                    <span class="icon-svg" v-html="SVG_EDIT"></span><span>编辑</span>
                </button>
                <button @click="toggleSimpTrad" class="header-btn" title="简/繁切换">
                    <span class="icon-svg" v-html="SVG_LANG"></span><span>{{ store.langBtnText }}</span>
                </button>
                <button @click="store.showReplaceModal = true" class="header-btn" title="替换">
                    <span class="icon-svg" v-html="SVG_REPLACE"></span><span>替换</span>
                </button>
                <button @click.stop="toggleSettings" class="header-btn" title="设置">
                    <span class="icon-svg" v-html="SVG_SETTING"></span>
                </button>
            </div>

            <button @click.stop="toggleSettings" class="header-btn mobile-menu-btn">
                <span class="icon-svg" v-html="SVG_MORE"></span>
                <span class="responsive-text">菜单</span>
            </button>
        </div>
    </header>

    <!-- 👑 挂载解耦出来的设置面板积木 -->
    <SettingsPanel />
    
  </div>
</template>

<script setup>
import { store } from '../store.js'
import SettingsPanel from './SettingsPanel.vue'

// 图标常量
const SVG_MENU = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`;
const SVG_SEARCH = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
const SVG_FULL_EDIT = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
const SVG_EDIT = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const SVG_LANG = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`;
const SVG_REPLACE = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`;
const SVG_SETTING = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
const SVG_MORE = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>`;

const toggleSettings = () => { store.showSettingsPanel = !store.showSettingsPanel; }
const toggleSidebar = () => { store.isSidebarHidden = !store.isSidebarHidden; if (!store.isSidebarHidden && store.currentBookPath) { store.currentTab = 'chapters'; } }

const openGlobalSearch = () => { if(!store.currentBookPath.endsWith('.txt')) return alert("仅TXT支持全书检索"); store.showGlobalSearch = true; }
const toggleEdit = () => { if (store.currentBookPath.endsWith('.pdf')) return alert("PDF不支持编辑"); if (!store.currentFileText) return alert("请先打开小说"); store.isEditMode = !store.isEditMode; store.isFullEditMode = false; store.showSettingsPanel = false; }
const toggleFullEdit = () => { if (store.currentBookPath.endsWith('.pdf') || store.currentBookPath.endsWith('.docx')) return alert("仅TXT支持"); if (!store.currentFileText) return alert("请先打开小说"); store.isFullEditMode = !store.isFullEditMode; store.isEditMode = false; store.showSettingsPanel = false; }
const toggleSimpTrad = () => { if(window.toggleSimpTrad) window.toggleSimpTrad(); store.langBtnText = store.langBtnText === '繁' ? '简' : '繁'; }
</script>

<style scoped>
.app-header { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; padding: 6px 10px; background: var(--bg); border-bottom: 1px solid var(--border-light); position: relative; }
.header-left, .header-right { z-index: 10; display: flex; align-items: center; background: var(--bg); flex-shrink: 0; }
.book-title-display { position: absolute; left: 80px; right: 80px; top: 50%; transform: translateY(-50%); text-align: center; font-weight: bold; font-size: 15px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; z-index: 1; }
.format-hint { font-size: 11px; opacity: 0.6; font-weight: normal; background: var(--bg-muted); padding: 2px 6px; border-radius: 4px; margin-left: 4px; }
.header-btn { background: transparent; border: 1px solid var(--border-light); color: var(--text-muted); font-size: 13px; cursor: pointer; padding: 5px 10px; border-radius: 4px; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
.header-btn:hover { background: var(--bg-muted); color: var(--text); }
.header-btn.btn-active { color: var(--primary); border-color: var(--primary); background: rgba(var(--primary-rgb), 0.05); font-weight: bold; }
.icon-svg { display: flex; align-items: center; }
.desktop-tools { display: flex; align-items: center; gap: 6px; }
.mobile-menu-btn { display: none !important; }

@media (max-width: 768px) {
    .desktop-tools { display: none !important; }
    .mobile-menu-btn { display: flex !important; }
    .responsive-text { display: none; }
}
</style>