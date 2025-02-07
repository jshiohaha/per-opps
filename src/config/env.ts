import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
    EXPRESS_RELAY_ENDPOINT: string;
    CHAIN_ID: string;
    PER_API_KEY?: string;
}

const getEnvConfig = (): EnvConfig => {
    const config = {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
        EXPRESS_RELAY_ENDPOINT: process.env.EXPRESS_RELAY_ENDPOINT,
        CHAIN_ID: process.env.CHAIN_ID,
        PER_API_KEY: process.env.PER_API_KEY?.trim(),
    };

    const missingVars = Object.entries(config)
        // PER_API_KEY is optional
        .filter(([key, value]) => key !== "PER_API_KEY" && !value)
        .map(([key]) => key);

    if (missingVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingVars.join(", ")}`
        );
    }

    return config as EnvConfig;
};

export const envConfig = getEnvConfig();
