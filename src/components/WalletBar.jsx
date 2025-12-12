import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

const shorten = (addr) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Not connected";

export function WalletBar() {
  const account = useCurrentAccount();

  return (
    <div className="w-full flex justify-end items-center gap-3 py-2 px-4">
      {account && (
        <span className="text-xs font-mono text-slate-600">
          {shorten(account.address)}
        </span>
      )}
      <ConnectButton />
    </div>
  );
}

