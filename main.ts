import { Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';

interface GalleryItem {
    src: string;
    isLocal: boolean;
    isVideo: boolean;
    tags: string[];
}

export default class GalleryXPlugin extends Plugin {
    async onload() {
        console.log('Loading GalleryX plugin');

        this.registerMarkdownCodeBlockProcessor('galleryx', this.processGalleryBlock.bind(this));
        this.registerMarkdownPostProcessor(this.processInlineGallery.bind(this));
    }

    onunload() {
        console.log('Unloading GalleryX plugin');
    }

    processGalleryBlock(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const lines = source.split('\n');
        const settings = this.parseSettings(lines[0]);
        const items = this.parseGalleryItems(lines.slice(1));

        const galleryEl = this.createGalleryElement(items, settings);
        el.appendChild(galleryEl);
    }

    processInlineGallery(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        const codeBlocks = el.querySelectorAll('code, pre > code');
        codeBlocks.forEach((code) => {
            if (code.className === 'language-galleryx-single' || code.textContent?.trim().startsWith('galleryx-single:')) {
                let content = code.textContent?.trim() || '';
                if (content.startsWith('galleryx-single:')) {
                    content = content.substring('galleryx-single:'.length).trim();
                }
                const item = this.parseGalleryItems([content])[0];
                if (item) {
                    const galleryEl = this.createGalleryElement([item], { type: 'single' });
                    const wrapper = document.createElement('div');
                    wrapper.className = 'galleryx-single-wrapper';
                    wrapper.appendChild(galleryEl);
                    
                    ctx.addChild(new MarkdownRenderChild(wrapper));
                    if (code.parentElement?.tagName === 'PRE') {
                        code.parentElement.replaceWith(wrapper);
                    } else {
                        code.replaceWith(wrapper);
                    }
                }
            }
        });
    }

    parseSettings(settingsLine: string): { type: string } {
        const settings = { type: 'flexbox' };
        const match = settingsLine.match(/settings:\s*(\w+)/);
        if (match) {
            settings.type = match[1];
        }
        return settings;
    }

    parseGalleryItems(lines: string[]): GalleryItem[] {
        return lines.map(line => {
            const [src, tagsString] = line.split('{');
            const trimmedSrc = src.trim();
            const isLocal = trimmedSrc.startsWith('![[') && trimmedSrc.endsWith(']]');
            const isVideo = trimmedSrc.match(/\.(mp4|webm|ogg)$/i) !== null;
            const tags = tagsString ? tagsString.replace('}', '').split(',').map(tag => tag.trim()) : [];
            return { src: trimmedSrc, isLocal, isVideo, tags };
        }).filter(item => item.src);
    }

    createGalleryElement(items: GalleryItem[], settings: { type: string }): HTMLElement {
        if (settings.type === 'single' && items.length === 1) {
            return this.createSingleGalleryItem(items[0]);
        }
    
        const galleryEl = document.createElement('div');
        galleryEl.className = `galleryx-container galleryx-${settings.type}`;
    
        items.forEach(item => {
            const itemEl = this.createGalleryItemElement(item);
            galleryEl.appendChild(itemEl);
        });
    
        return galleryEl;
    }

    createGalleryItemElement(item: GalleryItem): HTMLElement {
        const itemEl = document.createElement('div');
        itemEl.className = 'galleryx-item';

        if (item.isVideo) {
            const videoEl = document.createElement('video');
            videoEl.src = item.isLocal ? this.getLocalFilePath(item.src) : item.src;
            videoEl.controls = true;
            itemEl.appendChild(videoEl);
        } else {
            const imgEl = document.createElement('img');
            imgEl.src = item.isLocal ? this.getLocalFilePath(item.src) : item.src;
            imgEl.alt = item.src;
            itemEl.appendChild(imgEl);
        }

        itemEl.addEventListener('click', () => this.openFullscreen(item));

        return itemEl;
    }

    createSingleGalleryItem(item: GalleryItem): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'galleryx-single-item';
    
        if (item.isVideo) {
            const videoEl = document.createElement('video');
            videoEl.src = item.isLocal ? this.getLocalFilePath(item.src) : item.src;
            videoEl.controls = true;
            wrapper.appendChild(videoEl);
        } else {
            const imgEl = document.createElement('img');
            imgEl.src = item.isLocal ? this.getLocalFilePath(item.src) : item.src;
            imgEl.alt = item.src;
            wrapper.appendChild(imgEl);
        }
    
        wrapper.addEventListener('click', () => this.openFullscreen(item));
    
        return wrapper;
    }

    getLocalFilePath(src: string): string {
        // Remove the ![[]] syntax and get the actual file name
        const fileName = src.replace(/!\[\[(.*?)\]\]/, '$1');
        const file = this.app.vault.getAbstractFileByPath(fileName);
        if (file instanceof TFile) {
            return this.app.vault.getResourcePath(file);
        }
        return fileName;
    }

    openFullscreen(item: GalleryItem) {
        // Implement fullscreen functionality here
        console.log('Opening fullscreen for:', item);
    }
}