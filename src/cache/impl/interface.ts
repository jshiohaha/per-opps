export interface ICache<S, T> {
    get(key: S): Promise<T | null>;
    set(key: S, value: T): Promise<void>;
    clear(): Promise<void>;
}
