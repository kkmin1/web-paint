export class State {
  constructor() {
    this.tool = 'brush';
    this.color = '#000000';
    this.size = 5;
    this.opacity = 1.0;
    this.isFill = false;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.snapshot = null; // For shapes preview

    // Selection State
    this.selectionActive = false;
    this.selectionRect = null; // {x, y, w, h}
    this.selectionImageData = null;
    this.isMovingSelection = false;
    this.clipboard = null;
    this.isFloating = false;
    this.originalSelectionRect = null;

    // Text Tool State
    this.fontFamily = 'Inter, sans-serif';
    this.fontSize = 24;
    this.isBold = false;
    this.isItalic = false;

    // Zoom State
    this.zoomLevel = 1.0;
    this.minZoom = 0.1;
    this.maxZoom = 8.0;

    // History for Undo/Redo
    this.history = [];
    this.historyStep = -1;
    this.maxHistory = 50;

    // Listeners
    this.listeners = [];
  }

  setTool(tool) {
    this.tool = tool;
    this.notify('tool', tool);
  }

  setColor(color) {
    this.color = color;
    this.notify('color', color);
  }

  setSize(size) {
    this.size = parseInt(size);
    this.notify('size', this.size);
  }

  setOpacity(opacity) {
    this.opacity = parseFloat(opacity);
    this.notify('opacity', this.opacity);
  }

  setFill(isFill) {
    this.isFill = isFill;
    this.notify('fill', this.isFill);
  }

  setSelection(active, rect = null, imageData = null) {
    console.log(`State: setSelection(${active})`, rect);
    this.selectionActive = active;
    this.selectionRect = rect;
    this.selectionImageData = imageData;
    this.notify('selection', { active, rect });
  }

  setFont(family) {
    this.fontFamily = family;
    this.notify('font', this.fontFamily);
  }

  setBold(isBold) {
    this.isBold = isBold;
    this.notify('bold', this.isBold);
  }

  setItalic(isItalic) {
    this.isItalic = isItalic;
    this.notify('italic', this.isItalic);
  }

  setZoom(level) {
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    this.notify('zoom', this.zoomLevel);
  }

  saveState(canvas) {
    // Remove redo steps if any
    if (this.historyStep < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyStep + 1);
    }

    this.history.push(canvas.toDataURL());
    this.historyStep++;

    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.historyStep--;
    }

    this.notify('history', this.historyStep);
  }

  undo(ctx, canvas) {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.restoreState(ctx, canvas);
    }
  }

  redo(ctx, canvas) {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep++;
      this.restoreState(ctx, canvas);
    }
  }

  restoreState(ctx, canvas) {
    const img = new Image();
    img.src = this.history[this.historyStep];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    this.notify('history', this.historyStep);
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify(property, value) {
    this.listeners.forEach(listener => listener(property, value));
  }
}

export const appState = new State();
