import { OpportunitySvmLimo } from "@pythnetwork/express-relay-js";
import { DateTime } from "luxon";

import { TokenCache } from "../cache";
import { generateAddressLink, shortAddress } from "../utils";
import { formatTokenAmount } from "../utils/token";

export const generateLimoOpportunityMessage = async (
    opp: OpportunitySvmLimo,
    tokenCache: TokenCache
): Promise<string> => {
    const order = opp.order.state;

    const [inputToken, outputToken] = await Promise.all([
        tokenCache.get(order.inputMint),
        tokenCache.get(order.outputMint),
    ]);

    const msg = [
        `⏰ ${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT)}`,
        `🎯 *New LIMO Opportunity* 🎯`,
        `ID: \`${opp.opportunityId}\``,
        `⛓️ Chain: ${opp.chainId}`,
        "",
        "📋 *Order Details*",
        `┣ Address: [${shortAddress(opp.order.address)}](${generateAddressLink(
            opp.order.address
        )})`,
        `┣ Status: ${mapOrderStatus(order.status)}`,
        `┗ Type: ${order.orderType === 0 ? "Limit" : "Market"}`,
        "",
        "💱 *Swap*",
        `┣ From: ${
            inputToken?.metadata.name ?? shortAddress(order.inputMint)
        } [${shortAddress(order.inputMint)}](${generateAddressLink(
            order.inputMint
        )})`,
        `┣ To: ${
            outputToken?.metadata.name ?? shortAddress(order.outputMint)
        } [${shortAddress(order.outputMint)}](${generateAddressLink(
            order.outputMint
        )})`,
        `┣ Remaining: ${
            inputToken
                ? formatTokenAmount(
                      order.remainingInputAmount,
                      inputToken.mint.decimals
                  )
                : order.remainingInputAmount.toString()
        } → Expecting ${
            outputToken
                ? formatTokenAmount(
                      order.expectedOutputAmount,
                      outputToken.mint.decimals
                  )
                : order.expectedOutputAmount.toString()
        }`,
        `┗ Filled: ${
            outputToken
                ? formatTokenAmount(
                      order.filledOutputAmount,
                      outputToken.mint.decimals
                  )
                : order.filledOutputAmount.toString()
        } (${order.numberOfFills.toString()} fills)`,
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
