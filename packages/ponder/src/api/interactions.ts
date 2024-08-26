import { ponder } from "@/generated";
import { desc, eq } from "@ponder/core";
import { type Address, isAddress } from "viem";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
BigInt.prototype.toJSON = function (): string {
    return this.toString();
};

/**
 * Get all the interactions for a wallet
 */
ponder.get("/interactions/:wallet", async (ctx) => {
    // Extract wallet
    const wallet = ctx.req.param("wallet") as Address;
    if (!isAddress(wallet)) {
        return ctx.text("Invalid wallet address", 400);
    }

    // Get the tables we will query
    const { InteractionEvent, ContentInteractionContract } = ctx.tables;

    // Perform the sql query
    const interactions = await ctx.db
        .select({
            data: InteractionEvent.data,
            type: InteractionEvent.type,
            timestamp: InteractionEvent.timestamp,
            contentId: ContentInteractionContract.contentId,
        })
        .from(InteractionEvent)
        .innerJoin(
            ContentInteractionContract,
            eq(ContentInteractionContract.id, InteractionEvent.interactionId)
        )
        .where(eq(InteractionEvent.user, wallet))
        .limit(100)
        .orderBy(desc(InteractionEvent.timestamp));

    // Return the result as json
    return ctx.json(interactions);
});
