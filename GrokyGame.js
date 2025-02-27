'use client'
import { Rocket, MessageSquare, Brain } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState} from 'react';
import { Wallet, ImageI, toTokenaddr, TokenSendRequest } from 'mainnet-js';

export default function GrokyGame(){
    const [qr, setQr] = useState();
    const [wallet, setWallet] = useState();
    const [transactions, setTransactions] = useState([]);
    const tokenId = "0ffd45237e40e2ab19ab035343bf89ac81354f0299f002573374b8bfd5895d88";
    useEffect(()=>{
        const initWallet = async ()=>{
            const wallet = await Wallet.fromSeed("seedphrase");
            setWallet(wallet);
            setQr(wallet.getTokenDepositQr())
            const cancelWatch= wallet.watchAddressTransactions(async (tx)=>{
              if(tx.vout[1].scriptPubKey.addresses == wallet.cashaddr){
                return
              }
              if(tx.vout[0].tokenData?.category === tokenId){
                const randomNum = Math.random() * 99;
                if (randomNum <= 48){
                  const sendValue = tx.vout[0].tokenData.amount * 2;
                  const sendResponse = await wallet.send([
                    new TokenSendRequest({
                      cashaddr: toTokenaddr(tx.vout[1].scriptPubKey.addresses[0]),
                      amount: sendValue,
                      tokenId: tokenId,
                      value: 1000,
                    })
                  ]);
                  const transaction = {
                    win: true,
                    hash: tx.txid,
                    responsehash: sendResponse.txId,
                    amount: tx.vout[0].tokenData.amount
                  }
                  setTransactions(prev => [...prev, transaction])
                }else{
                  const transaction ={
                    win: false,
                    hash: tx.txid,
                    amount: tx.vout[0].tokenData.amount
                  }
                  setTransactions(prev => [...prev, transaction])
                }
              }
            })
        }
        initWallet()
    }, [])
  return(
    <section className="bg-black bg-opacity-40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
            <Rocket className="w-8 h-8" />
              GROKY GAME
            <span className="text-4xl">🥦</span>
          </h2>
          <p>Send Wallet: { wallet ? (wallet.tokenaddr) : "-" }</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {
                qr && <Image
                src={qr.src}
                alt={qr.alt}
                title={qr.title}
                className=""
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
