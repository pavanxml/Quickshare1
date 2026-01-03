import { StorageAdapter } from "./storage";
import { MemoryAdapter } from "./memory";
import { RedisAdapter } from "./redis";
import { SqliteAdapter } from "./sqlite";

let adapter: StorageAdapter | null = null;

export function getAdapter(): StorageAdapter {
    if (adapter) return adapter;

    if (process.env.REDIS_URL) {
        try {
            adapter = new RedisAdapter(process.env.REDIS_URL);
            console.log("Using Redis Adapter");
        } catch (e) {
            console.error("Failed to initialize Redis adapter", e);
            // Fallback to SQLite if Redis fails
            try {
                adapter = new SqliteAdapter();
                console.log("Fallback to SQLite Adapter");
            } catch (sqliteErr) {
                adapter = new MemoryAdapter();
                console.log("Fallback to Memory Adapter");
            }
        }
    } else {
        // Default to SQLite if no Redis URL
        try {
            adapter = new SqliteAdapter();
            console.log("Using SQLite Adapter");
        } catch (e) {
            console.error("Failed to initialize SQLite adapter", e);
            adapter = new MemoryAdapter();
            console.log("Fallback to Memory Adapter");
        }
    }

    return adapter!;
}
