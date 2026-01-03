export interface Paste {
    id: string;
    content: string; // Used for text content, Video description, or Target URL
    type: 'text' | 'video' | 'mixed' | 'url';
    file_url?: string;
    mime_type?: string;
    views_left: number | null; // null means unlimited
    initial_views: number | null; // stored for reference
    expires_at: number | null; // epoch ms, null means never
    created_at: number; // epoch ms
}

export interface CreatePasteOptions {
    content: string;
    type?: 'text' | 'video' | 'mixed' | 'url';
    file_url?: string;
    mime_type?: string;
    ttl_seconds?: number;
    max_views?: number;
}

export interface StorageAdapter {
    createPaste(options: CreatePasteOptions): Promise<string>;

    /**
     * Atomically fetches a paste and decrements its view count if applicable.
     * Returns null if not found, expired, or views exhausted.
     */
    fetchPaste(id: string, nowMs: number): Promise<Paste | null>;
    isHealthy(): Promise<boolean>;
}
