import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { CreatePasteOptions, Paste, StorageAdapter } from "./storage";
import path from "path";
import fs from "fs";

export class SqliteAdapter implements StorageAdapter {
    private db: Database.Database;

    constructor() {
        // Vercel / Serverless environment check
        // In Vercel, we can only write to /tmp.
        const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';

        let dbPath;
        if (isVercel) {
            dbPath = path.join('/tmp', 'database.sqlite');
            console.log("Using /tmp database path:", dbPath);
        } else {
            dbPath = path.join(process.cwd(), "database.sqlite");
        }

        this.db = new Database(dbPath);
        this.init();
    }

    private init() {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS pastes (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            file_url TEXT,
            mime_type TEXT,
            views_left INTEGER, -- NULL for unlimited
            initial_views INTEGER,
            expires_at INTEGER, -- NULL for never
            created_at INTEGER NOT NULL
          )
        `);

        // Auto-migrate for existing tables (simple check)
        try {
            this.db.exec("ALTER TABLE pastes ADD COLUMN type TEXT DEFAULT 'text'");
        } catch (e) { /* ignore if exists */ }
        try {
            this.db.exec("ALTER TABLE pastes ADD COLUMN file_url TEXT");
        } catch (e) { /* ignore if exists */ }
        try {
            this.db.exec("ALTER TABLE pastes ADD COLUMN mime_type TEXT");
        } catch (e) { /* ignore if exists */ }

        // WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
    }

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

        const stmt = this.db.prepare(`
          INSERT INTO pastes (id, content, type, file_url, mime_type, views_left, initial_views, expires_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            paste.id,
            paste.content,
            paste.type,
            paste.file_url,
            paste.mime_type,
            paste.views_left,
            paste.initial_views,
            paste.expires_at,
            paste.created_at
        );

        return id;
    }

    async fetchPaste(id: string, nowMs: number): Promise<Paste | null> {
        // 1. Fetch
        const stmt = this.db.prepare('SELECT * FROM pastes WHERE id = ?');
        const row = stmt.get(id) as Paste | undefined;

        if (!row) return null;

        // 2. TTL Check
        if (row.expires_at && nowMs > row.expires_at) {
            return null;
        }

        // 3. View Check & Decrement (Atomic transaction)
        // We need to check if views_left > 0.

        if (row.views_left !== null) {
            // Transaction to check and update
            const updateTx = this.db.transaction(() => {
                const current = this.db.prepare('SELECT views_left FROM pastes WHERE id = ?').get(id) as { views_left: number };

                if (current.views_left <= 0) {
                    return null; // Exhausted
                }

                const newViews = current.views_left - 1;
                this.db.prepare('UPDATE pastes SET views_left = ? WHERE id = ?').run(newViews, id);
                return newViews;
            });

            try {
                const newViews = updateTx();
                // If transaction returned null (exhausted), return null for the paste.
                if (newViews === null) return null;

                return {
                    ...row,
                    views_left: newViews
                };
            } catch (e) {
                // Verify concurrency issues? Sqlite handles locking.
                // If transaction fails, return null.
                return null;
            }
        }

        return row;
    }

    async isHealthy(): Promise<boolean> {
        try {
            const row = this.db.prepare('SELECT 1').get();
            return !!row;
        } catch (e) {
            return false;
        }
    }
}
