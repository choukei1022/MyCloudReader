/* src/store.js - 整理分类后的中央状态库 */
import { reactive } from 'vue';
import { apiFetch } from './utils/request.js'; // 引入解耦后的网络模块

const DEFAULT_CONFIG = {
    theme: 'light', fontSize: 18, lineHeight: 1.6, paraSpace: 1.2, 
    contentWidth: 800, uiFontFamily: 'sans-serif', readerFontFamily: 'sans-serif', 
    showBackToTop: true, primaryColor: 'blue', sidebarWidth: 260
};

export const store = reactive({
    // --- 1. 用户鉴权状态 ---
    userToken: localStorage.getItem('reader_token') || '',

    // --- 2. 核心书籍与阅读数据 ---
    currentPath: '', currentBookPath: '', bookTitle: '未选书籍', bookFormatHint: '',
    currentFileText: '', chaptersData: [], currentChapterIndex: 0, 
    pdfOutlineData: [], pdfPageNum: 1, customFonts: [], openFolders: new Set(),

    // --- 3. UI 布局与弹窗状态 ---
    currentTab: 'files', isSidebarHidden: false, isToolbarShow: true,
    showSettingsPanel: false, showReplaceModal: false, showGlobalSearch: false,
    isEditMode: false, isFullEditMode: false, langBtnText: '繁',

    // --- 4. 搜索与跳转触发器 (相当于 Event Bus) ---
    searchHighlightOffset: -1, searchHighlightLength: 0, searchKeyword: '',     
    pendingCrossBookOffset: -1, pendingCrossBookKeyword: '',  
    triggerJump: 0, jumpDirection: 1, triggerParse: 0, tempReplaceRules: [],  
    
    // --- 5. 本地偏好配置 ---
    settingChangeLock: 0, clipboard: null,
    config: JSON.parse(localStorage.getItem('reader_template')) || { ...DEFAULT_CONFIG },

    // ==========================================
    // Actions
    // ==========================================
    updateConfig(key, value) {
        this.config[key] = value;
        this.settingChangeLock = Date.now() + 500; 
    },
    saveTemplate() {
        localStorage.setItem('reader_template', JSON.stringify(this.config));
        this.showSettingsPanel = false;
    },
    resetConfig() {
        this.config = { ...DEFAULT_CONFIG };
        localStorage.removeItem('reader_template');
    },
    logout() {
        this.userToken = ''; localStorage.removeItem('reader_token'); window.location.reload();
    },
    navigateChapter(direction) {
        let newIdx = this.currentChapterIndex + direction;
        if (newIdx >= 0 && newIdx < this.chaptersData.length) {
            this.currentChapterIndex = newIdx;
            this.jumpDirection = direction; 
            this.triggerJump = Date.now();
            this.tempReplaceRules = [];     
        }
    }
});

// 👑 临时向外抛出 apiFetch，保证旧组件 import { apiFetch } 依然不报错！
export { apiFetch };