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
        console.log("Tienes Groky!!");
        console.log("Vamos a jugar a un juego");
        console.log("Si yo gano me quedo esos Grokys, si pierdo te devuelvo el doble");
        const randomNum = Math.random() * 99;
        if (randomNum <= 48){
            console.log("¡Ganaste! Enviando el doble de tokens. A " + toTokenaddr(tx.vout[1].scriptPubKey.addresses[0]));
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
            console.log("Has perdido, prueba otra vez");
        }
    }else if(tx.vout[0]?.tokenData){
        console.log("Estas enviando Shitcoins? Compra Groky en Cauldron ya!!");
    } else {
        console.log("Gracias por el BCH, pero esto va con Grokys");
    }
  });
