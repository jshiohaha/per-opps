import { ICache } from "./interface";

export class InMemoryCache<S, T> implements ICache<S, T> {
    private cache: Map<S, T>;

    constructor() {
        this.cache = new Map();
    }

    async get(key: S): Promise<T | null> {
        return this.cache.get(key) || null;
    }

    async set(key: S, value: T): Promise<void> {
        this.cache.set(key, value);
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}
