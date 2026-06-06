"use client";
import { useWallet, WalletId } from "@txnlab/use-wallet-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Wallet } from "lucide-react";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { activeAddress, activeWallet } = useWallet();
  const { wallets } = useWallet();
  const [open, setOpen] = useState(false);

  if (activeAddress && activeWallet) {
    return (
      <Button
        variant="outline"
        className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
        onClick={() => activeWallet.disconnect()}
      >
        <Wallet className="mr-2 h-4 w-4" />
        {truncate(activeAddress)}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-white">Connect your wallet</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          {wallets?.map((wallet) => (
            <Button
              key={wallet.id}
              variant="outline"
              className="w-full border-zinc-600 text-white hover:bg-zinc-800 justify-start h-14 text-base"
              onClick={async () => {
                await wallet.connect();
                setOpen(false);
              }}
            >
              <span className="font-medium">
                {wallet.id === WalletId.PERA ? "Pera Wallet" : "Defly Wallet"}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
