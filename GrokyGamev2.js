'use client'
import { Rocket } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Wallet, toTokenaddr, TokenSendRequest } from 'mainnet-js';

export default function GrokyGame() {
    const [qr, setQr] = useState();
    const [wallet, setWallet] = useState();
    const [transactions, setTransactions] = useState([]);
    const tokenId = "d03a0d876afba161101674e363398e33939cc2164bd7ea5baccd937497d6216f"; // Token de la transacción JSON subida

    useEffect(() => {
        const initWallet = async () => {
            const wallet = await Wallet.fromSeed("seedphrase");
            setWallet(wallet);
            setQr(wallet.getTokenDepositQr());

            const processedTxs = new Set();

            const cancelWatch = wallet.watchAddressTransactions(async (tx) => {
                if (processedTxs.has(tx.txid)) return; // Evita procesar TX duplicadas
                processedTxs.add(tx.txid);

                console.log("🔍 Checking Transaction:", tx.txid);

                let totalTokensReceivedByGame = 0;
                let totalTokensSentByGame = 0;

                // 🔎 Analizar todos los `vout`
                tx.vout.forEach(output => {
                    if (output.tokenData?.category === tokenId) {
                        if (output.scriptPubKey?.addresses?.includes(wallet.tokenaddr)) {
                            totalTokensReceivedByGame += output.tokenData.amount; // El juego recibe tokens
                        } else {
                            totalTokensSentByGame += output.tokenData.amount; // El juego envía tokens
                        }
                    }
                });

                console.log(`📊 Tokens Recibidos por el Juego: ${totalTokensReceivedByGame}, Tokens Enviados por el Juego: ${totalTokensSentByGame}`);

                // 🚨 Si el juego ha enviado tokens y también ha recibido tokens, es un pago y se ignora.
                if (totalTokensSentByGame > 0 && totalTokensReceivedByGame > 0) {
                    console.log("⚠️ Ignored: This is a payout TX (not a bet)", tx.txid);
                    return;
                }

                // 🚨 Si no hay tokens recibidos por el juego, también se ignora.
                if (totalTokensReceivedByGame === 0) {
                    console.log("⚠️ Ignored: No tokens received by the game, this is not a bet", tx.txid);
                    return;
                }

                // 🎯 Buscar las direcciones de los jugadores (pago si ganan)
                const playerOutputs = tx.vout.filter(output =>
                    output.scriptPubKey?.addresses?.some(addr => addr !== wallet.tokenaddr)
                );

                if (playerOutputs.length === 0) {
                    console.log("⚠️ Ignored: No valid player outputs found", tx.txid);
                    return;
                }

                // Obtener la primera dirección válida de jugador
                const playerAddress = playerOutputs[0].scriptPubKey.addresses.find(addr => addr !== wallet.tokenaddr);
                if (!playerAddress) {
                    console.log("⚠️ Ignored: No valid address found for player", tx.txid);
                    return;
                }

                // 🎲 Determinar si la apuesta es ganadora
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
                        responsehash = sendResponse.txId;
                    } catch (error) {
                        console.error("❌ Error sending payout:", error);
                    }
                }

                setTransactions(prev => {
                    const newTransactions = [
                        ...prev,
                        {
                            win,
                            hash: tx.txid,
                            responsehash,
                            amount: totalTokensReceivedByGame,
                        }
                    ];
                    console.log("✅ Updated Transactions:", newTransactions);
                    return newTransactions;
                });
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
