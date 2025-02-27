'use client'
import { Rocket } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Wallet, toTokenaddr, TokenSendRequest } from 'mainnet-js';

export default function GrokyGame() {
    const [qr, setQr] = useState();
    const [wallet, setWallet] = useState();
    const [transactions, setTransactions] = useState([]);
    const tokenId = "d03a0d876afba161101674e363398e33939cc2164bd7ea5baccd937497d6216f";

    useEffect(() => {
        const initWallet = async () => {
            const wallet = await Wallet.fromSeed("seedphrase");
            setWallet(wallet);
            setQr(wallet.getTokenDepositQr());

            const processedTxs = new Set();

            const cancelWatch = wallet.watchAddressTransactions(async (tx) => {
                if (processedTxs.has(tx.txid)) return; // Ignore duplicate Tx
                processedTxs.add(tx.txid);

                console.log("🔍 Checking Transaction:", tx.txid);
                
                //I use this variable later to identify type of tx
                let totalTokensReceivedByGame = 0;
                let totalTokensSentByGame = 0;

                // Analize all vouts
                tx.vout.forEach(output => {
                    if (output.tokenData?.category === tokenId) {
                        if (output.scriptPubKey?.addresses?.includes(wallet.tokenaddr)) {
                            totalTokensReceivedByGame += output.tokenData.amount;
                        } else {
                            totalTokensSentByGame += output.tokenData.amount;
                        }
                    }
                });

                // If the game sends and recive tokens, its payout and I ignore it
                if (totalTokensSentByGame > 0 && totalTokensReceivedByGame > 0) {
                    return;
                }

                // Also ignore if the game don't recive tokens
                if (totalTokensReceivedByGame === 0) {
                    return;
                }

                // Search for the player wallet
                const playerOutputs = tx.vout.filter(output =>
                    output.scriptPubKey?.addresses?.some(addr => addr !== wallet.cashaddr)
                );

                if (playerOutputs.length === 0) {
                    return;
                }

                
                const playerAddress = playerOutputs[0].scriptPubKey.addresses.find(addr => addr !== wallet.tokenaddr);
                if (!playerAddress) {
                    return;
                }
                  
                
                const randomNum = Math.random() * 99;
                const win = randomNum <= 48;
                console.log("🎲 Bet outcome:", win ? "Win" : "Lose");

                let responsehash = null;
                if (win) {
                    const sendValue = totalTokensReceivedByGame * 2;
                    try {
                        const sendResponse = await wallet.send([
                            new TokenSendRequest({
                                cashaddr: toTokenaddr(playerAddress),
                                amount: sendValue,
                                tokenId: tokenId,
                                value: 1000,
                            }),
                        ]);
                        const transaction = {
                          win: true,
                          hash: tx.txid,
                          responsehash: sendResponse.txId,
                          amount: tx.vout[0].tokenData.amount
                        }
                        setTransactions(prev => [...prev, transaction])
                        responsehash = sendResponse.txId;
                    } catch (error) {
                        console.error("❌ Error sending payout:", error);
                    }
                }else{
                  const transaction ={
                    win: false,
                    hash: tx.txid,
                    amount: tx.vout[0].tokenData.amount
                  }
                  setTransactions(prev => [...prev, transaction])
                }
            });
        };

        initWallet();
    }, []);

    return (
        <section className="bg-black bg-opacity-40 py-16">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
                    <Rocket className="w-8 h-8" />
                    GROKY GAME
                    <span className="text-4xl">🥦</span>
                </h2>
                <p>Send Wallet: {wallet ? wallet.tokenaddr : "-"}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {
                        qr && <Image
                            src={qr.src}
                            alt={qr.alt}
                            title={qr.title}
                            width={256}
                            height={256}
                            priority
                        />
                    }
                    <table>
                        <thead>
                            <tr>
                                <th>Winner?</th>
                                <th>Bet Amount</th>
                                <th>Payout Tx</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions?.length > 0 && transactions.map(transaction => (
                                <tr key={transaction.hash}>
                                    <td>{transaction.win ? "🎉" : "❌"}</td>
                                    <td>{transaction.amount}</td>
                                    <td>{transaction.win ? transaction.responsehash : "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
