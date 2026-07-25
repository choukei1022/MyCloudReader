<!-- 
 * 文件路径：src/components/sidebar/SidebarFiles.vue
 * 主要作用：【视图组件】侧边栏的“文件库”页面外壳。
 * 包含功能：只负责渲染 HTML 骨架和 CSS 样式。它将“文件树外脑”、“搜索外脑”和“文件操作外脑”的数据绑定到视图上。
-->
<template>
  <div class="files-wrapper">
      
      <!-- 搜索栏 -->
      <div class="modern-search-bar">
          <div class="search-capsule" style="flex-direction: column; gap: 8px;">
              <div style="display: flex; gap: 5px;">
                  <button class="s-icon-btn" @click="triggerSearch"><span v-html="SVG_SEARCH"></span></button>
                  <input type="text" v-model="fileSearchKeyword" placeholder="搜索书名或全库内容..." class="s-input" @keyup.enter="triggerSearch">
                  <button v-show="isShowingFileSearch" @click="clearFileSearch" class="s-clear">✖</button>
              </div>
              <div style="display: flex; gap: 15px; padding-left: 5px; font-size: 12px; color: var(--text-muted);">
                  <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" v-model="searchMode" value="name"> 搜文件名</label>
                  <label style="cursor:pointer; display:flex; align-items:center; gap:4px;"><input type="radio" v-model="searchMode" value="content" style="accent-color:var(--primary);"> 搜全文</label>
              </div>
          </div>
      </div>

      <div class="scroll-container" ref="scrollContainerRef">
          <!-- 搜索结果 -->
          <div v-if="isShowingFileSearch">
              <div v-if="isSearching" class="empty-hint">检索中...</div>
              <div v-else-if="fileSearchResults.length === 0" class="empty-hint">未找到匹配结果</div>
              <div v-else>
                  <div v-for="(item, idx) in fileSearchResults" :key="idx" class="item-row" @click="selectSearchResult(item)">
                      <div class="item-content" style="padding-left: 15px; white-space: normal; display: block;">
                          <div v-if="searchMode === 'name'" style="display:flex; align-items:center;">
                              <span class="icon-svg" v-html="item.type === 'folder' ? SVG_FOLDER : SVG_FILE"></span>
                              <span v-html="item.highlightedName"></span>
                          </div>
                          <div v-if="searchMode === 'content'">
                              <div style="font-weight:bold; font-size: 13px; margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center;">
                                  <span><span class="icon-svg" v-html="SVG_BOOK"></span> {{ item.bookName }}</span>
                                  <span style="color:var(--primary); font-size:12px;">{{ item.percent }}%</span>
                              </div>
                              <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5; background: rgba(0,0,0,0.02); padding: 6px; border-radius: 4px;" v-html="item.highlightedContext"></div>
                          </div>
                          <div v-if="item.parentDir && searchMode === 'name'" style="font-size:11px; opacity:0.5; margin-top:4px;">
                              <span class="icon-svg" v-html="SVG_FOLDER"></span> {{ item.parentDir }}
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <!-- 文件树 -->
          <div v-else>
              <div class="item-row folder" :class="{ active: store.currentPath === '' && !store.currentBookPath }" @click="clickRootFolder">
                  <div class="item-content"><span class="icon-svg" v-html="SVG_HOME"></span> 根目录</div>
              </div>
              <div v-for="node in visibleFileTree" :key="node.path" class="item-row" :class="[node.type, { 'active': store.currentPath === node.path && node.type === 'folder', 'reading-active': store.currentBookPath === node.path && node.type === 'file' }]" @click="clickTreeNode(node)">
                  <div class="item-content" :style="{ paddingLeft: (15 + node.level * 15) + 'px' }" :title="node.name">
                      <span class="icon-svg" v-html="getNodeIcon(node)"></span><span>{{ node.name }}</span>
                  </div>
                  <div class="item-actions" @click.stop>
                      <button class="act-btn" @click.stop="doRename(node)">名</button>
                      <button class="act-btn" @click.stop="store.clipboard = { action: 'copy', path: node.path, name: node.name }">复</button>
                      <button class="act-btn" @click.stop="store.clipboard = { action: 'move', path: node.path, name: node.name }">剪</button>
                      <button class="act-btn danger" @click.stop="doDelete(node)">删</button>
                  </div>
              </div>
              <div v-if="isLoadingFolder" class="empty-hint">加载中...</div>
          </div>
      </div>
      
      <!-- 底部工具栏 -->
      <div class="modern-bottom-area">
          <div class="m-path" @click="clickRootFolder" title="返回根目录">
              <span class="p-icon" v-html="SVG_PIN"></span> <span class="p-text">{{ displayPath }}</span> <span class="p-back">回退</span>
          </div>
          <div v-if="store.clipboard" class="m-clipboard">
              <button class="hero-btn btn-warning" @click="pasteClipboard">粘贴 [{{ store.clipboard.name }}]</button>
              <button class="hero-btn btn-ghost" @click="store.clipboard = null">取消</button>
          </div>
          <div class="m-actions">
              <label class="hero-btn btn-primary">上传小说文档
                <input type="file" multiple accept=".txt,.pdf,.docx" style="display:none" @change="uploadFiles($event)">
              </label>
              <div style="display:flex; gap:8px;">
                  <button class="hero-btn btn-ghost" style="flex:1;" @click="makeDir">新建分类</button>
                  <label class="hero-btn btn-ghost" style="flex:1;">批量传文件夹
                    <input type="file" webkitdirectory directory multiple style="display:none" @change="uploadFiles($event)">
                  </label>
              </div>
          </div>
      </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { store } from '../../store.js'

