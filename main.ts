import { Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, TFile } from 'obsidian';
import { FullscreenView } from './fullscreen';
import { GalleryItem, GallerySettings } from './types';

export default class GalleryXPlugin extends Plugin {
    private items: GalleryItem[] = [];
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

    createFilterElement(items: GalleryItem[], galleryEl: HTMLElement): HTMLElement {
        const filterContainer = document.createElement('div');
        filterContainer.className = 'galleryx-filter-container';
    
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = 'Filter by tags...';
        filterInput.className = 'galleryx-filter-input';
    
        const filterButton = document.createElement('button');
        filterButton.textContent = 'Filter';
        filterButton.className = 'galleryx-filter-button';
    
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.className = 'galleryx-clear-button';
    
        filterContainer.appendChild(filterInput);
        filterContainer.appendChild(filterButton);
        filterContainer.appendChild(clearButton);
    
        const applyFilter = () => this.filterGallery(items, galleryEl, filterInput.value);
    
        filterButton.addEventListener('click', applyFilter);
        clearButton.addEventListener('click', () => {
            filterInput.value = '';
            this.filterGallery(items, galleryEl, '');
        });
    
        // Add event listener for Enter key press
        filterInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                applyFilter();
            }
        });
    
        return filterContainer;
    }

    parseGalleryItems(lines: string[]): GalleryItem[] {
        return lines.map(line => {
            const [src, tagsString] = line.split('{');
            const trimmedSrc = src.trim();
            const isLocal = trimmedSrc.startsWith('![[') && trimmedSrc.endsWith(']]');
            const isVideo = trimmedSrc.match(/\.(mp4|webm|ogg)$/i) !== null;
            const tags = tagsString 
                ? tagsString.replace('}', '').split(',').map(tag => tag.trim().toLowerCase())
                : [];
            return { src: trimmedSrc, isLocal, isVideo, tags };
        }).filter(item => item.src);
    }

    createGalleryElement(items: GalleryItem[], settings: GallerySettings): HTMLElement {
        this.items = items; // Store all items
        if (settings.type === 'single' && items.length === 1) {
            return this.createSingleGalleryItem(items[0]);
        }
    
        const containerEl = document.createElement('div');
        containerEl.className = 'galleryx-outer-container';
    
        const galleryEl = document.createElement('div');
        galleryEl.className = `galleryx-container galleryx-${settings.type}`;
    
        if (settings.type === 'flexbox' && settings.flexboxHeight) {
            galleryEl.style.setProperty('--flexbox-height', settings.flexboxHeight);
        } else if (settings.type === 'grid' && settings.columns) {
            galleryEl.style.setProperty('--columns', settings.columns.toString());
        }
    
        items.forEach(item => {
            const itemEl = this.createGalleryItemElement(item);
            galleryEl.appendChild(itemEl);
        });
    
        const filterEl = this.createFilterElement(items, galleryEl);
        containerEl.appendChild(filterEl);
        containerEl.appendChild(galleryEl);
    
        return containerEl;
    }
    
    filterGallery(items: GalleryItem[], galleryEl: HTMLElement, filterTags: string) {
        const tags = filterTags.toLowerCase().split(',').map(tag => tag.trim());
        
        const galleryItems = galleryEl.querySelectorAll('.galleryx-item');
        galleryItems.forEach((itemEl, index) => {
            const item = items[index];
            if (tags.length === 0 || tags.every(tag => item.tags.some(itemTag => itemTag.toLowerCase().includes(tag)))) {
                (itemEl as HTMLElement).style.display = '';
            } else {
                (itemEl as HTMLElement).style.display = 'none';
            }
        });
    }
    
    createGalleryItemElement(item: GalleryItem): HTMLElement {
        const itemEl = document.createElement('div');
        itemEl.className = 'galleryx-item';
    
        const contentEl = item.isVideo ? document.createElement('video') : document.createElement('img');
        
        contentEl.setAttribute('data-src', item.isLocal ? this.getLocalFilePath(item.src) : item.src);
        contentEl.setAttribute('loading', 'lazy');
        
        if (item.isVideo) {
            (contentEl as HTMLVideoElement).controls = true;
        } else {
            (contentEl as HTMLImageElement).alt = item.src;
            itemEl.addEventListener('click', () => this.openFullscreen(this.items, this.items.indexOf(item)));
        }
    
        contentEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    
        itemEl.appendChild(contentEl);
    
        this.observeElement(itemEl);
    
        return itemEl;
    }
    
    private observeElement(element: HTMLElement) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLImageElement | HTMLVideoElement;
                    const dataSrc = target.getAttribute('data-src');
                    if (dataSrc) {
                        target.src = dataSrc;
                        target.removeAttribute('data-src');
                    }
                    observer.unobserve(target);
                }
            });
        }, { rootMargin: '100px' });
    
        observer.observe(element.firstElementChild as HTMLElement);
    }

    createSingleGalleryItem(item: GalleryItem): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'galleryx-single-item';
    
        const contentEl = item.isVideo ? document.createElement('video') : document.createElement('img');
        contentEl.setAttribute('data-src', item.isLocal ? this.getLocalFilePath(item.src) : item.src);
        contentEl.setAttribute('loading', 'lazy');
    
        if (item.isVideo) {
            (contentEl as HTMLVideoElement).controls = true;
        } else {
            (contentEl as HTMLImageElement).alt = item.src;
        }
    
        contentEl.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    
        wrapper.appendChild(contentEl);
        
        // Only add click event for non-video items
        if (!item.isVideo) {
            wrapper.addEventListener('click', () => this.openFullscreen([item], 0));
        }
    
        this.observeElement(wrapper);
    
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

    openFullscreen(items: GalleryItem[], startIndex: number) {
        const nonVideoItems = items.filter(i => !i.isVideo);
        if (nonVideoItems.length > 0) {
            new FullscreenView(nonVideoItems, startIndex, (src: string) => {
                const file = this.app.vault.getAbstractFileByPath(src.replace(/!\[\[(.*?)\]\]/, '$1'));
                if (file instanceof TFile) {
                    return this.app.vault.getResourcePath(file);
                }
                return src;
            });
        }
    }
}