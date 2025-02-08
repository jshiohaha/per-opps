import {
    DigitalAsset,
    mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import {
    createSignerFromKeypair,
    generateSigner,
    signerIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Connection } from "@solana/web3.js";
import TelegramBot from "node-telegram-bot-api";

import { InMemoryCache, RedisCache, TokenCache } from "./cache";
import { envConfig } from "./config";
import { logger } from "./logger";
import { PerClient } from "./services/per";

const connection = new Connection(envConfig.SOLANA_RPC_ENDPOINT);
const umi = createUmi(connection);
umi.use(mplTokenMetadata());

// use custom keypair if needed
const keypair = generateSigner(umi);
umi.use(signerIdentity(createSignerFromKeypair(umi, keypair)));

if (envConfig.REDIS_URL) {
    logger.info(`Using Redis cache at ${envConfig.REDIS_URL}`);
} else {
    logger.info("Using in-memory cache");
}

const cache = envConfig.REDIS_URL
    ? new RedisCache<string, DigitalAsset>(envConfig.REDIS_URL)
    : new InMemoryCache<string, DigitalAsset>();

export const tokenCache = TokenCache.getInstance(umi, cache);

const main = async () => {
    const bot = new TelegramBot(envConfig.TELEGRAM_BOT_TOKEN, {
        polling: false,
    });

    logger.info(
        `Sending message to Telegram chat => ${envConfig.TELEGRAM_CHAT_ID}`
    );

    const client = new PerClient({
        endpointExpressRelay: envConfig.EXPRESS_RELAY_ENDPOINT,
        chainId: envConfig.CHAIN_ID,
        telegramBot: bot,
        telegramChatId: envConfig.TELEGRAM_CHAT_ID,
        tokenCache,
        apiKey: envConfig.PER_API_KEY,
    });

    const shutdown = async () => {
        logger.info("Shutting down...");
        await client.stop();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await client.start();
};

main().catch((error) => {
    logger.error("Fatal application error", {
        error,
    });

    // process.exit(1);
});
