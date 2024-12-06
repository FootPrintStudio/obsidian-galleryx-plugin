import { GalleryItem } from './types';
import { App, TFile } from 'obsidian';

export class FullscreenView {
    private container: HTMLElement;
    private currentItem: GalleryItem;
    private items: GalleryItem[];
    private currentIndex: number;
    private resolveLocalPath: (src: string) => string;
    private handleMouseMove: (e: MouseEvent) => void;
    private handleMouseUp: () => void;
    private app: App;
    private tagInput: HTMLInputElement | null = null;

    constructor(app: App, items: GalleryItem[], startIndex: number, resolveLocalPath: (src: string) => string) {
        this.app = app;
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
            <div class="galleryx-fullscreen-metadata" style="position: absolute; bottom: 10px; left: 10px; right: 10px; color: white; width: 100%;"></div>
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
        <div style="display: flex; width: 100%; max-width: 100%; background-color: rgba(0, 0, 0, 0.7); padding: 10px; border-radius: 5px;">
            <div style="flex: 0 0 auto; margin-right: 20px;">
                <p style="margin: 0 0 5px 0;">Source:</p>
                <p style="margin: 0 0 10px 0; word-break: break-all;">${this.currentItem.src}</p>
                <button class="galleryx-copy-metadata" style="background: none; border: 1px solid white; color: white; padding: 5px 10px; cursor: pointer;">Copy Source</button>
            </div>
            <div style="flex: 1; overflow: hidden;">
                <p style="margin: 0 0 5px 0;">Tags:</p>
                <input type="text" class="galleryx-tags-input" value="${this.currentItem.tags.join(', ')}" style="width: 100%; background: rgba(255,255,255,0.1); color: white; border: none; padding: 5px;">
                <button class="galleryx-update-tags" style="background: none; border: 1px solid white; color: white; padding: 5px 10px; cursor: pointer; margin-top: 5px;">Update Tags</button>
            </div>
        </div>
    `;

        const copyButton = metadataEl.querySelector('.galleryx-copy-metadata');
        copyButton?.addEventListener('click', () => this.copyMetadataToClipboard());

        const updateTagsButton = metadataEl.querySelector('.galleryx-update-tags');
        const tagsInput = metadataEl.querySelector('.galleryx-tags-input') as HTMLInputElement;
        this.tagInput = tagsInput;  // Store the reference to the tag input
        updateTagsButton?.addEventListener('click', () => {
            const newTags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
            this.updateTags(newTags);
        });

        // Add zoom functionality
        let scale = 1;
        contentEl.addEventListener('wheel', (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale *= delta;
            scale = Math.min(Math.max(0.5, scale), 5); // Limit zoom between 0.5x and 5x
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

    private copyMetadataToClipboard() {
        const metadata = `${this.currentItem.src}`;

        navigator.clipboard.writeText(metadata).then(() => {
            // Provide visual feedback
            const copyButton = this.container.querySelector('.galleryx-copy-metadata');
            if (copyButton) {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = originalText;
                }, 2000);
            }
        }).catch(err => {
            console.error('Failed to copy metadata: ', err);
        });
    }

    private async updateTags(newTags: string[]) {
        this.currentItem.tags = newTags;

        // Find the file containing the image
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            let updated = false;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(this.currentItem.src)) {
                    // Found the line with the image
                    const tagRegex = /\{.*?\}/;
                    if (tagRegex.test(lines[i])) {
                        // Replace existing tags
                        lines[i] = lines[i].replace(tagRegex, `{${newTags.join(', ')}}`);
                    } else {
                        // Add new tags
                        lines[i] += ` {${newTags.join(', ')}}`;
                    }
                    updated = true;
                    break;
                }
            }

            if (updated) {
                await this.app.vault.modify(file, lines.join('\n'));
                break;
            }
        }

        // Update the UI
        this.updateContent();
    }

    private navigate(direction: number) {
        if (this.items.length > 1) {
            this.currentIndex = (this.currentIndex + direction + this.items.length) % this.items.length;
            this.currentItem = this.items[this.currentIndex];
            this.updateContent();
        }
    }

    private handleKeyDown(event: KeyboardEvent) {
        // Check if the tag input is focused
        if (this.tagInput && document.activeElement === this.tagInput) {
            if (event.key === 'Escape') {
                this.tagInput.blur();  // Remove focus from the input
                event.preventDefault();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                const newTags = this.tagInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                this.updateTags(newTags);
            }
            return;
        }
    
        // If the tag input is not focused, handle navigation as before
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