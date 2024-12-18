import * as console from "node:console";
import { ponder } from "@/generated";
import { interactionCampaignAbi } from "../../abis/campaignAbis";
import { emptyCampaignStats } from "../interactions/stats";
import { bytesToString } from "../utils/format";

ponder.on("ProductInteraction:CampaignAttached", async ({ event, context }) => {
    const { Campaign, ProductInteractionContract, ReferralCampaignStats } =
        context.db;

    // Find the interaction contract
    const interactionContract = await ProductInteractionContract.findUnique({
        id: event.log.address,
    });
    if (!interactionContract) {
        console.error(`Interaction contract not found: ${event.log.address}`);
        return;
    }

    // Get the metadata and create it
    const [, version, name] = await context.client.readContract({
        abi: interactionCampaignAbi,
        address: event.args.campaign,
        functionName: "getMetadata",
        blockNumber: event.block.number,
    });
    const currentCampaign = Campaign.findUnique({ id: event.args.campaign });
    if (!currentCampaign) {
        console.error(`Campaign not found: ${event.args.campaign}`);
        return;
    }
    // Update the campaign
    await Campaign.update({
        id: event.args.campaign,
        data: {
            name: bytesToString(name),
            version,
            attached: true,
            attachTimestamp: event.block.timestamp,
        },
    });

    // Upsert press campaign stats if it's the right type
    if (name === "frak.campaign.press") {
        await ReferralCampaignStats.upsert({
            id: event.args.campaign,
            create: {
                campaignId: event.args.campaign,
                ...emptyCampaignStats,
            },
            update: {},
        });
    }
});

ponder.on("ProductInteraction:CampaignDetached", async ({ event, context }) => {
    const { Campaign } = context.db;

    // Find the campaign to product and mark it as detached
    await Campaign.update({
        id: event.args.campaign,
        data: {
            attached: false,
            detachTimestamp: event.block.timestamp,
        },
    });
});
