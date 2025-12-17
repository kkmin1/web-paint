export class CanvasManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.clear();
    }

    getCanvas() {
        return this.canvas;
    }

    getContext() {
        return this.ctx;
    }

    resize(width, height) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.putImageData(imageData, 0, 0);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
