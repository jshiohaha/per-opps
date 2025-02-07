import {
    BidStatusUpdate,
    Client,
    Opportunity,
    OpportunityDelete,
    SvmChainUpdate,
} from "@pythnetwork/express-relay-js";
import TelegramBot from "node-telegram-bot-api";

import { logger } from "../logger";

export class PerClient {
    private client: Client;
    private latestChainUpdate: Record<string, SvmChainUpdate> = {};

    constructor(
        private endpointExpressRelay: string,
        private chainId: string,
        private telegramBot: TelegramBot,
        private telegramChatId: string,
        private apiKey?: string
    ) {
        this.client = new Client(
            {
                baseUrl: this.endpointExpressRelay,
                apiKey: this.apiKey,
            },
            undefined,
            this.opportunityHandler.bind(this),
            this.bidStatusHandler.bind(this),
            this.svmChainUpdateHandler.bind(this),
            this.removeOpportunitiesHandler.bind(this),
            this.websocketCloseHandler.bind(this)
        );
    }

    private async onNotificationCallback(message: string) {
        try {
            await this.telegramBot.sendMessage(this.telegramChatId, message);
        } catch (error) {
            logger.error("Failed to send Telegram message:", error);
        }
    }

    private async websocketCloseHandler() {
        logger.info("⚠️ WebSocket closed. Exiting...");
        process.exit(1);
    }

    private bidStatusHandler = async (bidStatus: BidStatusUpdate) => {
        await this.onNotificationCallback(
            `🔄 Bid status update:\nID: ${bidStatus.id}\nStatus: ${bidStatus.type}`
        );
    };

    private async opportunityHandler(opportunity: Opportunity) {
        await this.onNotificationCallback(
            `💡 New opportunity received:\nID: ${opportunity.opportunityId}\nChain: ${opportunity.chainId}`
        );

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
        if (this.client.websocket) {
            this.client.websocket.close();
        }

        await this.onNotificationCallback("🛑 Bot stopped");
    }
}
