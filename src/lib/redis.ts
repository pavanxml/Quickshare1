import { Redis } from "ioredis";
import { nanoid } from "nanoid";
import { CreatePasteOptions, Paste, StorageAdapter } from "./storage";

export class RedisAdapter implements StorageAdapter {
    private redis: Redis;

    constructor(url: string) {
        this.redis = new Redis(url);
    }

    async createPaste(options: CreatePasteOptions): Promise<string> {
        const id = nanoid(8);
        const now = Date.now();

        const pasteData = {
            id,
            content: options.content,
            type: options.type || 'text',
            file_url: options.file_url,
            mime_type: options.mime_type,
            created_at: now,
            expires_at: options.ttl_seconds ? now + options.ttl_seconds * 1000 : null,
            initial_views: options.max_views ?? null,
        };

        const multi = this.redis.multi();

        // Store main data
        const key = `paste:${id}`;
        if (options.ttl_seconds) {
            multi.set(key, JSON.stringify(pasteData), "EX", options.ttl_seconds);
        } else {
            multi.set(key, JSON.stringify(pasteData));
        }

        // Store view limit if exists
        if (options.max_views !== undefined) {
            const viewsKey = `paste:${id}:views`;
            if (options.ttl_seconds) {
                multi.set(viewsKey, options.max_views, "EX", options.ttl_seconds);
            } else {
                multi.set(viewsKey, options.max_views);
            }
        }

        await multi.exec();
        return id;
    }

    async fetchPaste(id: string, nowMs: number): Promise<Paste | null> {
        const key = `paste:${id}`;
        const viewsKey = `paste:${id}:views`;

        const dataStr = await this.redis.get(key);
        if (!dataStr) return null;

        const pasteData = JSON.parse(dataStr);

        // TTL Check
        if (pasteData.expires_at && nowMs > pasteData.expires_at) {
            return null;
        }

        // View Check
        let currentViews: number | null = null;
        if (pasteData.initial_views !== null) {
            // LUA to check and decr
            const result = await this.redis.eval(
                `
            local v = redis.call('get', KEYS[1])
            if not v then return -2 end
            if tonumber(v) <= 0 then return -1 end
            return redis.call('decr', KEYS[1])
            `,
                1,
                viewsKey
            );

            if (typeof result === 'number') {
                if (result < 0) return null;
                currentViews = result;
            } else {
                return null;
            }
        }

        return {
            ...pasteData,
            views_left: currentViews
        };
    }

    async isHealthy(): Promise<boolean> {
        try {
            const res = await this.redis.ping();
            return res === "PONG";
        } catch (e) {
            return false;
        }
    }
}
