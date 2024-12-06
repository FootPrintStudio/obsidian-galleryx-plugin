export class GlobalTagCache {
    private static instance: GlobalTagCache;
    private tagCache: Set<string> = new Set();

    private constructor() {}

    public static getInstance(): GlobalTagCache {
        if (!GlobalTagCache.instance) {
            GlobalTagCache.instance = new GlobalTagCache();
        }
        return GlobalTagCache.instance;
    }

    public addTag(tag: string): void {
        this.tagCache.add(tag.toLowerCase());
    }

    public removeTag(tag: string): void {
        this.tagCache.delete(tag.toLowerCase());
    }

    public hasTag(tag: string): boolean {
        return this.tagCache.has(tag.toLowerCase());
    }

    public getAllTags(): string[] {
        return Array.from(this.tagCache);
    }

    public clear(): void {
        this.tagCache.clear();
    }
}