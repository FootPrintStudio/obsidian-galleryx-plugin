export interface GalleryItem {
    src: string;
    isLocal: boolean;
    isVideo: boolean;
    tags: string[];
}

export interface GallerySettings {
    type: string;
    flexboxHeight?: string;
    columns?: number;
}