/* src/composables/useTheme.js - 主题与字体逻辑抽离 */
import { watch, onMounted } from 'vue';
import { store } from '../../store.js';

export function useTheme() {
    // --- 初始化与字体挂载 ---
    onMounted(async () => {
        try {
            const res = await fetch('/api/fonts');
            const fonts = await res.json();
            store.customFonts = fonts;
            if (fonts.length > 0) {
                let css = '';
                fonts.forEach(font => {
                    const fontName = font.split('.')[0];
                    css += `@font-face { font-family: '${fontName}'; src: url('/api/fonts/files/${encodeURIComponent(font)}'); }\n`;
                });
                const styleEl = document.createElement('style'); 
                styleEl.innerHTML = css; 
                document.head.appendChild(styleEl);
            }
        } catch(e) {}
    });

    // --- CSS 变量响应式监听 ---
    watch(() => store.config, (newConf) => {
        document.body.className = `theme-${newConf.theme}`;
        
        const root = document.documentElement;
        root.style.setProperty('--font-size', newConf.fontSize + 'px');
        root.style.setProperty('--line-height', newConf.lineHeight);
        root.style.setProperty('--para-space', newConf.paraSpace + 'em');
        root.style.setProperty('--content-w', newConf.contentWidth + 'px');
        root.style.setProperty('--ui-font', newConf.uiFontFamily);
        root.style.setProperty('--reader-font', newConf.readerFontFamily);
        
        if (newConf.primaryColor === 'green') {
            root.style.setProperty('--primary', '#10b981'); 
            root.style.setProperty('--primary-rgb', '16, 185, 129');
        } else {
            root.style.setProperty('--primary', '#3b6991'); 
            root.style.setProperty('--primary-rgb', '59, 105, 145');
        }
    }, { deep: true, immediate: true });
}