import {
    DigitalAsset,
    fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import { Umi } from "@metaplex-foundation/umi";
import { fromWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { PublicKey } from "@solana/web3.js";

import { logger } from "../logger";
import { shortAddress } from "../utils";
import { ICache } from "./impl";

export interface ITokenCache {
    get(key: PublicKey): Promise<DigitalAsset | null>;
    set(key: PublicKey, value: DigitalAsset): Promise<void>;
    clear(): Promise<void>;
}

export class TokenCache implements ITokenCache {
    private static instance: TokenCache;
    private cache: ICache<string, DigitalAsset>;
    private umi: Umi;

    private constructor(umi: Umi, cache: ICache<string, DigitalAsset>) {
        this.cache = cache;
        this.umi = umi;
    }

    public static getInstance(
        umi: Umi,
        cache: ICache<string, DigitalAsset>
    ): TokenCache {
        if (!TokenCache.instance) {
            TokenCache.instance = new TokenCache(umi, cache);
        }

        return TokenCache.instance;
    }

    public async get(mint: PublicKey): Promise<DigitalAsset | null> {
        const mintAddress = mint.toBase58();

        try {
            const cachedInfo = await this.cache.get(mintAddress);
            if (cachedInfo) {
                logger.info(`Cache hit for ${cachedInfo.metadata.name}`);
                return cachedInfo;
            }

            const asset = await fetchDigitalAsset(
                this.umi,
                fromWeb3JsPublicKey(mint)
            );
            logger.info(
                `Cache miss for ${asset.metadata.name} (${shortAddress(mint)})`
            );

            this.cache.set(mintAddress, asset);

            return asset;
        } catch (error) {
            logger.error(`Error fetching token info for ${mintAddress}:`, {
                error,
            });
            return null;
        }
    }

    set = async (mint: PublicKey, value: DigitalAsset): Promise<void> => {
        this.cache.set(mint.toBase58(), value);
    };

    clear = async (): Promise<void> => {
        this.cache.clear();
    };
}
