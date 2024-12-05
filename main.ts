import { Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';

interface GalleryItem {
    src: string;
    isLocal: boolean;
    isVideo: boolean;
    tags: string[];
}

interface GallerySettings {
    type: string;
    flexboxHeight?: string;
    columns?: number;
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
        const { settings, contentStartIndex } = this.extractSettings(lines);
        const items = this.parseGalleryItems(lines.slice(contentStartIndex));
    
        const galleryEl = this.createGalleryElement(items, settings);
        el.appendChild(galleryEl);
    }
    
    extractSettings(lines: string[]): { settings: GallerySettings, contentStartIndex: number } {
        let settings: GallerySettings = { type: 'flexbox' };
        let contentStartIndex = 0;
    
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('settings:') || line.startsWith('flexboxheight:') || line.startsWith('columns:')) {
                const parsedSettings = this.parseSettings(line);
                settings = { ...settings, ...parsedSettings };
                contentStartIndex = i + 1;
            } else {
                break;
            }
        }
    
        return { settings, contentStartIndex };
    }
    
    parseSettings(settingsLine: string): Partial<GallerySettings> {
        const settings: Partial<GallerySettings> = {};
        
        const typeMatch = settingsLine.match(/settings:\s*(\w+)/);
        if (typeMatch) {
            settings.type = typeMatch[1];
        }
    
        const flexboxHeightMatch = settingsLine.match(/flexboxheight:\s*(\d+px)/);
        if (flexboxHeightMatch) {
            settings.flexboxHeight = flexboxHeightMatch[1];
        }
    
        const columnsMatch = settingsLine.match(/columns:\s*(\d+)/);
        if (columnsMatch) {
            settings.columns = parseInt(columnsMatch[1]);
        }
    
        return settings;
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

    createGalleryElement(items: GalleryItem[], settings: GallerySettings): HTMLElement {
        if (settings.type === 'single' && items.length === 1) {
            return this.createSingleGalleryItem(items[0]);
        }
    
        const galleryEl = document.createElement('div');
        galleryEl.className = `galleryx-container galleryx-${settings.type}`;
    
        if (settings.type === 'flexbox' && settings.flexboxHeight) {
            galleryEl.style.setProperty('--flexbox-height', settings.flexboxHeight);
        } else if ((settings.type === 'grid' || settings.type === 'video-grid') && settings.columns) {
            galleryEl.style.setProperty('--columns', settings.columns.toString());
        }
    
        items.forEach(item => {
            const itemEl = this.createGalleryItemElement(item);
            galleryEl.appendChild(itemEl);
        });
    
        return galleryEl;
    }
    
    createGalleryItemElement(item: GalleryItem): HTMLElement {
        const itemEl = document.createElement('div');
        itemEl.className = 'galleryx-item';
    
        const contentEl = item.isVideo ? document.createElement('video') : document.createElement('img');
        contentEl.src = item.isLocal ? this.getLocalFilePath(item.src) : item.src;
        
        if (item.isVideo) {
            (contentEl as HTMLVideoElement).controls = true;
        } else {
            (contentEl as HTMLImageElement).alt = item.src;
        }
    
        itemEl.appendChild(contentEl);
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