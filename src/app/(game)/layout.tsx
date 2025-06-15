
"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, isAuthLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      if (pathname.startsWith('/setup') || pathname.startsWith('/play') || pathname.startsWith('/multiplayer-setup') || pathname.startsWith('/multiplayer-secret-setup') || pathname.startsWith('/multiplayer-play')) {
        router.replace("/");
      }
    }
  }, [isLoggedIn, isAuthLoading, router, pathname]);

  if (isAuthLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <p>Loading session...</p>
      </div>
    ); 
  }

  if (!isLoggedIn && (pathname.startsWith('/setup') || pathname.startsWith('/play') || pathname.startsWith('/multiplayer-setup') || pathname.startsWith('/multiplayer-secret-setup') || pathname.startsWith('/multiplayer-play'))) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <p>Redirecting to login...</p>
      </div>
    );
  }
  
  if (isLoggedIn) {
    return (
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    );
  }

  // Fallback for pages that might not strictly require login but are under this layout.
  // The primary redirect for game-specific paths is handled above.
  return <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">{children}</main>;
}
