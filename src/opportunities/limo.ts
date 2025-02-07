import { OpportunitySvmLimo } from "@pythnetwork/express-relay-js";
import { DateTime } from "luxon";

import { generateAddressLink, shortAddress } from "../utils";

export const generateLimoOpportunityMessage = (
    opp: OpportunitySvmLimo
): string => {
    const order = opp.order.state;
    const msg = [
        `⏰ ${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT)}`,
        `🎯 *New LIMO Opportunity* 🎯`,
        `ID: \`${opp.opportunityId}\``,
        `⛓️ Chain: ${opp.chainId}`,
        "",
        "📋 *Order Details*",
        `• Address: [${shortAddress(opp.order.address)}](${generateAddressLink(
            opp.order.address
        )})`,
        `• Status: ${mapOrderStatus(order.status)}`,
        `• Type: ${order.orderType === 0 ? "Limit" : "Market"}`,
        "",
        "💱 *Swap*",
        `• From: [${shortAddress(order.inputMint)}](${generateAddressLink(
            order.inputMint
        )})`,
        `• To: [${shortAddress(order.outputMint)}](${generateAddressLink(
            order.outputMint
        )})`,
        `• Remaining: ${order.remainingInputAmount.toString()} → Expecting ${order.expectedOutputAmount.toString()}`,
        `• Filled: ${order.filledOutputAmount.toString()} (${order.numberOfFills.toString()} fills)`,
        "",
        `⏱️ Last updated: ${DateTime.fromSeconds(
            order.lastUpdatedTimestamp.toNumber()
        ).toRelative()}`,
    ];

    return msg.join("\n");
};

// Helper function for status mapping
const mapOrderStatus = (statusCode: number): string => {
    switch (statusCode) {
        case 0:
            return "🟢 Active";
        case 1:
            return "🔴 Completed";
        case 2:
            return "⚫️ Cancelled";
        default:
            return "❔ Unknown";
    }
};
