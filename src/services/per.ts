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
            undefined,
            this.opportunityHandler.bind(this),
            this.bidStatusHandler.bind(this),
            undefined,
            this.removeOpportunitiesHandler.bind(this),
            this.websocketCloseHandler.bind(this)
        );
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

    private websocketCloseHandler = async () => {
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

            this.client.websocket?.close();
        }
    }

    public async stop() {
        // Drain the queue and stop accepting new jobs
        await this.limiter.stop({
            dropWaitingJobs: true, // Drop any queued messages
        });

        this.client.websocket?.close();
        logger.info("🛑 Bot stopped");
    }
}
