import TelegramBot from "node-telegram-bot-api";

import { envConfig } from "./config";
import { logger } from "./logger";
import { PerClient } from "./services/per";

const main = async () => {
    const bot = new TelegramBot(envConfig.TELEGRAM_BOT_TOKEN, {
        polling: false,
    });

    logger.info(
        `Sending message to Telegram chat => ${envConfig.TELEGRAM_CHAT_ID}`
    );

    const client = new PerClient(
        envConfig.EXPRESS_RELAY_ENDPOINT,
        envConfig.CHAIN_ID,
        bot,
        envConfig.TELEGRAM_CHAT_ID,
        envConfig.PER_API_KEY
    );

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
    logger.error("Fatal error:", error);
    process.exit(1);
});
