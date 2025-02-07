import { Redis } from "ioredis";

import { logger } from "../../logger";
import { ICache } from "./interface";

export class RedisCache<S extends string, T> implements ICache<S, T> {
    private client;

    constructor(url: string) {
        this.client = new Redis(url);

        this.client.on("error", (err) =>
            logger.error("Redis Client Error", err)
        );
        this.client
            .connect()
            .catch((err) => logger.error("Redis Connection Error", err));
    }

    async get(key: S): Promise<T | null> {
        try {
            const value = await this.client.get(key);
            return value ? (JSON.parse(value) as T) : null;
        } catch (error) {
            logger.error(`Redis get error for key ${key}:`, error);
            return null;
        }
    }

    async set(key: S, value: T): Promise<void> {
        try {
            await this.client.set(key, JSON.stringify(value));
        } catch (error) {
            logger.error(`Redis set error for key ${key}:`, error);
        }
    }

    async clear(): Promise<void> {
        try {
            await this.client.flushdb();
        } catch (error) {
            logger.error("Redis clear error:", error);
        }
    }

    async disconnect(): Promise<void> {
        await this.client.quit();
    }
}
