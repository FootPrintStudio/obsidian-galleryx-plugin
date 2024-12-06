import { GalleryItem } from './types';

export class FullscreenView {
    private container: HTMLElement;
    private currentItem: GalleryItem;
    private items: GalleryItem[];
    private currentIndex: number;
    private resolveLocalPath: (src: string) => string;

    constructor(items: GalleryItem[], startIndex: number, resolveLocalPath: (src: string) => string) {
        this.items = items;
        this.currentIndex = startIndex;
        this.currentItem = items[startIndex];
        this.resolveLocalPath = resolveLocalPath;
        this.createContainer();
    }

    private createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'galleryx-fullscreen-container';
        this.container.innerHTML = `
            <div class="galleryx-fullscreen-content"></div>
            <div class="galleryx-fullscreen-metadata"></div>
            <button class="galleryx-fullscreen-close">×</button>
            <button class="galleryx-fullscreen-prev">‹</button>
            <button class="galleryx-fullscreen-next">›</button>
        `;

        this.container.querySelector('.galleryx-fullscreen-close')?.addEventListener('click', () => this.close());
        this.container.querySelector('.galleryx-fullscreen-prev')?.addEventListener('click', () => this.navigate(-1));
        this.container.querySelector('.galleryx-fullscreen-next')?.addEventListener('click', () => this.navigate(1));

        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        document.body.appendChild(this.container);
        this.updateContent();
    }

    private updateContent() {
        const contentEl = this.container.querySelector('.galleryx-fullscreen-content');
        const metadataEl = this.container.querySelector('.galleryx-fullscreen-metadata');
        if (!contentEl || !metadataEl) return;
    
        contentEl.innerHTML = '';
    
        if (this.currentItem.isVideo) {
            const video = document.createElement('video');
            video.src = this.currentItem.src;
            video.controls = true;
            video.onerror = () => this.handleMediaError(contentEl, 'Video failed to load');
            contentEl.appendChild(video);
        } else {
            const img = document.createElement('img');
            if (this.currentItem.isLocal) {
                img.src = this.resolveLocalPath(this.currentItem.src);
            } else {
                img.src = this.currentItem.src;
            }
            img.onerror = () => this.handleMediaError(contentEl, 'Image failed to load');
            contentEl.appendChild(img);
        }
    
        metadataEl.innerHTML = `
            <p>Source: ${this.currentItem.src}</p>
            <p>Tags: ${this.currentItem.tags.join(', ')}</p>
        `;
    }

    private handleMediaError(contentEl: Element, message: string) {
        contentEl.innerHTML = `<div class="galleryx-error-message">${message}</div>`;
    }

    private navigate(direction: number) {
        this.currentIndex = (this.currentIndex + direction + this.items.length) % this.items.length;
        this.currentItem = this.items[this.currentIndex];
        this.updateContent();
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
        this.container.remove();
    }
}