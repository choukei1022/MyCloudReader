<template>
  <!-- 登录页面 -->
  <div v-if="!store.userToken" class="login-screen">
      <div class="modal">
          <h3>🔐 私人书库登录</h3>
          <input type="password" v-model="pwdInput" placeholder="请输入访问密码" @keyup.enter="doLogin">
          <div class="modal-btns"><button class="btn-confirm" @click="doLogin">进入书库</button></div>
          <p v-show="loginErr" class="error-text">{{ loginErr }}</p>
      </div>
  </div>

  <!-- 👑 核心布局区：干净清爽的结构 -->
  <div v-else class="app-layout">
    <Sidebar class="app-sidebar" :class="{ 'hidden': store.isSidebarHidden }" :style="{ width: store.config.sidebarWidth + 'px' }" />
    <div class="sidebar-resizer hide-on-mobile" :class="{ 'hidden': store.isSidebarHidden }" @mousedown="startResize"></div>

    <div class="app-main">
      <TopBar class="app-topbar" :class="{ 'hidden': !store.isToolbarShow }" />
      <ReaderArea class="app-reader" />
    </div>

    <div class="mobile-overlay" v-show="!store.isSidebarHidden" @click.stop.prevent="store.isSidebarHidden = true" @touchstart.stop.prevent="store.isSidebarHidden = true"></div>

    <!-- 替换弹窗 -->
    <div class="modal-overlay" v-if="store.showReplaceModal">
        <div class="modal">
            <h3>🔍 批量文本替换</h3>
            <textarea v-model="repBatchText" placeholder="张三=李四&#10;王五=赵六" rows="5" class="replace-textarea"></textarea>
            <select v-model="repScope" class="replace-select">
                <option value="temp">仅临时替换当前屏幕</option>
                <option value="chapter">永久替换本章内容</option>
                <option value="book">全文永久替换 (重新解析章节)</option>
            </select>
            <div class="modal-btns">
                <button class="btn-cancel" @click="store.showReplaceModal = false">取消</button>
                <button class="btn-confirm" @click="doReplace">开始替换</button>
            </div>
        </div>
    </div>

    <!-- 全书搜索弹窗 -->
    <div class="global-search-fullscreen" v-if="store.showGlobalSearch">
        <div class="gs-header">
            <button @click="store.showGlobalSearch = false" class="gs-back">🔙</button>
            <div class="gs-input-wrapper">
                <input type="text" v-model="gsInput" placeholder="输入要全书搜索的内容..." class="gs-input" @keyup.enter="doGlobalSearch">
            </div>
            <button @click="doGlobalSearch" class="gs-btn">搜索</button>
        </div>
        <div class="gs-stats">搜索结果: <span>{{ gsResults.length }}</span> 条</div>
        
        <div class="gs-results-container">
            <div v-if="isSearching" class="gs-msg">检索中...</div>
            <div v-else-if="gsResults.length === 0 && gsInput" class="gs-msg">未找到</div>
            <div v-for="(res, index) in gsResults" :key="index" @click="jumpToSearchResult(res)" class="gs-result-item">
                <div class="gs-result-text">
                    <span v-html="res.html"></span> 
                    <span class="gs-percent">({{ res.percent }}%)</span>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
// 👑 引入纯净的业务逻辑模块 (Composables)
// 👑 改成从 common 目录引入
import { ref } from 'vue' 

import { store } from './store.js'
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'
import ReaderArea from './components/ReaderArea.vue'

// 👑 纯净的业务逻辑模块 (注意刚才咱们改过的 common 路径)
import { useTheme } from './composables/common/useTheme.js'
import { useDragResize } from './composables/common/useDragResize.js'
import { useTextSearch } from './composables/common/useTextSearch.js'
import { useReplace } from './composables/common/useReplace.js'

// 1. 启动主题与字体响应引擎
useTheme();

// 2. 挂载侧边栏拖拽能力
const { startResize } = useDragResize();

// 3. 挂载内存级全书搜索算法
const { gsInput, gsResults, isSearching, doGlobalSearch, jumpToSearchResult } = useTextSearch();

// 4. 挂载正则替换算法
const { repBatchText, repScope, doReplace } = useReplace();

// 5. 登录逻辑 (作为唯一的页面级状态保留)
const pwdInput = ref('')
const loginErr = ref('')
const doLogin = async () => {
    try {
        const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({password: pwdInput.value}) });
        const data = await res.json();
        if (data.success) { 
            store.userToken = data.token; 
            localStorage.setItem('reader_token', store.userToken); 
            loginErr.value = '';
            store.triggerParse = Date.now(); 
        } else { loginErr.value = data.msg; }
    } catch(e) { loginErr.value = "网络错误"; }
}
</script>

