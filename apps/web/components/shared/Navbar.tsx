"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ModeToggle } from "@/components/shared/ModeToggle";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/bridge", label: "Fiat Bridge" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            EURance
          </span>
          <span className="text-xs text-zinc-500 mt-1">by EURD × Algorand</span>
        </Link>

        <div className="flex items-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === link.href
                  ? "text-emerald-400"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
          <ModeToggle />
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
