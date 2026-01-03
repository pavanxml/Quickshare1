import { CreatePasteOptions, Paste, StorageAdapter } from "./storage";
import { nanoid } from "nanoid";

export class MemoryAdapter implements StorageAdapter {
    private store = new Map<string, Paste>();

    async createPaste(options: CreatePasteOptions): Promise<string> {
        const id = nanoid(8);
        const now = Date.now();

        const paste: Paste = {
            id,
            content: options.content,
            type: options.type || 'text',
            file_url: options.file_url,
            mime_type: options.mime_type,
            views_left: options.max_views ?? null,
            initial_views: options.max_views ?? null,
            expires_at: options.ttl_seconds ? now + options.ttl_seconds * 1000 : null,
            created_at: now,
        };

        this.store.set(id, paste);
        return id;
    }

    async fetchPaste(id: string, nowMs: number): Promise<Paste | null> {
        const paste = this.store.get(id);
        if (!paste) return null;

        // Check TTL
        if (paste.expires_at && nowMs > paste.expires_at) {
            // Lazy cleanup logic could go here, but for now just return null
            return null;
        }

        // Check Views
        let currentViews = paste.views_left;

        if (currentViews !== null) {
            if (currentViews <= 0) {
                return null;
            }
            // Decrement
            currentViews -= 1;
            paste.views_left = currentViews;
        }

        // Since this is memory, the object mutation is "atomic" enough for single-threaded nodejs event loop
        return { ...paste, views_left: currentViews };
    }

    async isHealthy(): Promise<boolean> {
        return true;
    }
}
