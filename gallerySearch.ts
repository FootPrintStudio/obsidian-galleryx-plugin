import { TFile, App } from 'obsidian';
import { GalleryItem, GallerySettings } from './types';
import { GlobalTagCache } from './tagCache';
import GalleryXPlugin from './main';

export class GallerySearch {
    private app: App;
    private plugin: GalleryXPlugin;

    constructor(app: App, plugin: GalleryXPlugin) {
        this.app = app;
        this.plugin = plugin;
    }

    async processGallerySearch(source: string, el: HTMLElement): Promise<void> {
        const lines = source.split('\n');
        const { tags, limit } = this.parseSearchSettings(lines);
        const items = await this.findMatchingItems(tags);

        const containerEl = document.createElement('div');
        containerEl.className = 'galleryx-search-container';

        const searchInputEl = this.createSearchInput(items, containerEl, limit);
        containerEl.appendChild(searchInputEl);

        // Create an empty gallery container
        const galleryEl = document.createElement('div');
        galleryEl.className = 'galleryx-search-gallery';
        containerEl.appendChild(galleryEl);

        el.appendChild(containerEl);
    }

    private parseSearchSettings(lines: string[]): { tags: string[], limit: number } {
        let tags: string[] = [];
        let limit = 50; // Default limit

        lines.forEach(line => {
            if (line.startsWith('tags:')) {
                tags = line.substring(5).split(',').map(tag => tag.trim());
            } else if (line.startsWith('limit:')) {
                limit = parseInt(line.substring(6).trim(), 10) || 50;
            }
        });

        return { tags, limit };
    }

    private async findMatchingItems(searchTags: string[]): Promise<GalleryItem[]> {
        const matchingItems: GalleryItem[] = [];
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const galleryBlocks = this.extractGalleryBlocks(content);

            galleryBlocks.forEach(block => {
                const items = this.plugin.parseGalleryItems(block.split('\n'));
                items.forEach(item => {
                    if (this.itemMatchesTags(item, searchTags)) {
                        matchingItems.push(item);
                    }
                });
            });
        }

        return matchingItems;
    }

    private extractGalleryBlocks(content: string): string[] {
        const regex = /```galleryx([\s\S]*?)```/g;
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1].trim());
        }
        return matches;
    }

    private itemMatchesTags(item: GalleryItem, searchTags: string[]): boolean {
        return searchTags.every(tag =>
            item.tags.some(itemTag => itemTag.toLowerCase().includes(tag.toLowerCase()))
        );
    }

    private createSearchInput(items: GalleryItem[], containerEl: HTMLElement, limit: number): HTMLElement {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'galleryx-search-input-container';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search tags...';
        searchInput.className = 'galleryx-search-input';

        const suggestionContainer = document.createElement('div');
        suggestionContainer.className = 'galleryx-suggestion-container';
        suggestionContainer.style.display = 'none';

        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.className = 'galleryx-search-button';

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.className = 'galleryx-clear-button';

        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(suggestionContainer);
        searchContainer.appendChild(searchButton);
        searchContainer.appendChild(clearButton);

        const performSearch = () => {
            if (searchInput.value.trim() !== '') {
                this.updateGalleryWithSearch(searchInput.value, items, containerEl, limit);
                suggestionContainer.style.display = 'none';
            }
        };

        searchInput.addEventListener('input', () => {
            this.updateSuggestions(searchInput.value, suggestionContainer);
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim() !== '') {
                this.updateSuggestions(searchInput.value, suggestionContainer);
            }
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                suggestionContainer.style.display = 'none';
            }, 200);
        });

        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });

        searchButton.addEventListener('click', performSearch);

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            suggestionContainer.style.display = 'none';
            this.clearGallery(containerEl);
        });

        return searchContainer;
    }

    private updateSuggestions(input: string, suggestionContainer: HTMLElement) {
        const tagCache = GlobalTagCache.getInstance();
        const allTags = tagCache.getAllTags();
        const inputTags = input.toLowerCase().split(',').map(tag => tag.trim());
        const currentTag = inputTags[inputTags.length - 1];

        if (currentTag.length === 0) {
            suggestionContainer.style.display = 'none';
            return;
        }

        const matchingTags = allTags.filter(tag =>
            tag.toLowerCase().includes(currentTag) && !inputTags.slice(0, -1).includes(tag.toLowerCase())
        );

        suggestionContainer.innerHTML = '';
        if (matchingTags.length > 0) {
            matchingTags.slice(0, 5).forEach(tag => {
                const suggestionEl = document.createElement('div');
                suggestionEl.className = 'galleryx-suggestion';
                suggestionEl.textContent = tag;
                suggestionEl.addEventListener('click', () => {
                    inputTags[inputTags.length - 1] = tag;
                    const newInput = inputTags.join(', ');
                    (suggestionContainer.previousElementSibling as HTMLInputElement).value = newInput;
                    this.updateSuggestions(newInput, suggestionContainer);
                });
                suggestionContainer.appendChild(suggestionEl);
            });
            suggestionContainer.style.display = 'block';
        } else {
            suggestionContainer.style.display = 'none';
        }
    }

    private updateGalleryWithSearch(searchInput: string, items: GalleryItem[], containerEl: HTMLElement, limit: number) {
        const searchTags = searchInput.toLowerCase().split(',').map(tag => tag.trim());
        const filteredItems = items.filter(item => this.itemMatchesTags(item, searchTags));

        this.updateGalleryContent(filteredItems, containerEl, limit);
    }

    private clearGallery(containerEl: HTMLElement) {
        const galleryEl = containerEl.querySelector('.galleryx-search-gallery');
        if (galleryEl) {
            galleryEl.innerHTML = '';
        }
    }

    private updateGalleryContent(items: GalleryItem[], containerEl: HTMLElement, limit: number) {
        const galleryEl = containerEl.querySelector('.galleryx-search-gallery');
        if (galleryEl) {
            galleryEl.innerHTML = '';
            const newGallery = this.createPaginatedGallery(items, limit);
            galleryEl.appendChild(newGallery);
        }
    }

    private createPaginatedGallery(items: GalleryItem[], limit: number): HTMLElement {
        const galleryEl = document.createElement('div');
        galleryEl.className = 'galleryx-search-gallery';

        const totalPages = Math.ceil(items.length / limit);
        let currentPage = 1;

        const updateGallery = () => {
            galleryEl.innerHTML = '';
            const start = (currentPage - 1) * limit;
            const end = Math.min(start + limit, items.length);

            const pageItems = items.slice(start, end);
            const pageGallery = this.plugin.createGalleryElement(pageItems, { type: 'flexbox', flexboxHeight: '295px' });
            galleryEl.appendChild(pageGallery);

            // Add pagination controls
            const paginationEl = document.createElement('div');
            paginationEl.className = 'galleryx-pagination';
            paginationEl.innerHTML = `Page ${currentPage} of ${totalPages}`;

            if (currentPage > 1) {
                const prevButton = document.createElement('button');
                prevButton.textContent = 'Previous';
                prevButton.addEventListener('click', () => {
                    currentPage--;
                    updateGallery();
                });
                paginationEl.appendChild(prevButton);
            }

            if (currentPage < totalPages) {
                const nextButton = document.createElement('button');
                nextButton.textContent = 'Next';
                nextButton.addEventListener('click', () => {
                    currentPage++;
                    updateGallery();
                });
                paginationEl.appendChild(nextButton);
            }

            galleryEl.appendChild(paginationEl);
        };

        updateGallery();
        return galleryEl;
    }
}