import { GalleryItem } from './types';

export class FullscreenView {
    private container: HTMLElement;
    private currentItem: GalleryItem;
    private items: GalleryItem[];
    private currentIndex: number;
    private resolveLocalPath: (src: string) => string;
    private handleMouseMove: (e: MouseEvent) => void;
    private handleMouseUp: () => void;

    constructor(items: GalleryItem[], startIndex: number, resolveLocalPath: (src: string) => string) {
        this.items = items.filter(item => !item.isVideo);
        this.currentIndex = this.items.findIndex(item => item.src === items[startIndex].src);
        if (this.currentIndex === -1) this.currentIndex = 0;
        this.currentItem = this.items[this.currentIndex];
        this.resolveLocalPath = resolveLocalPath;
        this.createContainer();
    }

    private createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'galleryx-fullscreen-container';
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.container.style.zIndex = '9999';

        this.container.innerHTML = `
            <div class="galleryx-fullscreen-content" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;"></div>
            <div class="galleryx-fullscreen-metadata" style="position: absolute; bottom: 10px; left: 10px; color: white;"></div>
            <button class="galleryx-fullscreen-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
            ${this.items.length > 1 ? `
                <button class="galleryx-fullscreen-prev" style="position: absolute; top: 50%; left: 10px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">‹</button>
                <button class="galleryx-fullscreen-next" style="position: absolute; top: 50%; right: 10px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">›</button>
            ` : ''}
        `;

        this.container.querySelector('.galleryx-fullscreen-close')?.addEventListener('click', () => this.close());
        if (this.items.length > 1) {
            this.container.querySelector('.galleryx-fullscreen-prev')?.addEventListener('click', () => this.navigate(-1));
            this.container.querySelector('.galleryx-fullscreen-next')?.addEventListener('click', () => this.navigate(1));
        }

        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.close();
            }
        });

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.body.appendChild(this.container);
        this.updateContent();
    }

    private updateContent() {
        const contentEl = this.container.querySelector('.galleryx-fullscreen-content');
        const metadataEl = this.container.querySelector('.galleryx-fullscreen-metadata');
        if (!contentEl || !metadataEl) return;

        contentEl.innerHTML = '';

        const img = document.createElement('img');
        img.className = 'galleryx-fullscreen-image';
        if (this.currentItem.isLocal) {
            img.src = this.resolveLocalPath(this.currentItem.src);
        } else {
            img.src = this.currentItem.src;
        }
        img.onerror = () => this.handleMediaError(contentEl, 'Image failed to load');

        // Set initial styles
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.transition = 'transform 0.1s ease-out';

        contentEl.appendChild(img);

        metadataEl.innerHTML = `
            <p>Source: ${this.currentItem.src}</p>
            <p>Tags: ${this.currentItem.tags.join(', ')}</p>
        `;

        // Add zoom functionality
        let scale = 1;
        contentEl.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            scale = Math.min(Math.max(1, scale), 5); // Limit zoom between 1x and 5x
            updateTransform();
        });

        // Add drag functionality
        let isDragging = false;
        let startX: number, startY: number;
        let translateX = 0, translateY = 0;

        img.addEventListener('mousedown', (e: MouseEvent) => {
            if (e.button === 2) { // Right mouse button
                e.preventDefault();
                isDragging = true;
                startX = e.clientX - translateX;
                startY = e.clientY - translateY;
            }
        });

        this.handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                translateX = e.clientX - startX;
                translateY = e.clientY - startY;
                updateTransform();
            }
        };

        this.handleMouseUp = () => {
            isDragging = false;
        };

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);

        // Helper function to update transform
        const updateTransform = () => {
            img.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        };

    }

    private handleMediaError(contentEl: Element, message: string) {
        contentEl.innerHTML = `<div class="galleryx-error-message">${message}</div>`;
    }

    private navigate(direction: number) {
        if (this.items.length > 1) {
            this.currentIndex = (this.currentIndex + direction + this.items.length) % this.items.length;
            this.currentItem = this.items[this.currentIndex];
            this.updateContent();
        }
    }

    private handleKeyDown(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowLeft':
                this.navigate(-1);
                break;
            case 'ArrowRight':
                this.navigate(1);
                break;
            case 'Escape':
                this.close();
                break;
        }
    }

    private close() {
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.handleMouseMove) {
            document.removeEventListener('mousemove', this.handleMouseMove);
        }
        if (this.handleMouseUp) {
            document.removeEventListener('mouseup', this.handleMouseUp);
        }
        this.container.remove();
    }
}