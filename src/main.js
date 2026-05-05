import '../style.css';
import { CanvasManager } from './canvas.js';
import { appState } from './state.js';
import { tools } from './tools.js';

const init = () => {
    const canvasManager = new CanvasManager('canvas');
    const ctx = canvasManager.getContext();
    const canvas = canvasManager.getCanvas();

    const ui = {
        colorPicker: document.getElementById('colorPicker'),
        sizeInput: document.getElementById('sizeInput'),
        undoBtn: document.getElementById('undoBtn'),
        redoBtn: document.getElementById('redoBtn'),
        clearBtn: document.getElementById('clearBtn'),
        saveBtn: document.getElementById('saveBtn'),
        saveMenu: document.getElementById('saveMenu'),
        fileInput: document.getElementById('fileInput'),
        importBtn: document.getElementById('importBtn'),
        cropBtn: document.getElementById('cropBtn'),
        canvasSizeDisplay: document.getElementById('canvasSize'),
        cursorPosDisplay: document.getElementById('cursorPos'),
        colorSelectBtn: document.getElementById('colorSelectBtn'),
        colorModal: document.getElementById('colorModal'),
        colorModalBackdrop: document.getElementById('colorModalBackdrop'),
        colorModalClose: document.getElementById('colorModalClose'),
        colorHexInput: document.getElementById('colorHexInput'),
        colorPresets: document.getElementById('colorPresets'),
        sizeBtn: document.getElementById('sizeBtn'),
        sizeMenu: document.getElementById('sizeMenu'),
        fontFamilyBtn: document.getElementById('fontFamilyBtn'),
        fontFamilyMenu: document.getElementById('fontFamilyMenu'),
        fontSizeBtn: document.getElementById('fontSizeBtn'),
        fontSizeMenu: document.getElementById('fontSizeMenu'),
        workspace: document.querySelector('.workspace'),
        canvasWrapper: document.querySelector('.canvas-wrapper'),
        zoomInBtn: document.getElementById('zoomInBtn'),
        zoomOutBtn: document.getElementById('zoomOutBtn'),
        zoomLevelDisplay: document.getElementById('zoomLevel'),
        fontFamily: document.getElementById('fontFamily'),
        fontSize: document.getElementById('fontSize')
    };

    const viewport = {
        panX: 0,
        panY: 0,
        isPanning: false,
        pinchActive: false,
        startPanX: 0,
        startPanY: 0,
        startClientX: 0,
        startClientY: 0,
        startPinchDistance: 0,
        startPinchZoom: 1,
        pinchAnchorX: 0,
        pinchAnchorY: 0,
        imageLoaded: false
    };

    const dropdownStates = [];
    let isResizing = false;
    let resizeDir = '';
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartW = 0;
    let resizeStartH = 0;
    let resizeBufferCanvas = null;
    let isDrawing = false;
    let startX = 0;
    let startY = 0;

    const clampZoom = (value) => Math.max(appState.minZoom, Math.min(appState.maxZoom, value));
    const updateCanvasSizeLabel = () => {
        if (ui.canvasSizeDisplay) {
            ui.canvasSizeDisplay.textContent = `${canvas.width} x ${canvas.height}px`;
        }
    };

    const updatePanClasses = () => {
        if (!ui.workspace) return;
        ui.workspace.classList.toggle('is-panning', viewport.isPanning || viewport.pinchActive);
        ui.workspace.classList.toggle('pan-ready', viewport.imageLoaded && !(viewport.isPanning || viewport.pinchActive));
    };

    const applyViewportTransform = () => {
        if (ui.canvasWrapper) {
            ui.canvasWrapper.style.transform = `translate(${viewport.panX}px, ${viewport.panY}px) scale(${appState.zoomLevel})`;
        }
        if (ui.zoomLevelDisplay) {
            ui.zoomLevelDisplay.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
        }
        updatePanClasses();
    };

    const getCanvasCoordinatesFromClient = (clientX, clientY) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / appState.zoomLevel,
            y: (clientY - rect.top) / appState.zoomLevel
        };
    };

    const setPan = (panX, panY) => {
        viewport.panX = panX;
        viewport.panY = panY;
        applyViewportTransform();
    };

    const updateZoom = (newZoom, clientX = null, clientY = null) => {
        const nextZoom = clampZoom(newZoom);
        const prevZoom = appState.zoomLevel;
        if (prevZoom === nextZoom) return;

        if (clientX !== null && clientY !== null) {
            const rect = canvas.getBoundingClientRect();
            const anchor = getCanvasCoordinatesFromClient(clientX, clientY);
            const baseLeft = rect.left - viewport.panX;
            const baseTop = rect.top - viewport.panY;
            appState.setZoom(nextZoom);
            viewport.panX = clientX - baseLeft - (anchor.x * nextZoom);
            viewport.panY = clientY - baseTop - (anchor.y * nextZoom);
        } else {
            appState.setZoom(nextZoom);
        }

        applyViewportTransform();
    };

    const resetViewport = (fitToScreen = false) => {
        viewport.panX = 0;
        viewport.panY = 0;

        if (fitToScreen && ui.workspace) {
            const widthScale = (ui.workspace.clientWidth - 40) / canvas.width;
            const heightScale = (ui.workspace.clientHeight - 40) / canvas.height;
            appState.setZoom(clampZoom(Math.min(widthScale, heightScale, 1)));
        } else {
            appState.setZoom(1);
        }

        applyViewportTransform();
    };

    const getCoordinates = (event) => {
        const point = event.touches?.[0] || event.changedTouches?.[0] || event;
        return getCanvasCoordinatesFromClient(point.clientX, point.clientY);
    };

    const getTouchDistance = (touches) => {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.hypot(dx, dy);
    };

    const getTouchCenter = (touches) => ({
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
    });

    const closeAllDropdowns = () => {
        dropdownStates.forEach(({ menu }) => menu.classList.add('hidden'));
    };

    const toggleDropdown = (menuEl, onOpen) => {
        if (!menuEl) return;
        const willOpen = menuEl.classList.contains('hidden');
        closeAllDropdowns();
        if (willOpen) {
            onOpen?.();
            menuEl.classList.remove('hidden');
        }
    };

    const registerDropdown = (triggerEl, menuEl, onOpen) => {
        if (!triggerEl || !menuEl) return;
        triggerEl.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleDropdown(menuEl, onOpen);
        });
        dropdownStates.push({ menu: menuEl, trigger: triggerEl });
    };

    const setupSelectDropdown = (selectEl, triggerEl, menuEl, labelPrefix) => {
        if (!selectEl || !triggerEl || !menuEl) return;

        const updateLabel = () => {
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            triggerEl.textContent = `${labelPrefix}: ${selectedOption ? selectedOption.textContent : ''}`;
        };

        const renderMenu = () => {
            menuEl.innerHTML = '';
            Array.from(selectEl.options).forEach((option) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'dropdown-item';
                item.textContent = option.textContent;
                if (option.value === selectEl.value) item.classList.add('active');
                item.addEventListener('click', () => {
                    selectEl.value = option.value;
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    updateLabel();
                    closeAllDropdowns();
                    renderMenu();
                });
                menuEl.appendChild(item);
            });
        };

        registerDropdown(triggerEl, menuEl, renderMenu);
        selectEl.addEventListener('change', () => {
            updateLabel();
            renderMenu();
        });
        updateLabel();
        renderMenu();
    };

    const createExportCanvas = (format) => {
        if (format !== 'jpg') return canvas;
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        const offCtx = offscreenCanvas.getContext('2d');
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        offCtx.drawImage(canvas, 0, 0);
        return offscreenCanvas;
    };

    const triggerBrowserDownload = (blob, filename) => {
        const link = document.createElement('a');
        const blobUrl = URL.createObjectURL(blob);
        link.download = filename;
        link.href = blobUrl;
        link.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    };

    const saveImageFile = async (format) => {
        const defaultName = 'painting';
        const extension = format === 'png' ? '.png' : '.jpg';
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const exportCanvas = createExportCanvas(format);
        const canUseSavePicker = typeof window.showSaveFilePicker === 'function' && window.isSecureContext;

        const createBlob = () => new Promise((resolve, reject) => {
            exportCanvas.toBlob((result) => {
                if (!result) {
                    reject(new Error('toBlob failed'));
                    return;
                }
                resolve(result);
            }, mimeType, format === 'png' ? undefined : 0.95);
        });

        try {
            if (canUseSavePicker) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `${defaultName}${extension}`,
                    types: [{
                        description: format === 'png' ? 'PNG Image' : 'JPEG Image',
                        accept: { [mimeType]: [extension] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(await createBlob());
                await writable.close();
                return;
            }

            const filename = prompt('파일 이름을 입력하세요:', defaultName);
            if (!filename) return;
            const normalizedName = filename.trim() || defaultName;
            const lowerName = normalizedName.toLowerCase();
            const hasExtension = format === 'png'
                ? lowerName.endsWith('.png')
                : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
            const blob = await createBlob();
            alert('이 브라우저/환경은 폴더 선택 저장을 지원하지 않습니다. Chrome/Edge 최신 버전 + https 또는 localhost에서 가능합니다.');
            triggerBrowserDownload(blob, hasExtension ? normalizedName : normalizedName + extension);
        } catch (error) {
            if (error?.name === 'AbortError') return;
            if (error?.name === 'SecurityError' || error?.name === 'NotAllowedError') {
                alert('저장 위치 선택 권한이 차단되었습니다. 브라우저 권한을 허용하거나 https/localhost에서 다시 시도해주세요.');
                return;
            }
            console.error(`Failed to save ${format.toUpperCase()}:`, error);
            alert('저장에 실패했습니다. 브라우저 권한 또는 파일 접근 권한을 확인해주세요.');
        }
    };

    const resizeCanvasPreserve = (targetWidth, targetHeight, sourceCanvas = null) => {
        const nextWidth = Math.max(100, Math.round(targetWidth));
        const nextHeight = Math.max(100, Math.round(targetHeight));
        const buffer = sourceCanvas || (() => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
            return tempCanvas;
        })();

        canvas.width = nextWidth;
        canvas.height = nextHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buffer, 0, 0);
        updateCanvasSizeLabel();
    };

    const fitCanvasToViewport = () => {
        if (!ui.workspace) return;
        resizeCanvasPreserve(
            Math.max(320, ui.workspace.clientWidth - 20),
            Math.max(240, ui.workspace.clientHeight - 20)
        );
        resetViewport(false);
    };

    const updateCropButtonVisibility = () => {
        if (ui.cropBtn) {
            ui.cropBtn.style.display = appState.selectionActive && appState.selectionRect ? 'inline-flex' : 'none';
        }
    };

    const commitSelection = () => {
        if (!appState.selectionActive) return;
        if (appState.isFloating) {
            if (appState.snapshot) ctx.putImageData(appState.snapshot, 0, 0);
            if (appState.selectionImageData && appState.selectionRect) {
                ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
            }
        }
        appState.saveState(canvas);
        appState.setSelection(false);
        appState.isFloating = false;
        appState.selectionImageData = null;
        appState.selectionRect = null;
        appState.snapshot = null;
        updateCropButtonVisibility();
    };

    const cropToSelection = () => {
        if (!appState.selectionActive || !appState.selectionRect) return;
        const { x, y, w, h } = appState.selectionRect;
        if (w < 10 || h < 10) {
            alert('선택 영역이 너무 작습니다. 최소 10x10 픽셀이 필요합니다.');
            return;
        }

        const cropX = Math.max(0, Math.min(x, canvas.width));
        const cropY = Math.max(0, Math.min(y, canvas.height));
        const cropW = Math.min(w, canvas.width - cropX);
        const cropH = Math.min(h, canvas.height - cropY);
        const croppedImageData = ctx.getImageData(cropX, cropY, cropW, cropH);
        canvas.width = cropW;
        canvas.height = cropH;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cropW, cropH);
        ctx.putImageData(croppedImageData, 0, 0);
        appState.setSelection(false);
        appState.isFloating = false;
        appState.selectionImageData = null;
        appState.selectionRect = null;
        appState.snapshot = null;
        viewport.imageLoaded = true;
        updateCanvasSizeLabel();
        resetViewport(true);
        updateCropButtonVisibility();
        appState.saveState(canvas);
    };

    const normalizeHex = (value) => {
        const raw = value?.trim().replace('#', '');
        return /^[0-9a-fA-F]{6}$/.test(raw || '') ? `#${raw.toUpperCase()}` : null;
    };

    const syncColorButton = (color) => {
        if (!ui.colorSelectBtn) return;
        ui.colorSelectBtn.style.color = '#ffffff';
        ui.colorSelectBtn.style.borderColor = color;
        ui.colorSelectBtn.style.boxShadow = `inset 0 -8px 0 ${color}, 0 2px 4px rgba(0, 0, 0, 0.2)`;
    };

    const applyColor = (color) => {
        appState.setColor(color);
        syncColorButton(color);
        if (ui.colorPicker) ui.colorPicker.value = color;
        if (ui.colorHexInput) ui.colorHexInput.value = color.toUpperCase();
    };

    const presetColors = ['#000000', '#1F2937', '#4B5563', '#9CA3AF', '#FFFFFF', '#DC2626', '#EA580C', '#EAB308', '#16A34A', '#0D9488', '#2563EB', '#4F46E5', '#9333EA', '#DB2777', '#D97706', '#64748B'];
    presetColors.forEach((color) => {
        if (!ui.colorPresets) return;
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'color-swatch';
        swatch.style.background = color;
        swatch.title = color;
        swatch.setAttribute('aria-label', color);
        swatch.addEventListener('click', () => applyColor(color));
        ui.colorPresets.appendChild(swatch);
    });

    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach((button) => {
        button.addEventListener('click', () => {
            toolButtons.forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            appState.setTool(button.dataset.tool);
        });
    });

    setupSelectDropdown(ui.sizeInput, ui.sizeBtn, ui.sizeMenu, '선굵기');
    setupSelectDropdown(ui.fontFamily, ui.fontFamilyBtn, ui.fontFamilyMenu, '폰트');
    setupSelectDropdown(ui.fontSize, ui.fontSizeBtn, ui.fontSizeMenu, '폰트크기');

    const renderSaveMenu = () => {
        if (!ui.saveMenu) return;
        ui.saveMenu.innerHTML = '';
        [['PNG 저장', 'png'], ['JPG 저장', 'jpg']].forEach(([label, value]) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'dropdown-item';
            item.textContent = label;
            const handleSave = async (event) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                closeAllDropdowns();
                await saveImageFile(value);
            };
            item.addEventListener('click', handleSave);
            item.addEventListener('touchend', handleSave, { passive: false });
            ui.saveMenu.appendChild(item);
        });
    };

    registerDropdown(ui.saveBtn, ui.saveMenu, renderSaveMenu);
    ui.saveBtn?.addEventListener('touchend', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleDropdown(ui.saveMenu, renderSaveMenu);
    }, { passive: false });

    ui.colorSelectBtn?.addEventListener('click', () => {
        ui.colorModal?.classList.remove('hidden');
        ui.colorModal?.setAttribute('aria-hidden', 'false');
    });
    ui.colorModalBackdrop?.addEventListener('click', () => ui.colorModal?.classList.add('hidden'));
    ui.colorModalClose?.addEventListener('click', () => ui.colorModal?.classList.add('hidden'));
    ui.colorPicker?.addEventListener('input', (event) => applyColor(event.target.value));
    ui.colorHexInput?.addEventListener('change', (event) => {
        const normalized = normalizeHex(event.target.value);
        event.target.value = normalized || appState.color.toUpperCase();
        if (normalized) applyColor(normalized);
    });
    ui.sizeInput?.addEventListener('change', (event) => appState.setSize(event.target.value));
    ui.fontFamily?.addEventListener('change', (event) => appState.setFont(event.target.value));
    ui.fontSize?.addEventListener('change', (event) => {
        appState.fontSize = parseInt(event.target.value, 10) || 16;
    });
    ui.undoBtn?.addEventListener('click', () => appState.undo(ctx, canvas));
    ui.redoBtn?.addEventListener('click', () => appState.redo(ctx, canvas));
    ui.clearBtn?.addEventListener('click', () => {
        canvasManager.clear();
        appState.saveState(canvas);
    });
    ui.cropBtn?.addEventListener('click', cropToSelection);
    ui.zoomInBtn?.addEventListener('click', () => updateZoom(appState.zoomLevel * 1.25));
    ui.zoomOutBtn?.addEventListener('click', () => updateZoom(appState.zoomLevel / 1.25));
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.control-dropdown')) closeAllDropdowns();
    });

    ui.importBtn?.addEventListener('click', () => {
        ui.fileInput.value = '';
        ui.fileInput.click();
    });
    ui.fileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            viewport.imageLoaded = true;
            updateCanvasSizeLabel();
            resetViewport(true);
            appState.saveState(canvas);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            alert('이미지를 로드할 수 없습니다.');
        };
        img.src = objectUrl;
    });

    ui.workspace?.addEventListener('mousedown', (event) => {
        if (!viewport.imageLoaded || event.button !== 2) return;
        viewport.isPanning = true;
        viewport.startClientX = event.clientX;
        viewport.startClientY = event.clientY;
        viewport.startPanX = viewport.panX;
        viewport.startPanY = viewport.panY;
        event.preventDefault();
        updatePanClasses();
    });
    ui.workspace?.addEventListener('contextmenu', (event) => {
        if (event.target.closest('.canvas-wrapper')) event.preventDefault();
    });
    ui.workspace?.addEventListener('touchstart', (event) => {
        if (!viewport.imageLoaded || event.touches.length !== 2) return;
        const center = getTouchCenter(event.touches);
        const anchor = getCanvasCoordinatesFromClient(center.x, center.y);
        viewport.pinchActive = true;
        viewport.isPanning = false;
        viewport.startPinchDistance = getTouchDistance(event.touches);
        viewport.startPinchZoom = appState.zoomLevel;
        viewport.pinchAnchorX = anchor.x;
        viewport.pinchAnchorY = anchor.y;
        event.preventDefault();
        updatePanClasses();
    }, { passive: false });
    ui.workspace?.addEventListener('touchmove', (event) => {
        if (!viewport.imageLoaded || !viewport.pinchActive || event.touches.length !== 2) return;
        const center = getTouchCenter(event.touches);
        const distance = getTouchDistance(event.touches);
        const rect = canvas.getBoundingClientRect();
        const baseLeft = rect.left - viewport.panX;
        const baseTop = rect.top - viewport.panY;
        const nextZoom = clampZoom(viewport.startPinchZoom * (distance / viewport.startPinchDistance));
        appState.setZoom(nextZoom);
        viewport.panX = center.x - baseLeft - (viewport.pinchAnchorX * nextZoom);
        viewport.panY = center.y - baseTop - (viewport.pinchAnchorY * nextZoom);
        applyViewportTransform();
        event.preventDefault();
    }, { passive: false });
    ui.workspace?.addEventListener('touchend', (event) => {
        if (event.touches.length < 2) {
            viewport.pinchActive = false;
            updatePanClasses();
        }
    });

    ui.canvasWrapper?.addEventListener('wheel', (event) => {
        if (!viewport.imageLoaded) return;
        event.preventDefault();
        updateZoom(appState.zoomLevel * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX, event.clientY);
    }, { passive: false });

    const resizeRight = document.getElementById('resizeRight');
    const resizeBottom = document.getElementById('resizeBottom');
    const resizeCorner = document.getElementById('resizeCorner');
    const startResize = (event, dir) => {
        isResizing = true;
        resizeDir = dir;
        resizeStartX = event.clientX;
        resizeStartY = event.clientY;
        resizeStartW = canvas.width;
        resizeStartH = canvas.height;
        resizeBufferCanvas = document.createElement('canvas');
        resizeBufferCanvas.width = canvas.width;
        resizeBufferCanvas.height = canvas.height;
        resizeBufferCanvas.getContext('2d').drawImage(canvas, 0, 0);
        event.preventDefault();
    };
    resizeRight?.addEventListener('mousedown', (event) => startResize(event, 'right'));
    resizeBottom?.addEventListener('mousedown', (event) => startResize(event, 'bottom'));
    resizeCorner?.addEventListener('mousedown', (event) => startResize(event, 'corner'));

    window.addEventListener('mousemove', (event) => {
        if (viewport.isPanning) {
            setPan(
                viewport.startPanX + (event.clientX - viewport.startClientX),
                viewport.startPanY + (event.clientY - viewport.startClientY)
            );
            return;
        }
        if (isResizing) {
            const nextWidth = (resizeDir === 'right' || resizeDir === 'corner')
                ? Math.max(100, resizeStartW + ((event.clientX - resizeStartX) / appState.zoomLevel))
                : resizeStartW;
            const nextHeight = (resizeDir === 'bottom' || resizeDir === 'corner')
                ? Math.max(100, resizeStartH + ((event.clientY - resizeStartY) / appState.zoomLevel))
                : resizeStartH;
            resizeCanvasPreserve(nextWidth, nextHeight, resizeBufferCanvas);
        }
        if (event.target === canvas && ui.cursorPosDisplay) {
            const coords = getCanvasCoordinatesFromClient(event.clientX, event.clientY);
            ui.cursorPosDisplay.textContent = `${Math.round(coords.x)}, ${Math.round(coords.y)}px`;
        }
    });
    window.addEventListener('mouseup', () => {
        viewport.isPanning = false;
        isResizing = false;
        resizeBufferCanvas = null;
        updatePanClasses();
    });

    const startDrawingHandler = (event) => {
        if (event.button === 2 || viewport.isPanning || viewport.pinchActive || isResizing) return;
        if (event.type === 'touchstart') {
            if (event.touches.length > 1) return;
            event.preventDefault();
        }

        const { x, y } = getCoordinates(event);
        if (appState.tool === 'select') {
            if (appState.selectionActive && appState.selectionRect) {
                const { x: sx, y: sy, w, h } = appState.selectionRect;
                if (x >= sx && x <= sx + w && y >= sy && y <= sy + h) {
                    appState.isMovingSelection = true;
                    startX = x;
                    startY = y;
                    appState.originalSelectionRect = { ...appState.selectionRect };
                    return;
                }
            }
            commitSelection();
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }

        isDrawing = true;
        startX = x;
        startY = y;
        if (appState.tool === 'fill') {
            tools.fill.action(ctx, Math.floor(x), Math.floor(y), appState.color);
            appState.saveState(canvas);
            isDrawing = false;
        } else if (appState.tool === 'text') {
            const textInput = document.createElement('input');
            const rect = canvas.getBoundingClientRect();
            const zoom = appState.zoomLevel || 1;
            textInput.type = 'text';
            textInput.className = 'text-input-overlay';
            textInput.style.left = `${rect.left + (x * zoom)}px`;
            textInput.style.top = `${rect.top + (y * zoom)}px`;
            textInput.style.fontSize = `${appState.fontSize * zoom}px`;
            textInput.style.fontFamily = appState.fontFamily;
            textInput.style.textAlign = 'center';

            const finishText = () => {
                const text = textInput.value.trim();
                if (text) {
                    ctx.save();
                    ctx.font = `${appState.fontSize}px ${appState.fontFamily}`;
                    ctx.fillStyle = appState.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(text, x, y);
                    ctx.restore();
                    appState.saveState(canvas);
                }
                if (document.body.contains(textInput)) {
                    document.body.removeChild(textInput);
                }
            };

            textInput.addEventListener('keydown', (keyboardEvent) => {
                if (keyboardEvent.key === 'Enter') {
                    keyboardEvent.preventDefault();
                    finishText();
                } else if (keyboardEvent.key === 'Escape') {
                    keyboardEvent.preventDefault();
                    if (document.body.contains(textInput)) {
                        document.body.removeChild(textInput);
                    }
                }
            });
            textInput.addEventListener('blur', finishText);
            document.body.appendChild(textInput);
            setTimeout(() => textInput.focus(), 10);
            isDrawing = false;
        } else if (['brush', 'pencil', 'eraser'].includes(appState.tool)) {
            ctx.strokeStyle = appState.tool === 'eraser' ? '#ffffff' : appState.color;
            ctx.lineWidth = appState.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else if (appState.tool !== 'select') {
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    };

    const drawHandler = (event) => {
        if (viewport.isPanning || viewport.pinchActive || (!isDrawing && !appState.isMovingSelection)) return;
        if (event.type === 'touchmove') {
            if (event.touches.length > 1) return;
            event.preventDefault();
        }
        const { x, y } = getCoordinates(event);
        if (appState.isMovingSelection && appState.selectionRect && appState.selectionImageData) {
            const dx = x - startX;
            const dy = y - startY;
            if (appState.snapshot) ctx.putImageData(appState.snapshot, 0, 0);
            appState.selectionRect.x = appState.originalSelectionRect.x + dx;
            appState.selectionRect.y = appState.originalSelectionRect.y + dy;
            ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
            tools.select.drawPreview(ctx, appState.selectionRect.x, appState.selectionRect.y, appState.selectionRect.x + appState.selectionRect.w, appState.selectionRect.y + appState.selectionRect.h);
            return;
        }
        if (appState.tool === 'select') {
            if (appState.snapshot) ctx.putImageData(appState.snapshot, 0, 0);
            tools.select.drawPreview(ctx, startX, startY, x, y);
        } else if (['brush', 'pencil', 'eraser'].includes(appState.tool)) {
            tools[appState.tool].draw(ctx, x, y);
        } else {
            if (appState.snapshot) ctx.putImageData(appState.snapshot, 0, 0);
            ctx.strokeStyle = appState.color;
            ctx.lineWidth = appState.size;
            tools[appState.tool]?.drawPreview?.(ctx, startX, startY, x, y);
        }
    };

    const stopDrawingHandler = (event) => {
        if (viewport.isPanning || viewport.pinchActive || (!isDrawing && !appState.isMovingSelection)) return;
        if (appState.isMovingSelection) {
            appState.isMovingSelection = false;
            appState.originalSelectionRect = { ...appState.selectionRect };
            if (appState.snapshot) ctx.putImageData(appState.snapshot, 0, 0);
            if (appState.selectionImageData && appState.selectionRect) ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            tools.select.drawPreview(ctx, appState.selectionRect.x, appState.selectionRect.y, appState.selectionRect.x + appState.selectionRect.w, appState.selectionRect.y + appState.selectionRect.h);
            return;
        }

        const { x, y } = event ? getCoordinates(event) : { x: startX, y: startY };
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
                updateCropButtonVisibility();
            } else if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }
        } else if (appState.tool !== 'text' && appState.tool !== 'fill') {
            if (!['brush', 'pencil', 'eraser'].includes(appState.tool) && appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
                ctx.strokeStyle = appState.color;
                ctx.lineWidth = appState.size;
                tools[appState.tool]?.drawPreview?.(ctx, startX, startY, x, y);
            }
            appState.saveState(canvas);
        }
        isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawingHandler);
    canvas.addEventListener('mousemove', drawHandler);
    canvas.addEventListener('mouseup', stopDrawingHandler);
    canvas.addEventListener('mouseleave', (event) => { if (isDrawing) stopDrawingHandler(event); });
    canvas.addEventListener('touchstart', startDrawingHandler, { passive: false });
    canvas.addEventListener('touchmove', drawHandler, { passive: false });
    canvas.addEventListener('touchend', stopDrawingHandler);
    canvas.addEventListener('touchcancel', stopDrawingHandler);

    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        if (event.key === 'Escape' && ui.colorModal && !ui.colorModal.classList.contains('hidden')) {
            ui.colorModal.classList.add('hidden');
            ui.colorModal.setAttribute('aria-hidden', 'true');
            return;
        }
        if (event.ctrlKey && (event.key === '+' || event.key === '=' || event.code === 'Equal')) {
            event.preventDefault();
            updateZoom(appState.zoomLevel * 1.25);
        } else if (event.ctrlKey && (event.key === '-' || event.code === 'Minus')) {
            event.preventDefault();
            updateZoom(appState.zoomLevel / 1.25);
        } else if (event.ctrlKey && (event.key === '0' || event.code === 'Digit0' || event.code === 'Numpad0')) {
            event.preventDefault();
            resetViewport(false);
        }
    });

    applyColor(appState.color);
    const isMobileLike = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    if (isMobileLike) fitCanvasToViewport();
    else updateCanvasSizeLabel();
    applyViewportTransform();
    appState.saveState(canvas);
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        init();
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('초기화 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
    }
});
