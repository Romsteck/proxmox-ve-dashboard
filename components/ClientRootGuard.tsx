"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useConnectionContext } from "@/lib/contexts/ConnectionContext";

export default function ClientRootGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useConnectionContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isConnected && !isConnecting && pathname !== "/connection") {
      router.replace("/connection");
    }
  }, [isConnected, isConnecting, pathname, router]);

  return <>{children}</>;
}

