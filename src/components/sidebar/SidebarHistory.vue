<template>
  <div class="scroll-container">
      <div v-if="isLoadingHistory" class="empty-hint">加载中...</div>
      <div v-else-if="historyList.length === 0" class="empty-hint">暂无阅读记录</div>
      <div v-for="item in historyList" :key="item.path" class="history-item" @click="jumpToHistory(item)">
          <div class="h-header">
              <div class="h-title" :title="item.name"><span class="icon-svg" v-html="SVG_BOOK"></span> {{ item.name }}</div>
              <div class="h-actions">
                  <div class="premium-pill">{{ (item.totalPercent * 100).toFixed(1) }}%</div>
                  <button class="h-del-btn" title="移除记录" @click.stop="deleteHistory(item.path)">✖</button>
              </div>
          </div>
          <div class="h-meta">
              <span class="h-chapter" :title="item.title || '未知章节'"><span class="icon-svg" v-html="SVG_PIN"></span> {{ item.title || '未知章节' }}</span>
              <span class="h-percent">本章 {{ Math.round((item.scroll || 0) * 100) }}%</span>
          </div>
      </div>
  </div>
</template>

<script setup>
import { watch } from 'vue'
// 👇 就是漏了这极其关键的一行！把 store 引入进来！
import { store } from '../../store.js'
// 👑 改成从 sidebar 目录引入
import { useSidebarHistory } from '../../composables/sidebar/useSidebarHistory.js'

const SVG_BOOK = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
const SVG_PIN = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

const { historyList, isLoadingHistory, loadHistory, deleteHistory, jumpToHistory } = useSidebarHistory();

// 监听 tab 切换，自动加载数据
watch(() => store.currentTab, (newTab) => { if (newTab === 'history') loadHistory(); }, { immediate: true });
</script>

<style scoped>
.icon-svg { display: inline-flex; align-items: center; vertical-align: -2px; margin-right: 4px; }
.scroll-container { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 10px 0; }
.empty-hint { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
.history-item { padding: 12px 15px; border-bottom: 1px solid var(--border-light); cursor: pointer; }
.history-item:hover { background-color: rgba(0,0,0,0.02); }
.h-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; gap:8px; }
.h-title { font-weight: bold; font-size: 14px; color: var(--text); display: flex; align-items: center; }
.h-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
.h-meta { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
.premium-pill { background-color: rgba(var(--primary-rgb), 0.15); color: var(--primary); padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 11px; }
.h-del-btn { background: transparent; border: none; color: var(--text-muted); font-size: 14px; cursor: pointer; padding: 0 4px; transition: color 0.2s; }
.h-del-btn:hover { color: #ef4444; }
</style>