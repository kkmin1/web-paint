import '../style.css';
import { CanvasManager } from './canvas.js';
import { appState } from './state.js';
import { tools } from './tools.js';

const init = () => {
    console.log('Main.js initializing...');
    const canvasManager = new CanvasManager('canvas');
    const ctx = canvasManager.getContext();
    const canvas = canvasManager.getCanvas();

    // UI Elements
    const colorPicker = document.getElementById('colorPicker');
    const sizeInput = document.getElementById('sizeInput');
    const undoBtn = document.getElementById('undoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const savePngBtn = document.getElementById('savePngBtn');
    const saveJpgBtn = document.getElementById('saveJpgBtn');
    const fileInput = document.getElementById('fileInput');
    const importBtn = document.getElementById('importBtn');
    const canvasSizeDisplay = document.getElementById('canvasSize');
    const cursorPosDisplay = document.getElementById('cursorPos');

    // Tool Selection
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.setTool(btn.dataset.tool);
        });
    });

    // Color Picker
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            appState.setColor(e.target.value);
        });
    }

    // Size Input
    if (sizeInput) {
        sizeInput.addEventListener('input', (e) => {
            appState.setSize(e.target.value);
        });
    }



    // Font Controls
    const fontFamily = document.getElementById('fontFamily');
    if (fontFamily) {
        fontFamily.addEventListener('change', (e) => {
            appState.setFont(e.target.value);
        });
    }

    const fontSize = document.getElementById('fontSize');
    if (fontSize) {
        fontSize.addEventListener('input', (e) => {
            appState.fontSize = parseInt(e.target.value) || 24;
        });
    }



    // Action Buttons
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            appState.undo(ctx, canvas);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            canvasManager.clear();
            appState.saveState(canvas);
        });
    }

    if (savePngBtn) {
        savePngBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'painting.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }

    if (saveJpgBtn) {
        saveJpgBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'painting.jpg';
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            link.click();
        });
    }

    // Image Import
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const img = new Image();
                const objectUrl = URL.createObjectURL(file);

                img.onload = () => {
                    URL.revokeObjectURL(objectUrl);

                    canvas.width = img.width;
                    canvas.height = img.height;

                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    ctx.drawImage(img, 0, 0);

                    if (canvasSizeDisplay) {
                        canvasSizeDisplay.textContent = `${canvas.width} x ${canvas.height}px`;
                    }

                    appState.saveState(canvas);

                    // Reset zoom to 100% to ensure the image is fully visible and workable
                    updateZoom(1.0);
                };

                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    alert('이미지를 로드할 수 없습니다.');
                };

                img.src = objectUrl;
            }
        });
    }

    // Zoom Controls
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const canvasWrapper = document.querySelector('.canvas-wrapper');

    const updateZoom = (newZoom) => {
        appState.setZoom(newZoom);
        canvasWrapper.style.transform = `scale(${appState.zoomLevel})`;
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
        }
    };

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            updateZoom(appState.zoomLevel * 1.25);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            updateZoom(appState.zoomLevel / 1.25);
        });
    }

    // Helper to commit selection
    const commitSelection = () => {
        console.log('commitSelection called. Active:', appState.selectionActive);
        if (appState.selectionActive) {
            if (appState.isFloating) {
                if (appState.snapshot) {
                    ctx.putImageData(appState.snapshot, 0, 0);
                }
                if (appState.selectionImageData && appState.selectionRect) {
                    ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
                }
                appState.saveState(canvas);
            } else {
                appState.saveState(canvas);
            }
            appState.setSelection(false);
            appState.isFloating = false;
            appState.selectionImageData = null;
            appState.selectionRect = null;
            appState.snapshot = null;
        }
    };

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        console.log('Keydown:', e.key, e.code, 'Ctrl:', e.ctrlKey);

        // Zoom shortcuts
        if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.code === 'Equal')) {
            e.preventDefault();
            updateZoom(appState.zoomLevel * 1.25);
            return;
        }

        if (e.ctrlKey && (e.key === '-' || e.code === 'Minus')) {
            e.preventDefault();
            updateZoom(appState.zoomLevel / 1.25);
            return;
        }

        if (e.ctrlKey && (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0')) {
            e.preventDefault();
            updateZoom(1.0);
            return;
        }

        // Undo/Redo
        if (e.ctrlKey && (e.key.toLowerCase() === 'z' || e.code === 'KeyZ')) {
            e.preventDefault();
            console.log('Undo triggered');
            appState.undo(ctx, canvas);
        }

        if (e.ctrlKey && (e.key.toLowerCase() === 'y' || e.code === 'KeyY')) {
            e.preventDefault();
            console.log('Redo triggered');
            appState.redo(ctx, canvas);
        }

        // Clipboard
        if (e.ctrlKey && (e.key.toLowerCase() === 'c' || e.code === 'KeyC')) {
            console.log('Ctrl+C detected', { active: appState.selectionActive, hasData: !!appState.selectionImageData });
            if (appState.selectionActive && appState.selectionImageData) {
                appState.clipboard = appState.selectionImageData;
                console.log('Copied to clipboard', appState.clipboard);
            } else {
                console.warn('Copy failed: No active selection');
            }
        }

        if (e.ctrlKey && (e.key.toLowerCase() === 'x' || e.code === 'KeyX')) {
            console.log('Ctrl+X detected', { active: appState.selectionActive, hasData: !!appState.selectionImageData });
            if (appState.selectionActive && appState.selectionImageData) {
                appState.clipboard = appState.selectionImageData;

                if (!appState.isFloating) {
                    const { x, y, w, h } = appState.selectionRect;
                    const rx = w < 0 ? x + w : x;
                    const ry = h < 0 ? y + h : y;
                    const rw = Math.abs(w);
                    const rh = Math.abs(h);

                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(rx, ry, rw, rh);
                    appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
                }

                appState.setSelection(false);
                appState.isFloating = false;
                appState.selectionImageData = null;
                appState.selectionRect = null;
                appState.saveState(canvas);
                console.log('Cut executed');
            } else {
                console.warn('Cut failed: No active selection');
            }
        }

        if (e.ctrlKey && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
            console.log('Ctrl+V detected', { clipboard: !!appState.clipboard });
            if (appState.clipboard) {
                commitSelection();

                const x = 50;
                const y = 50;
                const w = appState.clipboard.width;
                const h = appState.clipboard.height;

                appState.selectionImageData = appState.clipboard;
                appState.selectionRect = { x, y, w, h };
                appState.originalSelectionRect = { ...appState.selectionRect };
                appState.setSelection(true, appState.selectionRect, appState.selectionImageData);
                appState.isFloating = true;

                appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
                ctx.putImageData(appState.snapshot, 0, 0);
                ctx.putImageData(appState.selectionImageData, x, y);
                tools.select.drawPreview(ctx, x, y, x + w, y + h);
                console.log('Paste executed');
            } else {
                console.warn('Paste failed: Clipboard empty');
            }
        }
    });

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            updateZoom(appState.zoomLevel * delta);
        }
    }, { passive: false });

    // Canvas Resize Logic
    let isResizing = false;
    let resizeDir = '';

    const resizeRight = document.getElementById('resizeRight');
    const resizeBottom = document.getElementById('resizeBottom');
    const resizeCorner = document.getElementById('resizeCorner');

    const startResize = (e, dir) => {
        isResizing = true;
        resizeDir = dir;
        e.preventDefault();
    };

    if (resizeRight) resizeRight.addEventListener('mousedown', (e) => startResize(e, 'right'));
    if (resizeBottom) resizeBottom.addEventListener('mousedown', (e) => startResize(e, 'bottom'));
    if (resizeCorner) resizeCorner.addEventListener('mousedown', (e) => startResize(e, 'corner'));

    window.addEventListener('mousemove', (e) => {
        if (isResizing) {
            const rect = canvas.getBoundingClientRect();
            if (resizeDir === 'right' || resizeDir === 'corner') {
                const newWidth = Math.max(100, e.clientX - rect.left);
                canvasManager.resize(newWidth, canvas.height);
            }
            if (resizeDir === 'bottom' || resizeDir === 'corner') {
                const newHeight = Math.max(100, e.clientY - rect.top);
                canvasManager.resize(canvas.width, newHeight);
            }
            canvasSizeDisplay.textContent = `${canvas.width} x ${canvas.height}px`;
        }

        if (e.target === canvas) {
            cursorPosDisplay.textContent = `${e.offsetX}, ${e.offsetY}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            appState.saveState(canvas);
        }
    });

    // Drawing Logic
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    const getCoordinates = (e) => {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const rect = canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        if (e.type === 'touchstart') {
            e.preventDefault();
        }
        
        const { x, y } = getCoordinates(e);

        if (appState.tool === 'select') {
            if (appState.selectionActive && appState.selectionRect) {
                const { x: sx, y: sy, w, h } = appState.selectionRect;
                if (x >= sx && x <= sx + w && y >= sy && y <= sy + h) {
                    appState.isMovingSelection = true;
                    startX = x;
                    startY = y;
                    return;
                }
            }
            commitSelection();
        }

        isDrawing = true;
        startX = x;
        startY = y;
        appState.startX = x;
        appState.startY = y;

        if (appState.tool === 'fill') {
            tools.fill.action(ctx, Math.floor(x), Math.floor(y), appState.color);
            appState.saveState(canvas);
            isDrawing = false;
        } else if (appState.tool === 'text') {
            console.log('Text tool activated! Creating input at canvas coords:', x, y);
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'text-input-overlay';
            textInput.style.position = 'fixed';

            // Convert canvas coordinates to viewport coordinates
            const rect = canvas.getBoundingClientRect();
            const zoom = appState.zoomLevel || 1;
            const viewportX = rect.left + (x * zoom);
            const viewportY = rect.top + (y * zoom);

            textInput.style.left = `${viewportX}px`;
            textInput.style.top = `${viewportY}px`;
            textInput.style.fontSize = `${appState.fontSize}px`;
            textInput.style.fontFamily = appState.fontFamily;
            textInput.style.zIndex = '10000';
            console.log('Text input positioned at viewport:', viewportX, viewportY);

            const finishText = () => {
                const text = textInput.value;
                console.log('Finishing text, value:', text);
                if (text) {
                    ctx.font = `${appState.fontSize}px ${appState.fontFamily}`;
                    ctx.fillStyle = appState.color;
                    ctx.fillText(text, x, y);
                    appState.saveState(canvas);
                }
                if (document.body.contains(textInput)) {
                    document.body.removeChild(textInput);
                }
            };

            textInput.addEventListener('keydown', (ke) => {
                if (ke.key === 'Enter') {
                    ke.preventDefault();
                    finishText();
                }
                if (ke.key === 'Escape') {
                    ke.preventDefault();
                    if (document.body.contains(textInput)) {
                        document.body.removeChild(textInput);
                    }
                }
            });

            textInput.addEventListener('blur', finishText);

            document.body.appendChild(textInput);
            console.log('Text input appended to body');
            setTimeout(() => {
                textInput.focus();
                console.log('Text input focused');
            }, 10);
            isDrawing = false;
        } else if (appState.tool === 'select') {
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } else if (['pencil', 'brush', 'eraser'].includes(appState.tool)) {
            ctx.strokeStyle = appState.color;
            ctx.lineWidth = appState.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    };

    const draw = (e) => {
        if (!isDrawing && !appState.isMovingSelection) return;

        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        const { x, y } = getCoordinates(e);

        if (appState.isMovingSelection && appState.selectionRect && appState.selectionImageData) {
            const dx = x - startX;
            const dy = y - startY;

            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }

            appState.selectionRect.x = appState.originalSelectionRect.x + dx;
            appState.selectionRect.y = appState.originalSelectionRect.y + dy;

            ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
            tools.select.drawPreview(ctx, appState.selectionRect.x, appState.selectionRect.y,
                appState.selectionRect.x + appState.selectionRect.w,
                appState.selectionRect.y + appState.selectionRect.h);
            return;
        }

        if (appState.tool === 'select') {
            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }
            tools.select.drawPreview(ctx, startX, startY, x, y);
        } else if (['pencil', 'brush', 'eraser'].includes(appState.tool)) {
            const tool = tools[appState.tool];
            if (tool && tool.draw) {
                tool.draw(ctx, x, y);
            }
        } else if (['rect', 'circle', 'ellipse', 'line'].includes(appState.tool)) {
            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }
            ctx.strokeStyle = appState.color;
            ctx.lineWidth = appState.size;
            const tool = tools[appState.tool];
            if (tool && tool.drawPreview) {
                tool.drawPreview(ctx, startX, startY, x, y);
            }
        }
    };

    const stopDrawing = (e) => {
        if (!isDrawing && !appState.isMovingSelection) return;

        if (appState.isMovingSelection) {
            appState.isMovingSelection = false;
            appState.originalSelectionRect = { ...appState.selectionRect };
            appState.saveState(canvas);
            return;
        }
        
        const { x, y } = getCoordinates(e);

        if (appState.tool === 'select') {
            const w = x - startX;
            const h = y - startY;

            if (Math.abs(w) > 5 && Math.abs(h) > 5) {
                const rx = w < 0 ? x : startX;
                const ry = h < 0 ? y : startY;
                const rw = Math.abs(w);
                const rh = Math.abs(h);

                const imageData = ctx.getImageData(rx, ry, rw, rh);
                appState.selectionImageData = imageData;
                appState.selectionRect = { x: rx, y: ry, w: rw, h: rh };
                appState.originalSelectionRect = { ...appState.selectionRect };
                appState.setSelection(true, appState.selectionRect, imageData);
                appState.isFloating = false;

                ctx.putImageData(appState.snapshot, 0, 0);
                ctx.putImageData(imageData, rx, ry);
                tools.select.drawPreview(ctx, rx, ry, rx + rw, ry + rh);
            }
        } else if (['pencil', 'brush', 'eraser'].includes(appState.tool)) {
            appState.saveState(canvas);
        } else if (['rect', 'circle', 'ellipse', 'line'].includes(appState.tool)) {
            appState.saveState(canvas);
        }

        isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Touch Event Listeners
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Initialize
    appState.saveState(canvas);
};

document.addEventListener('DOMContentLoaded', init);
