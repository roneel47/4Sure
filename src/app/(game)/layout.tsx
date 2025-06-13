
"use client";
import Header from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoggedIn, username } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <p>Redirecting to login...</p>
      </div>
    ); // Or a loading spinner
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </main>
    </div>
  );
}
