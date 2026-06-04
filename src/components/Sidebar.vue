<template>
  <div class="modern-sidebar">
      
      <!-- 品牌头部 -->
      <div class="brand-header">
          <span class="icon-svg" v-html="SVG_BOOK_OPEN"></span>
          <span class="brand-title">我的书库</span>
      </div>

      <!-- 选项卡 -->
      <div class="modern-tabs">
          <button class="m-tab" :class="{ active: store.currentTab === 'files' }" @click="store.currentTab = 'files'">文件库</button>
          <button class="m-tab" :class="{ active: store.currentTab === 'chapters' }" @click="store.currentTab = 'chapters'">大纲目录</button>
          <button class="m-tab" :class="{ active: store.currentTab === 'history' }" @click="store.currentTab = 'history'">阅读历史</button>
      </div>
      
      <!-- 👑 动态组件渲染区 -->
      <SidebarFiles v-if="store.currentTab === 'files'" />
      <SidebarChapters v-else-if="store.currentTab === 'chapters'" />
      <SidebarHistory v-else-if="store.currentTab === 'history'" />
      
  </div>
</template>

<script setup>
import { store } from '../store.js'

// 引入拆解出来的 3 个子组件 (确保你之前建了 sidebar 这个子文件夹)
import SidebarFiles from './sidebar/SidebarFiles.vue'
import SidebarChapters from './sidebar/SidebarChapters.vue'
import SidebarHistory from './sidebar/SidebarHistory.vue'

const SVG_BOOK_OPEN = `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
</script>

<style scoped>
.icon-svg { display: inline-flex; align-items: center; vertical-align: -2px; margin-right: 4px; }
.modern-sidebar { display: flex; flex-direction: column; height: 100%; background-color: var(--card); overflow: hidden; }
.brand-header { display: flex; align-items: center; padding: 20px; color: var(--primary); gap: 10px; border-bottom: 1px solid var(--border-light); background: var(--bg); flex-shrink: 0; }
.brand-title { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
.modern-tabs { display: flex; border-bottom: 1px solid var(--border-light); background: var(--bg); flex-shrink: 0; }
.m-tab { flex: 1; padding: 12px 0; background: transparent; border: none; font-size: 14px; color: var(--text); cursor: pointer; border-bottom: 2px solid transparent; outline: none; }
.m-tab.active { color: var(--primary); font-weight: bold; border-bottom-color: var(--primary); }
</style>