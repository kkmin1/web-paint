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
    const redoBtn = document.getElementById('redoBtn');
    const clearBtn = document.getElementById('clearBtn');
    const savePngBtn = document.getElementById('savePngBtn');
    const saveJpgBtn = document.getElementById('saveJpgBtn');
    const fileInput = document.getElementById('fileInput');
    const importBtn = document.getElementById('importBtn');
    const cropBtn = document.getElementById('cropBtn');
    const canvasSizeDisplay = document.getElementById('canvasSize');
    const cursorPosDisplay = document.getElementById('cursorPos');
    const colorSelectBtn = document.getElementById('colorSelectBtn');
    const workspace = document.querySelector('.workspace');

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
    const syncColorButton = (color) => {
        if (colorSelectBtn) {
            colorSelectBtn.style.background = color;
            colorSelectBtn.style.color = '#ffffff';
            colorSelectBtn.style.borderColor = '#2d4f7d';
        }
    };

    if (colorSelectBtn && colorPicker) {
        colorSelectBtn.addEventListener('click', () => {
            colorPicker.click();
        });
    }

    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const selectedColor = e.target.value;
            appState.setColor(selectedColor);
            syncColorButton(selectedColor);
        });
    }

    syncColorButton(appState.color);

    // Size Input
    if (sizeInput) {
        sizeInput.addEventListener('change', (e) => {
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
        fontSize.addEventListener('change', (e) => {
            appState.fontSize = parseInt(e.target.value, 10) || 16;
        });
    }

    // Action Buttons
    if (undoBtn) {
        undoBtn.addEventListener('click', () => {
            console.log('Undo button clicked');
            appState.undo(ctx, canvas);
        });
    }

    if (redoBtn) {
        redoBtn.addEventListener('click', () => {
            console.log('Redo button clicked');
            appState.redo(ctx, canvas);
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            console.log('Clear button clicked');
            canvasManager.clear();
            appState.saveState(canvas);
        });
    }

    const createExportCanvas = (format) => {
        if (format === 'jpg') {
            const offscreenCanvas = document.createElement('canvas');
            offscreenCanvas.width = canvas.width;
            offscreenCanvas.height = canvas.height;
            const offCtx = offscreenCanvas.getContext('2d');
            offCtx.fillStyle = '#ffffff';
            offCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
            offCtx.drawImage(canvas, 0, 0);
            return offscreenCanvas;
        }
        return canvas;
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
        const filename = prompt('파일 이름을 입력하세요:', defaultName);
        if (!filename) return;

        const normalizedName = filename.trim() || defaultName;
        const extension = format === 'png' ? '.png' : '.jpg';
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const lowerName = normalizedName.toLowerCase();
        const hasValidExtension = format === 'png'
            ? lowerName.endsWith('.png')
            : lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
        const finalFilename = hasValidExtension ? normalizedName : normalizedName + extension;
        const exportCanvas = createExportCanvas(format);

        try {
            const blob = await new Promise((resolve, reject) => {
                exportCanvas.toBlob(
                    (result) => {
                        if (!result) {
                            reject(new Error('toBlob failed'));
                            return;
                        }
                        resolve(result);
                    },
                    mimeType,
                    format === 'png' ? undefined : 0.95
                );
            });

            if (window.showSaveFilePicker) {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: finalFilename,
                    types: [{
                        description: format === 'png' ? 'PNG Image' : 'JPEG Image',
                        accept: { [mimeType]: [extension] }
                    }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            }

            triggerBrowserDownload(blob, finalFilename);
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            console.error(`Failed to save ${format.toUpperCase()}:`, error);
            alert('저장에 실패했습니다. 브라우저 권한 또는 파일 접근 권한을 확인해주세요.');
        }
    };

    if (savePngBtn) {
        savePngBtn.addEventListener('click', async () => {
            console.log('Save PNG button clicked');
            await saveImageFile('png');
        });
    }

    if (saveJpgBtn) {
        saveJpgBtn.addEventListener('click', async () => {
            console.log('Save JPG button clicked');
            await saveImageFile('jpg');
        });
    }

    // Image Import
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', () => {
            console.log('Import button clicked');
            // 같은 파일을 다시 로드할 수 있도록 value를 리셋
            fileInput.value = '';
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            console.log('File selected:', file.name);
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

                const saved = appState.saveState(canvas);
                if (!saved) {
                    alert('이미지는 불러왔지만 히스토리 저장에 실패했습니다. 큰 이미지에서는 Undo 단계가 제한될 수 있습니다.');
                }
                updateZoom(1.0);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                alert('이미지를 로드할 수 없습니다.');
            };

            img.src = objectUrl;
        });
    }

    // Zoom Controls
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    const canvasWrapper = document.querySelector('.canvas-wrapper');

    const updateZoom = (newZoom) => {
        appState.setZoom(newZoom);
        if (canvasWrapper) {
            canvasWrapper.style.transform = `scale(${appState.zoomLevel})`;
        }
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${Math.round(appState.zoomLevel * 100)}%`;
        }
    };

    const resizeCanvasPreserve = (targetWidth, targetHeight, sourceCanvas = null) => {
        const nextWidth = Math.max(100, Math.round(targetWidth));
        const nextHeight = Math.max(100, Math.round(targetHeight));
        const buffer = sourceCanvas || (() => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);
            return tempCanvas;
        })();

        canvas.width = nextWidth;
        canvas.height = nextHeight;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(buffer, 0, 0);

        if (canvasSizeDisplay) {
            canvasSizeDisplay.textContent = `${canvas.width} x ${canvas.height}px`;
        }
    };

    const fitCanvasToViewport = () => {
        if (!workspace) return;
        const targetWidth = Math.max(320, workspace.clientWidth - 20);
        const targetHeight = Math.max(240, workspace.clientHeight - 20);
        resizeCanvasPreserve(targetWidth, targetHeight);
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

    // Helper to update crop button visibility
    const updateCropButtonVisibility = () => {
        if (cropBtn) {
            if (appState.selectionActive && appState.selectionRect) {
                cropBtn.style.display = 'inline-flex';
            } else {
                cropBtn.style.display = 'none';
            }
        }
    };

    // Crop to selection
    const cropToSelection = () => {
        if (!appState.selectionActive || !appState.selectionRect) {
            console.warn('No active selection to crop');
            return;
        }

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

        if (canvasSizeDisplay) {
            canvasSizeDisplay.textContent = `${cropW} x ${cropH}px`;
        }

        appState.setSelection(false);
        appState.isFloating = false;
        appState.selectionImageData = null;
        appState.selectionRect = null;
        appState.snapshot = null;

        updateCropButtonVisibility();
        appState.saveState(canvas);
    };

    if (cropBtn) {
        cropBtn.addEventListener('click', () => {
            cropToSelection();
        });
    }

    // Helper to commit selection
    const commitSelection = () => {
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

            updateCropButtonVisibility();
        }
    };

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // 텍스트 입력 중에는 단축키 무시
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

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
            appState.undo(ctx, canvas);
            return;
        }

        if (e.ctrlKey && (e.key.toLowerCase() === 'y' || e.code === 'KeyY')) {
            e.preventDefault();
            appState.redo(ctx, canvas);
            return;
        }

        // Clipboard
        if (e.ctrlKey && (e.key.toLowerCase() === 'c' || e.code === 'KeyC')) {
            if (appState.selectionActive && appState.selectionImageData) {
                appState.clipboard = appState.selectionImageData;
                console.log('Copied to clipboard');
            }
            return;
        }

        if (e.ctrlKey && (e.key.toLowerCase() === 'x' || e.code === 'KeyX')) {
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
            }
            return;
        }

        if (e.ctrlKey && (e.key.toLowerCase() === 'v' || e.code === 'KeyV')) {
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
            }
            return;
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
    let resizeStartX = 0;
    let resizeStartY = 0;
    let resizeStartW = 0;
    let resizeStartH = 0;
    let resizeBufferCanvas = null;

    const resizeRight = document.getElementById('resizeRight');
    const resizeBottom = document.getElementById('resizeBottom');
    const resizeCorner = document.getElementById('resizeCorner');

    const startResize = (e, dir) => {
        isResizing = true;
        resizeDir = dir;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartW = canvas.width;
        resizeStartH = canvas.height;
        resizeBufferCanvas = document.createElement('canvas');
        resizeBufferCanvas.width = canvas.width;
        resizeBufferCanvas.height = canvas.height;
        const bufferCtx = resizeBufferCanvas.getContext('2d');
        bufferCtx.drawImage(canvas, 0, 0);
        e.preventDefault();
    };

    if (resizeRight) resizeRight.addEventListener('mousedown', (e) => startResize(e, 'right'));
    if (resizeBottom) resizeBottom.addEventListener('mousedown', (e) => startResize(e, 'bottom'));
    if (resizeCorner) resizeCorner.addEventListener('mousedown', (e) => startResize(e, 'corner'));

    window.addEventListener('mousemove', (e) => {
        if (isResizing) {
            // 리사이즈: 드래그 델타를 이용해 캔버스 크기 조정
            let nextWidth = resizeStartW;
            let nextHeight = resizeStartH;

            if (resizeDir === 'right' || resizeDir === 'corner') {
                nextWidth = Math.max(100, resizeStartW + (e.clientX - resizeStartX) / appState.zoomLevel);
            }
            if (resizeDir === 'bottom' || resizeDir === 'corner') {
                nextHeight = Math.max(100, resizeStartH + (e.clientY - resizeStartY) / appState.zoomLevel);
            }

            resizeCanvasPreserve(nextWidth, nextHeight, resizeBufferCanvas);
        }

        // 커서 위치 표시
        if (e.target === canvas && cursorPosDisplay) {
            const rect = canvas.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) / appState.zoomLevel);
            const y = Math.round((e.clientY - rect.top) / appState.zoomLevel);
            cursorPosDisplay.textContent = `${x}, ${y}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizeBufferCanvas = null;
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
        // 줌 레벨을 고려해 뷰포트 좌표를 캔버스 좌표로 변환
        const x = (clientX - rect.left) / appState.zoomLevel;
        const y = (clientY - rect.top) / appState.zoomLevel;

        return { x, y };
    };

    const startDrawing = (e) => {
        // 멀티 터치는 브라우저 스크롤/줌 제스처를 허용
        if (e.type === 'touchstart') {
            if (e.touches && e.touches.length > 1) return;
            e.preventDefault();
        }
        // 리사이즈 중이면 그리기 무시
        if (isResizing) return;

        const { x, y } = getCoordinates(e);

        // 선택 도구: 이미 선택 영역이 있고 그 안을 클릭하면 이동 모드
        if (appState.tool === 'select') {
            if (appState.selectionActive && appState.selectionRect) {
                const { x: sx, y: sy, w, h } = appState.selectionRect;
                if (x >= sx && x <= sx + w && y >= sy && y <= sy + h) {
                    appState.isMovingSelection = true;
                    startX = x;
                    startY = y;
                    appState.originalSelectionRect = { ...appState.selectionRect };
                    return; // 이동 모드 시작, 새 선택 시작 안 함
                }
            }
            // 선택 영역 바깥 클릭 시 기존 선택 커밋 후 새 선택 시작
            commitSelection();
            isDrawing = true;
            startX = x;
            startY = y;
            appState.startX = x;
            appState.startY = y;
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            return;
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
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'text-input-overlay';
            textInput.style.position = 'fixed';

            const rect = canvas.getBoundingClientRect();
            const zoom = appState.zoomLevel || 1;
            const viewportX = rect.left + (x * zoom);
            const viewportY = rect.top + (y * zoom);

            textInput.style.left = `${viewportX}px`;
            textInput.style.top = `${viewportY}px`;
            textInput.style.fontSize = `${appState.fontSize * zoom}px`;
            textInput.style.fontFamily = appState.fontFamily;
            textInput.style.zIndex = '10000';

            const finishText = () => {
                const text = textInput.value;
                if (text) {
                    ctx.font = `${appState.fontSize}px ${appState.fontFamily}`;
                    ctx.fillStyle = appState.color;
                    ctx.fillText(text, x, y + appState.fontSize); // baseline 보정
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
            setTimeout(() => {
                textInput.focus();
            }, 10);
            isDrawing = false;
        } else if (['brush', 'pencil', 'eraser'].includes(appState.tool)) {
            ctx.strokeStyle = appState.tool === 'eraser' ? '#ffffff' : appState.color;
            ctx.lineWidth = appState.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            // 도형 도구 (rect, ellipse, line, triangle 등): 스냅샷 저장
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
    };

    const draw = (e) => {
        if (!isDrawing && !appState.isMovingSelection) return;

        if (e.type === 'touchmove') {
            // 두 손가락 이상은 캔버스 그리기를 중단하고 브라우저 제스처에 위임
            if (e.touches && e.touches.length > 1) {
                isDrawing = false;
                return;
            }
            e.preventDefault();
        }

        const { x, y } = getCoordinates(e);

        // 선택 영역 이동
        if (appState.isMovingSelection && appState.selectionRect && appState.selectionImageData) {
            const dx = x - startX;
            const dy = y - startY;

            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }

            appState.selectionRect.x = appState.originalSelectionRect.x + dx;
            appState.selectionRect.y = appState.originalSelectionRect.y + dy;

            ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
            tools.select.drawPreview(ctx,
                appState.selectionRect.x, appState.selectionRect.y,
                appState.selectionRect.x + appState.selectionRect.w,
                appState.selectionRect.y + appState.selectionRect.h
            );
            return;
        }

        if (appState.tool === 'select') {
            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }
            tools.select.drawPreview(ctx, startX, startY, x, y);
        } else if (['brush', 'pencil', 'eraser'].includes(appState.tool)) {
            const tool = tools[appState.tool];
            if (tool && tool.draw) {
                tool.draw(ctx, x, y);
            }
        } else if (['rect', 'circle', 'ellipse', 'line', 'triangle'].includes(appState.tool)) {
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

        // 선택 이동 완료
        if (appState.isMovingSelection) {
            appState.isMovingSelection = false;
            appState.originalSelectionRect = { ...appState.selectionRect };
            // 이동 후 snapshot 업데이트 (이동된 이미지를 포함)
            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }
            if (appState.selectionImageData && appState.selectionRect) {
                ctx.putImageData(appState.selectionImageData, appState.selectionRect.x, appState.selectionRect.y);
            }
            appState.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // 선택 영역 다시 그리기
            if (appState.selectionRect) {
                tools.select.drawPreview(ctx,
                    appState.selectionRect.x, appState.selectionRect.y,
                    appState.selectionRect.x + appState.selectionRect.w,
                    appState.selectionRect.y + appState.selectionRect.h
                );
            }
            return;
        }

        // e가 없거나 mouseleave의 경우 마지막 좌표 사용
        let x = startX, y = startY;
        if (e && (e.clientX !== undefined || e.touches || e.changedTouches)) {
            const coords = getCoordinates(e);
            x = coords.x;
            y = coords.y;
        }

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
            } else {
                // 너무 작은 선택은 취소
                if (appState.snapshot) {
                    ctx.putImageData(appState.snapshot, 0, 0);
                }
            }
        } else if (['brush', 'pencil', 'eraser'].includes(appState.tool)) {
            appState.saveState(canvas);
        } else if (['rect', 'circle', 'ellipse', 'line', 'triangle'].includes(appState.tool)) {
            if (appState.snapshot) {
                ctx.putImageData(appState.snapshot, 0, 0);
            }
            ctx.strokeStyle = appState.color;
            ctx.lineWidth = appState.size;
            const tool = tools[appState.tool];
            if (tool && tool.drawPreview) {
                tool.drawPreview(ctx, startX, startY, x, y);
            }
            appState.saveState(canvas);
        }

        isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', (e) => {
        // mouseleave 시 그리기 중이었으면 종료
        if (isDrawing) {
            stopDrawing(e);
        }
    });

    // Touch Event Listeners
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    canvas.addEventListener('touchcancel', stopDrawing);

    // Initialize
    const isMobileLike = window.matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    if (isMobileLike) {
        fitCanvasToViewport();
    } else if (canvasSizeDisplay) {
        canvasSizeDisplay.textContent = `${canvas.width} x ${canvas.height}px`;
    }
    appState.saveState(canvas);
    console.log('Initialization complete.');
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        init();
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('초기화 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.');
    }
});
