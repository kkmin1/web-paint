import { appState } from './state.js';

export const tools = {
    pencil: {
        draw: (ctx, x, y) => {
            ctx.globalAlpha = appState.opacity;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    brush: {
        draw: (ctx, x, y) => {
            ctx.globalAlpha = appState.opacity;
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    eraser: {
        draw: (ctx, x, y) => {
            // Use white color to erase
            const prevColor = ctx.strokeStyle;
            ctx.strokeStyle = '#ffffff';
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.strokeStyle = prevColor;
        }
    },
    rect: {
        drawPreview: (ctx, startX, startY, x, y) => {
            ctx.globalAlpha = appState.opacity;
            ctx.beginPath();
            ctx.rect(startX, startY, x - startX, y - startY);
            if (appState.isFill) {
                ctx.fillStyle = appState.color;
                ctx.fill();
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    circle: {
        drawPreview: (ctx, startX, startY, x, y) => {
            ctx.globalAlpha = appState.opacity;
            ctx.beginPath();
            const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            if (appState.isFill) {
                ctx.fillStyle = appState.color;
                ctx.fill();
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    ellipse: {
        drawPreview: (ctx, startX, startY, x, y) => {
            ctx.globalAlpha = appState.opacity;
            ctx.beginPath();
            const radiusX = Math.abs(x - startX);
            const radiusY = Math.abs(y - startY);
            ctx.ellipse(startX, startY, radiusX, radiusY, 0, 0, 2 * Math.PI);
            if (appState.isFill) {
                ctx.fillStyle = appState.color;
                ctx.fill();
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    line: {
        drawPreview: (ctx, startX, startY, x, y) => {
            ctx.globalAlpha = appState.opacity;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    text: {
        action: (ctx, x, y, text) => {
            if (!text) return;
            ctx.globalAlpha = appState.opacity;
            ctx.font = `${appState.size * 2}px Inter, sans-serif`; // Scale font size
            ctx.fillStyle = appState.color;
            ctx.fillText(text, x, y);
            ctx.globalAlpha = 1.0;
        }
    },
    fill: {
        action: (ctx, x, y, color) => {
            // Flood fill implementation (Opacity not typically applied to flood fill in simple paint apps, keeping as is)
            const canvas = ctx.canvas;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const startPos = (y * canvas.width + x) * 4;
            const startR = data[startPos];
            const startG = data[startPos + 1];
            const startB = data[startPos + 2];
            const startA = data[startPos + 3];

            // Parse hex color
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);

            if (startR === r && startG === g && startB === b && startA === 255) return;

            const stack = [[x, y]];

            while (stack.length) {
                const [cx, cy] = stack.pop();
                const pos = (cy * canvas.width + cx) * 4;

                if (cx < 0 || cx >= canvas.width || cy < 0 || cy >= canvas.height) continue;

                if (data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA) {
                    data[pos] = r;
                    data[pos + 1] = g;
                    data[pos + 2] = b;
                    data[pos + 3] = 255;

                    stack.push([cx + 1, cy]);
                    stack.push([cx - 1, cy]);
                    stack.push([cx, cy + 1]);
                    stack.push([cx, cy - 1]);
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }
    },
    select: {
        drawPreview: (ctx, startX, startY, x, y) => {
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#000';
            ctx.beginPath();
            ctx.rect(startX, startY, x - startX, y - startY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
};
