import { Contract } from "@mainnet-cash/contract";
import { Network, Wallet } from "mainnet-js";
import { Telegraf, Markup } from "telegraf";

const script = `pragma cashscript ^0.10.5;

contract Escrow4(
    pubkey seller,
    pubkey referee,
    int timeout
) {
    function release(sig userSig) {
        bool isValid = checkSig(userSig, seller);
        if (!isValid) {
            isValid = checkSig(userSig, referee);
        }
        require(isValid);
    }
    
    function refund(sig sellerSig) {
        require(checkSig(sellerSig, seller));
        require(tx.time >= timeout);
    }
}`;

const after = 888520;
const bot = new Telegraf("YOUR_BOT_TOKEN_HERE"); // Replace with your actual bot token

// Store user wallets, active offers, and user states
let userWallets = {};
let globalOffers = [];
let userStates = {};

// Bot start command
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    if (!userWallets[userId]) {
        const wallet = await Wallet.newRandom();
        userWallets[userId] = wallet;
    }
    ctx.reply("Welcome! Select an option:", Markup.keyboard([
        ["View My Address", "View My Public Key"],
        ["Create Offer", "View Offers"]
    ]).resize());
});

// View user's deposit address
bot.hears("View My Address", async (ctx) => {
    const userId = ctx.from.id;
    const address = await userWallets[userId].getDepositAddress();
    ctx.reply(`🔑 Your deposit address is:
${address}`);
});

// View user's public key
bot.hears("View My Public Key", async (ctx) => {
    const userId = ctx.from.id;
    const publicKey = await userWallets[userId].getPublicKey();
    ctx.reply(`🔑 Your Public Key is:
${publicKey}`);
});

// 📌 VIEW AVAILABLE OFFERS
bot.hears("View Offers", (ctx) => {
    console.log("📋 Offers in memory:", globalOffers);
    if (globalOffers.length === 0) {
        return ctx.reply("📭 No offers available at the moment.");
    }

    let offerButtons = globalOffers.map((offer) => [
        Markup.button.callback(
            `${offer.type} BCH - ${offer.pricePerBCH} ${offer.currency} (${offer.paymentMethod})`,
            `offer_${offer.id}`
        )
    ]);
    
    ctx.reply("📋 Available P2P offers:", Markup.inlineKeyboard(offerButtons));
});

// 📌 HANDLE OFFER SELECTION
bot.action(/^offer_(\d+)$/, async (ctx) => {
    const offerId = parseInt(ctx.match[1]);
    const offer = globalOffers.find(o => o.id === offerId);
    if (!offer) {
        return ctx.reply("❌ The offer is no longer available.");
    }

    const buyerId = ctx.from.id;
    if (!userWallets[buyerId]) {
        userWallets[buyerId] = await Wallet.newRandom();
    }

    const buyerWalletPk = await userWallets[buyerId].getPublicKey();
    const sellerWalletPk = await userWallets[offer.user].getPublicKey();

    let contract = new Contract(script, [sellerWalletPk, buyerWalletPk, after], Network.MAINNET);
    
    ctx.reply(`✅ Escrow contract created for the selected offer:
${contract.getDepositAddress()}`);
});

// 📌 CREATE AN OFFER
bot.hears("Create Offer", (ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = { step: 1 };
    ctx.reply("What type of offer do you want to create?", Markup.keyboard([
        ["Buy BCH", "Sell BCH"],
        ["Cancel"]
    ]).resize());
});

bot.hears(["Buy BCH", "Sell BCH"], (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return;
    userStates[userId].type = ctx.message.text.includes("Buy") ? "Buy" : "Sell";
    userStates[userId].step = 2;
    ctx.reply("💲 Select the FIAT currency you want to trade in:", Markup.keyboard([
        ["USD", "EUR", "MXN", "ARS"],
        ["Cancel"]
    ]).resize());
});

bot.hears(["USD", "EUR", "MXN", "ARS"], (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return;
    userStates[userId].currency = ctx.message.text;
    userStates[userId].step = 3;
    ctx.reply(`💲 Enter the price of 1 BCH in ${ctx.message.text}:`);
});

bot.on("message", (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return;
    let userState = userStates[userId];
    let text = ctx.message.text;
    switch (userState.step) {
        case 3:
            if (isNaN(text)) return ctx.reply("❌ Price must be a number.");
            userState.pricePerBCH = parseFloat(text);
            userState.step = 4;
            ctx.reply("🔢 Enter the minimum amount of BCH you want to buy/sell:");
            break;
        case 4:
            if (isNaN(text)) return ctx.reply("❌ Enter a valid number.");
            userState.minBCH = parseFloat(text);
            userState.step = 5;
            ctx.reply("🔢 Enter the maximum amount of BCH you want to buy/sell:");
            break;
        case 5:
            if (isNaN(text) || parseFloat(text) < userState.minBCH) return ctx.reply("❌ Maximum amount must be greater than or equal to minimum amount.");
            userState.maxBCH = parseFloat(text);
            userState.step = 6;
            ctx.reply("Select the payment method:", Markup.keyboard([
                ["Bank Transfer", "Bizum", "Cash"],
                ["Cancel"]
            ]).resize());
            break;
        case 6:
            userState.paymentMethod = text;
            userState.step = 7;
            ctx.reply("✍️ Enter an optional description for the offer (or type 'None'):");
            break;
        case 7:
            userState.description = text !== "None" ? text : "No description";
            globalOffers.push({ ...userState, user: userId, id: globalOffers.length + 1 });
            delete userStates[userId];
            ctx.reply("✅ Offer successfully created.", Markup.keyboard([
                ["View My Address", "View My Public Key"],
                ["Create Offer", "View Offers"]
            ]).resize());
            break;
    }
});

bot.launch().then(() => console.log("🤖 Bot started..."));
