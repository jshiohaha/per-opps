import { OpportunitySvmSwap } from "@pythnetwork/express-relay-js";

import { DateTime } from "luxon";
import { generateAddressLink, shortAddress } from "../utils";

export const generateSwapOpportunityMessage = (
    opp: OpportunitySvmSwap
): string => {
    const msg = [
        `⏰ ${DateTime.now().toLocaleString(DateTime.DATETIME_SHORT)}`,
        `🔄 *New Swap Opportunity* 🔄`,
        `ID: \`${opp.opportunityId}\``,
        `⛓️ Chain: ${opp.chainId}`,
        "",
        "📋 *Details*",
        `• Router: [${shortAddress(opp.routerAccount)}](${generateAddressLink(
            opp.routerAccount
        )})`,
        `• Permission: [${shortAddress(
            opp.permissionAccount
        )}](${generateAddressLink(opp.permissionAccount)})`,
        `• User: [${shortAddress(opp.userWalletAddress)}](${generateAddressLink(
            opp.userWalletAddress
        )})`,
        "",
        `💵 Fees`,
        `• Platform: ${opp.platformFeeBps}bps | Referral: ${opp.referralFeeBps}bps`,
        // todo: map to actual token name?
        `• Token: ${opp.feeToken}`,
    ];

    if (opp.tokens.type === "searcher_specified") {
        msg.push(
            `🔍 Searcher: [${opp.tokens.searcherToken.toBase58()}](https://explorer.solana.com/address/${opp.tokens.searcherToken.toBase58()})`
        );
        msg.push(
            `${opp.tokens.searcherAmount.toString()} of [${opp.tokens.searcherToken.toBase58()}](https://explorer.solana.com/address/${opp.tokens.searcherToken.toBase58()})`
        );
    } else if (opp.tokens.type === "user_specified") {
        msg.push(
            `💁🏻‍♂️ User: [${opp.tokens.userToken.toBase58()}](${generateAddressLink(
                opp.tokens.userToken
            )})`
        );
        msg.push(
            `${opp.tokens.userAmount.toString()} of [${opp.tokens.userToken.toBase58()}](${generateAddressLink(
                opp.tokens.userToken
            )})`
        );
    }

    // todo: find actual token names
    if (opp.tokens.type === "searcher_specified") {
        msg.push(
            "🔍 Swap token is *Searcher Specified*",
            `${opp.tokens.searcherAmount.toString()} [${shortAddress(
                opp.tokens.searcherToken
            )}](${generateAddressLink(opp.tokens.searcherToken)})`
        );
    } else {
        msg.push(
            "👤 Swap token is *User Specified*",
            `${opp.tokens.userAmount.toString()} [${shortAddress(
                opp.tokens.userToken
            )}](${generateAddressLink(opp.tokens.userToken)})`
        );
    }

    return msg.join("\n");
};
