import { store } from '../../store.js';

export function useDragResize() {
    const startResize = (e) => {
        e.preventDefault();
        document.body.style.userSelect = 'none'; 
        window.addEventListener('mousemove', doResize);
        window.addEventListener('mouseup', stopResize);
    }
    const doResize = (e) => {
        let newWidth = Math.max(200, Math.min(600, e.clientX));
        store.updateConfig('sidebarWidth', newWidth);
    }
    const stopResize = () => {
        document.body.style.userSelect = ''; 
        window.removeEventListener('mousemove', doResize);
        window.removeEventListener('mouseup', stopResize);
    }

    return { startResize };
}