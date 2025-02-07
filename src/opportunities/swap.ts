import { OpportunitySvmSwap } from "@pythnetwork/express-relay-js";
import { DateTime } from "luxon";

import { generateAddressLink, shortAddress } from "../utils";

export const generateSwapOpportunityMessage = (
    opp: OpportunitySvmSwap
): string => {
    const msg = [
        `⏰ *${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT)}*`,
        `🔄 *New Swap Opportunity* 🔄`,
        `ID: \`${opp.opportunityId}\``,
        `⛓️ *Chain*: ${opp.chainId}`,
        "",
        "📋 *Details*",
        `┣ *Router*: [${shortAddress(opp.routerAccount)}](${generateAddressLink(
            opp.routerAccount
        )})`,
        `┣ *Permission*: [${shortAddress(
            opp.permissionAccount
        )}](${generateAddressLink(opp.permissionAccount)})`,
        `┗ *User*: [${shortAddress(
            opp.userWalletAddress
        )}](${generateAddressLink(opp.userWalletAddress)})`,
        "",
        "💵 *Fees*",
        `┣ *Platform*: ${opp.platformFeeBps}bps | *Referral*: ${opp.referralFeeBps}bps`,
        `┗ *Token*: ${opp.feeToken}`,
        "",
    ];

    if (opp.tokens.type === "searcher_specified") {
        msg.push(
            "🔍 *Searcher Specified*",
            `┗ *Token*: [${opp.tokens.searcherToken.toBase58()}](https://solscan.io/account/${opp.tokens.searcherToken.toBase58()})`,
            `   ${opp.tokens.searcherAmount.toString()}`
        );
    } else if (opp.tokens.type === "user_specified") {
        msg.push(
            "💁🏻‍♂️ *User Specified*",
            `┣ *Token*: [${opp.tokens.userToken.toBase58()}](https://solscan.io/account/${opp.tokens.userToken.toBase58()})`,
            `┗ ${opp.tokens.userAmount.toString()}`
        );
    }

    return msg.join("\n");
};