// 👑 引入纯净的业务逻辑外脑 (Composables)
// 这里的 ../../ 路径才是对的，因为这个文件在 src/components/sidebar/ 里面（二楼）
import { useSidebarTree } from '../../composables/sidebar/useSidebarTree.js'
import { useSidebarSearch } from '../../composables/sidebar/useSidebarSearch.js'
import { useSidebarFiles } from '../../composables/sidebar/useSidebarFiles.js'

// 图标常量
const SVG_HOME = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
const SVG_FOLDER = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
const SVG_FOLDER_OPEN = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.15 10H20a2 2 0 0 1 1.78 2.89l-1.56 3.12A2 2 0 0 1 18.44 17H4a2 2 0 0 1-1.78-2.89l1.56-3.12A2 2 0 0 1 5.56 10H12"></path><path d="M4 17V4a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v1"></path></svg>`;
const SVG_FILE = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
const SVG_BOOK = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
const SVG_PIN = `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const SVG_SEARCH = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

const scrollContainerRef = ref(null);

// 1. 挂载文件树外脑
const { folderCache, isLoadingFolder, fetchFolder, visibleFileTree, clickRootFolder, clickTreeNode, displayPath } = useSidebarTree(scrollContainerRef);

const getNodeIcon = (node) => node.type === 'file' ? SVG_FILE : (store.openFolders.has(node.path) ? SVG_FOLDER_OPEN : SVG_FOLDER);

// 2. 挂载外部文件操作外脑 (新建、删除、上传等)
const { doRename, doDelete, pasteClipboard, makeDir, uploadFiles } = useSidebarFiles(fetchFolder);

// 3. 挂载搜索外脑
const { searchMode, fileSearchKeyword, isShowingFileSearch, isSearching, fileSearchResults, clearFileSearch, triggerSearch, selectSearchResult } = useSidebarSearch(fetchFolder, folderCache, clickTreeNode);
</script>

<style scoped>
/* CSS 保持不变 */
.files-wrapper { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
.icon-svg { display: inline-flex; align-items: center; vertical-align: -2px; margin-right: 4px; }
.modern-search-bar { padding: 10px 15px; flex-shrink: 0; background: var(--bg); border-bottom: 1px solid var(--border-light); }
.search-capsule { display: flex; gap: 5px; }
.s-input { flex: 1; padding: 6px 10px; border: 1px solid var(--border-light); border-radius: 4px; font-size: 13px; color: var(--text); background: transparent; outline: none; }
.s-icon-btn, .s-clear { padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.s-icon-btn { background: var(--primary); color: white; }
.s-clear { background: var(--bg-muted); color: var(--text); }
.scroll-container { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 10px 0; }
.empty-hint { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 13px; }
.item-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; cursor: pointer; color: var(--text); font-size: 14px; transition: background 0.1s; }
.item-row:hover { background-color: rgba(0,0,0,0.03); }
.item-row.active { background-color: rgba(0,0,0,0.06); font-weight: bold; }
.item-row.reading-active { background-color: rgba(var(--primary-rgb), 0.12); border-left: 3px solid var(--primary); font-weight: bold; color: var(--primary); }
.item-content { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 10px; display: flex; align-items: center; }
.item-actions { display: none; gap: 2px; }
.item-row:hover .item-actions { display: flex; }
.act-btn { background: transparent; color: var(--text); border: 1px solid var(--border-light); border-radius: 2px; font-size: 11px; padding: 2px 4px; cursor: pointer; outline: none; }
.act-btn:hover { background: var(--bg-muted); }
.act-btn.danger:hover { background: #ef4444; color: white; border-color: #ef4444; }
.modern-bottom-area { background: var(--bg); border-top: 1px solid var(--border-light); flex-shrink: 0; padding-bottom: 10px; }
.m-path { padding: 10px 15px; font-size: 12px; color: var(--text); display: flex; align-items: center; cursor: pointer; border-bottom: 1px dashed var(--border-light); }
.p-text { flex: 1; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-back { color: var(--primary); }
.m-clipboard { padding: 10px 15px 0 15px; display: flex; gap: 10px; }
.m-actions { padding: 10px 15px; display: flex; flex-direction: column; gap: 8px; }
.hero-btn { width: 100%; border: 1px solid var(--border-light); border-radius: 4px; padding: 10px 0; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; background: transparent; color: var(--text); transition: all 0.2s; }
.hero-btn:hover { background: var(--bg-muted); border-color: var(--primary); color: var(--primary); }
.btn-primary { background-color: var(--primary); color: #fff; border: none; }
.btn-primary:hover { opacity: 0.9; }
.btn-warning { border-color: #f59e0b; color: #f59e0b; }
.btn-warning:hover { background: #f59e0b; color: white; }
@media (max-width: 768px) { .item-actions { display: flex; opacity: 0.7; } }
</style>