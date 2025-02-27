import { TokenSendRequest, toTokenaddr, Wallet } from "mainnet-js";
const tokenid = "0ffd45237e40e2ab19ab035343bf89ac81354f0299f002573374b8bfd5895d88";
const wallet = await Wallet.fromSeed(
    "seedphrase",
    "m/44'/145'/0'/0/0"
);

console.log(wallet.tokenaddr);
const cancelWatch = wallet.watchAddressTransactions(async (tx) => {
    if(tx.vout[1].scriptPubKey.addresses == wallet.cashaddr){
        return
    }
    if(tx.vout[0]?.tokenData?.category === tokenid){
        console.log("You have Groky!!");
        console.log("Let's play a game");
        console.log("If I win I keep those Grokys, otherwise I send you back double");
        const randomNum = Math.random() * 99;
        if (randomNum <= 48){
            console.log("You win! Sending double tokens to: " + toTokenaddr(tx.vout[1].scriptPubKey.addresses[0]));
            const sendValue = tx.vout[0].tokenData.amount * 2;
            const sendResponse = await wallet.send([
                new TokenSendRequest({
                    cashaddr: toTokenaddr(tx.vout[1].scriptPubKey.addresses[0]),
                    amount: sendValue,
                    tokenId: tokenid,
                    value: 1000,
                }),
            ]);
            console.log(sendResponse.txId)
        } else {
            console.log("You lose, try again");
        }
    }else if(tx.vout[0]?.tokenData){
        console.log("Are you sending Shitcoins? Buy Groky on Cauldron now!!");
    } else {
        console.log("Thanks for the BCH, but this game is played with Grokys");
    }
  });