<style>
/* ==========================================
   👑 全局 CSS 基础重置 (保持原样)
   ========================================== */
:root {
    --primary: #3b6991;
    --primary-rgb: 59, 105, 145;
    --border-light: rgba(127, 127, 127, 0.15); 
}

/* 主题颜色定义 */
body.theme-light { --bg: #ffffff; --card: #f9fafb; --text: #2c3e50; --text-muted: #888888; --bg-muted: #f1f5f9; }
body.theme-sepia { --bg: #fdf6e3; --card: #f4ecd8; --text: #433422; --text-muted: #9c8a71; --bg-muted: #eaddc2; }
body.theme-dark { --bg: #121212; --card: #1e1e1e; --text: #d4d4d4; --text-muted: #6b7280; --bg-muted: #2d2d2d; }

body, html, #app {
    margin: 0; padding: 0; width: 100vw; height: 100vh;
    overflow: hidden; font-family: var(--ui-font, sans-serif);
    background-color: var(--bg);
}

.login-screen { display: flex; align-items: center; justify-content: center; height: 100vh; }
.app-layout { display: flex; height: 100vh; width: 100vw; }
.app-sidebar { flex-shrink: 0; z-index: 10; transition: transform 0.3s ease; }
.sidebar-resizer { width: 4px; cursor: col-resize; background: transparent; z-index: 11; transition: 0.2s; }
.sidebar-resizer:hover, .sidebar-resizer:active { background: var(--primary); }
.app-main { flex: 1; min-width: 0; display: flex; flex-direction: column; position: relative; z-index: 1; border-left: 1px solid var(--border-light); }
.app-topbar { position: relative; flex-shrink: 0; z-index: 50; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: 100%; transform: translateY(0); }
.app-topbar.hidden { position: absolute; transform: translateY(-100%); }
.app-reader { flex: 1; overflow-y: auto; overflow-x: hidden; position: relative; z-index: 1; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1000; display: flex; justify-content: center; align-items: center; }
.modal { background: var(--card); color: var(--text); padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modal h3 { margin-top: 0; text-align: center; }
.modal input, .modal select, .modal textarea { width: 100%; box-sizing: border-box; padding: 12px; margin-bottom: 15px; border: 1px solid var(--border-light); border-radius: 6px; background: var(--bg); color: var(--text); font-family: inherit; }
.modal-btns { display: flex; gap: 10px; }
.modal-btns button { flex: 1; padding: 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold; }
.btn-confirm { background: var(--primary); color: #fff; }
.btn-cancel { background: var(--bg-muted); color: var(--text); }
.error-text { color: #ef4444; font-size: 12px; text-align: center; margin-top: 10px; }
.global-search-fullscreen { position: fixed; inset: 0; background: var(--bg); z-index: 1000; display: flex; flex-direction: column; }
.gs-header { display: flex; padding: 10px 15px; background: var(--card); align-items: center; gap: 10px; border-bottom: 1px solid var(--border-light); }
.gs-back { border: none; background: none; font-size: 22px; cursor: pointer; color: var(--text); }
.gs-input-wrapper { flex: 1; background: var(--bg-muted); border-radius: 20px; padding: 6px 15px; }
.gs-input { border: none; background: none; outline: none; width: 100%; font-size: 15px; color: var(--text); }
.gs-btn { border: none; background: none; color: var(--primary); font-weight: bold; font-size: 15px; cursor: pointer; }
.gs-stats { padding: 10px 15px; font-size: 14px; color: var(--text-muted); background: var(--bg-muted); }
.gs-stats span { color: var(--primary); font-weight: bold; }
.gs-results-container { flex: 1; overflow-y: auto; }
.gs-msg { padding: 40px 20px; text-align: center; color: var(--text-muted); }
.gs-result-item { padding: 15px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.gs-result-item:hover { background-color: rgba(0,0,0,0.03); }
.gs-result-text { font-size: 15px; line-height: 1.6; color: var(--text); }
.gs-percent { color: var(--primary); font-size: 13px; margin-left: 5px; }
.mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 9; display: none; }
@media (min-width: 769px) {
    .app-sidebar.hidden { display: none !important; }
    .sidebar-resizer.hidden { display: none !important; }
}
@media (max-width: 768px) {
    .hide-on-mobile { display: none; }
    .app-sidebar { position: absolute; height: 100%; max-width: 320px; }
    .app-sidebar.hidden { transform: translateX(-100%); }
    .mobile-overlay { display: block; }
    
    /* 👑 终极手机端菜单悬浮修复：强制 fixed 定位，激活百级 z-index，彻底无视下方正文的遮挡！ */
    .app-topbar {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 999 !important;
    }
}
</style>