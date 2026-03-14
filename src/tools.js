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
            // main.js의 startDrawing에서 이미 strokeStyle을 #ffffff로 설정함
            ctx.lineTo(x, y);
            ctx.stroke();
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
            const radiusX = Math.abs(x - startX) / 2;
            const radiusY = Math.abs(y - startY) / 2;
            const centerX = startX + (x - startX) / 2;
            const centerY = startY + (y - startY) / 2;
            ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
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
    triangle: {
        drawPreview: (ctx, startX, startY, x, y) => {
            ctx.globalAlpha = appState.opacity;
            const topX = (startX + x) / 2;
            const topY = startY;
            const leftX = startX;
            const leftY = y;
            const rightX = x;
            const rightY = y;

            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            if (appState.isFill) {
                ctx.fillStyle = appState.color;
                ctx.fill();
            }
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    },
    text: {
        action: (ctx, x, y, text) => {
            if (!text) return;
            ctx.globalAlpha = appState.opacity;
            ctx.font = `${appState.fontSize}px ${appState.fontFamily}`;
            ctx.fillStyle = appState.color;
            ctx.fillText(text, x, y);
            ctx.globalAlpha = 1.0;
        }
    },
    fill: {
        action: (ctx, x, y, color) => {
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
            ctx.save();
            ctx.setLineDash([8, 4]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0047d4';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 1;
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.rect(startX, startY, x - startX, y - startY);
            ctx.stroke();
            ctx.restore();
        }
    }
};
