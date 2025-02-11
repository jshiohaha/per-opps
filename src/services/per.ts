import {
    BidStatusUpdate,
    Client,
    Opportunity,
    OpportunityDelete,
    OpportunitySvm,
    OpportunitySvmLimo,
    OpportunitySvmSwap,
} from "@pythnetwork/express-relay-js";
import Bottleneck from "bottleneck";
import TelegramBot from "node-telegram-bot-api";

import { TokenCache } from "../cache";
import { logger } from "../logger";
import {
    generateLimoOpportunityMessage,
    generateSwapOpportunityMessage,
} from "../opportunities";
import { escapeMarkdownV2 } from "../utils/tg";

export class PerClient {
    private client: Client;
    private telegramBot: TelegramBot;
    private telegramChatId: string;
    private chainId: string;
    private tokenCache: TokenCache;
    private limiter: Bottleneck;
    private isReconnecting: boolean = false;

    constructor(args: {
        endpointExpressRelay: string;
        chainId: string;
        telegramBot: TelegramBot;
        telegramChatId: string;
        tokenCache: TokenCache;
        apiKey?: string;
        maxMessagesPerWindow?: number;
        windowSeconds?: number;
    }) {
        this.client = new Client(
            {
                baseUrl: args.endpointExpressRelay,
                apiKey: args.apiKey,
            },
            // https://github.com/pyth-network/per/blob/294b45ce2d69446f69a80ea7b018f19a24a37fe3/sdk/js/src/index.ts#L74-L77
            {
                response_timeout: 15_000,
                ping_interval: 32_000,
            },
            this.opportunityHandler.bind(this),
            this.bidStatusHandler.bind(this),
            undefined,
            this.removeOpportunitiesHandler.bind(this),
            this.websocketCloseHandler.bind(this)
        );

        this.client.websocket?.on("timeout", () => {
            logger.warn("WebSocket timeout");
            this.reconnect();
        });

        this.tokenCache = args.tokenCache;
        this.telegramBot = args.telegramBot;
        this.telegramChatId = args.telegramChatId;
        this.chainId = args.chainId;

        // https://rollout.com/integration-guides/telegram-bot-api/api-essentials
        this.limiter = new Bottleneck({
            reservoir: args.maxMessagesPerWindow ?? 30,
            reservoirRefreshAmount: args.maxMessagesPerWindow ?? 30,
            // ms
            reservoirRefreshInterval: (args.windowSeconds ?? 60) * 1_000,
            // process one message at a time
            maxConcurrent: 1,
            // minimum time between messages (100ms)
            minTime: 100,
            // start dropping messages after queue length reaches N
            highWater: 100,
            // drop oldest messages when queue is full
            strategy: Bottleneck.strategy.LEAK,
            // do not retry any failed messages
            retryCount: 0,
        });

        this.addLimiterEventsListeners();
    }

    private addLimiterEventsListeners(): void {
        this.limiter.on("depleted", (empty) => {
            logger.warn("Rate limit reached, messages will be queued", {
                empty,
            });
        });

        this.limiter.on("dropped", (dropped) => {
            logger.warn("Message dropped due to queue overflow", { dropped });
        });

        this.limiter.on("retry", (error) => {
            logger.warn("Retrying failed message", { error });
        });

        if (process.env.NODE_ENV === "development") {
            this.limiter.on("received", () => {
                logger.debug("Message received by rate limiter");
            });

            this.limiter.on("queued", () => {
                logger.debug("Message queued");
            });

            this.limiter.on("executing", () => {
                logger.debug("Message being executed");
            });

            this.limiter.on("done", () => {
                logger.debug("Message completed");
            });
        }

        this.limiter.on("error", (error) => {
            logger.error("Rate limiter error:", { error });
        });
    }

    private async onNotificationCallback(message: string) {
        try {
            const counts = this.limiter.counts();
            logger.debug("Current rate limiter status", { counts });

            await this.limiter.schedule(async () => {
                await this.telegramBot.sendMessage(
                    this.telegramChatId,
                    escapeMarkdownV2(message),
                    {
                        parse_mode: "MarkdownV2",
                        disable_web_page_preview: true,
                    }
                );
            });
        } catch (error) {
            logger.error("Failed to send Telegram message:", {
                error,
            });
        }
    }

    private async reconnect(): Promise<void> {
        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;
        logger.info("Attempting to reconnect...");

        try {
            await this.start();
            logger.info("Successfully reconnected");
            await this.onNotificationCallback(
                "✅ Successfully reconnected to WebSocket"
            );
        } catch (error) {
            logger.error("Failed to reconnect:", { error });
            await this.onNotificationCallback(
                "❌ Failed to reconnect to WebSocket"
            );

            setTimeout(() => {
                this.isReconnecting = false;
                this.reconnect();
            }, 5_000);
        }
    }

    private websocketCloseHandler = async () => {
        logger.warn("WebSocket connection closed");
        await this.onNotificationCallback("❌ WebSocket connection closed");
    };

    private bidStatusHandler = async (bidStatus: BidStatusUpdate) => {
        await this.onNotificationCallback(
            `🔄 Bid status update:\nID: ${bidStatus.id}\nStatus: ${bidStatus.type}`
        );
    };

    private async opportunityHandler(opportunity: Opportunity) {
        // prop only in OpportunitySvm
        if (!("program" in opportunity)) {
            logger.info(
                `Ignoring non-SVM opportunity ${opportunity.opportunityId} on ${opportunity.chainId}`
            );
            return;
        }

        const svmOpportunity = opportunity as OpportunitySvm;
        const program = svmOpportunity.program;

        try {
            let msg: string;
            if (program === "limo") {
                msg = await generateLimoOpportunityMessage(
                    svmOpportunity as OpportunitySvmLimo,
                    this.tokenCache
                );
            } else if (program === "swap") {
                msg = await generateSwapOpportunityMessage(
                    svmOpportunity as OpportunitySvmSwap,
                    this.tokenCache
                );
            } else {
                logger.warn(`Unknown program: ${program}`);
                return;
            }

            await this.onNotificationCallback(msg);
        } catch (error) {
            logger.error("Error handling opportunity", {
                error,
            });

            return;
        }
    }

    private async removeOpportunitiesHandler(
        opportunityDelete: OpportunityDelete
    ) {
        await this.onNotificationCallback(
            `🗑️ Opportunities removed:\n${JSON.stringify(opportunityDelete)}`
        );
    }

    public async start() {
        try {
            await this.client.subscribeChains([this.chainId]);
            const message = `🚀 PER subscriber bot started for chain: ${this.chainId}`;
            await this.onNotificationCallback(message);
            logger.info(
                `Subscribed to chain ${this.chainId}. Waiting for opportunities...`
            );
        } catch (error) {
            await this.onNotificationCallback(
                `❌ Error starting bot: ${error}`
            );

            // this.client.websocket?.close();
        }
    }

    public async stop() {
        await this.limiter.stop({
            dropWaitingJobs: true,
        });

        this.client.websocket?.close();
        logger.info("🛑 Bot stopped");
    }
}
