import { OpportunitySvmSwap } from "@pythnetwork/express-relay-js";
import { DateTime } from "luxon";

import { TokenCache } from "../cache";
import { generateAddressLink, shortAddress } from "../utils";
import { formatTokenAmount } from "../utils/token";

export const generateSwapOpportunityMessage = async (
    opp: OpportunitySvmSwap,
    tokenCache: TokenCache
): Promise<string> => {
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
        `┗ *Fee Token*: ${
            opp.feeToken === "searcher_token" ? "Searcher Token" : "User Token"
        }`,
    ];

    msg.push("");

    if (opp.tokens.type === "searcher_specified") {
        const searcherTokenInfo = await tokenCache.get(
            opp.tokens.searcherToken
        );
        msg.push(
            "🔍 *Searcher Specified*",
            `┗ *Token*: ${
                searcherTokenInfo?.metadata.name ??
                shortAddress(opp.tokens.searcherToken)
            } [${shortAddress(opp.tokens.searcherToken)}](${generateAddressLink(
                opp.tokens.searcherToken
            )})`,
            `   ${
                searcherTokenInfo
                    ? formatTokenAmount(
                          opp.tokens.searcherAmount,
                          searcherTokenInfo.mint.decimals
                      )
                    : opp.tokens.searcherAmount.toString()
            }`
        );
    } else if (opp.tokens.type === "user_specified") {
        const userTokenInfo = await tokenCache.get(opp.tokens.userToken);
        msg.push(
            "💁🏻‍♂️ *User Specified*",
            `┣ *Token*: ${
                userTokenInfo?.metadata.name ??
                shortAddress(opp.tokens.userToken)
            } [${shortAddress(opp.tokens.userToken)}](${generateAddressLink(
                opp.tokens.userToken
            )})`,
            `┗ ${
                userTokenInfo
                    ? formatTokenAmount(
                          opp.tokens.userAmount,
                          userTokenInfo.mint.decimals
                      )
                    : opp.tokens.userAmount.toString()
            }`
        );
    }

    return msg.join("\n");
};
