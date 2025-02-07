import {
    BidStatusUpdate,
    Client,
    Opportunity,
    OpportunityDelete,
    OpportunitySvm,
    OpportunitySvmLimo,
    OpportunitySvmSwap,
    SvmChainUpdate,
} from "@pythnetwork/express-relay-js";
import TelegramBot from "node-telegram-bot-api";

import { TokenCache } from "../cache";
import { logger } from "../logger";
import {
    generateLimoOpportunityMessage,
    generateSwapOpportunityMessage,
} from "../opportunities";

export class PerClient {
    private client: Client;
    private latestChainUpdate: Record<string, SvmChainUpdate> = {};
    private telegramBot: TelegramBot;
    private telegramChatId: string;
    private chainId: string;
    private tokenCache: TokenCache;

    constructor(args: {
        endpointExpressRelay: string;
        chainId: string;
        telegramBot: TelegramBot;
        telegramChatId: string;
        tokenCache: TokenCache;
        apiKey?: string;
    }) {
        this.client = new Client(
            {
                baseUrl: args.endpointExpressRelay,
                apiKey: args.apiKey,
            },
            undefined,
            this.opportunityHandler.bind(this),
            this.bidStatusHandler.bind(this),
            this.svmChainUpdateHandler.bind(this),
            this.removeOpportunitiesHandler.bind(this),
            this.websocketCloseHandler.bind(this)
        );
        this.tokenCache = args.tokenCache;
        this.telegramBot = args.telegramBot;
        this.telegramChatId = args.telegramChatId;
        this.chainId = args.chainId;
    }

    private async onNotificationCallback(message: string) {
        try {
            await this.telegramBot.sendMessage(this.telegramChatId, message, {
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true,
            });
        } catch (error) {
            logger.error("Failed to send Telegram message:", error);
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
            logger.error("Error handling opportunity:", error);
            return;
        }

        if (!this.latestChainUpdate[this.chainId]) {
            logger.warn(
                `No recent blockhash for chain ${this.chainId}, skipping bid`
            );
            return;
        }
    }

    private async svmChainUpdateHandler(update: SvmChainUpdate) {
        const message = `🔗 Chain update received:\nChain: ${update.chainId}\nSlot: ${update.blockhash}`;
        logger.debug("[svmChainUpdate]", message);
        this.latestChainUpdate[update.chainId] = update;
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
            logger.error(error);
            await this.onNotificationCallback(
                `❌ Error starting bot: ${error}`
            );

            this.client.websocket?.close();
        }
    }

    public async stop() {
        this.client.websocket?.close();
        logger.info("🛑 Bot stopped");
    }
}
