
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Users, User, ArrowRight, LogOut, ArrowLeft } from "lucide-react"; 
import Image from "next/image";

export default function ModeSelectPage() {
  const { isLoggedIn, isAuthLoading, username, logout } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, isAuthLoading, router]);

  if (isAuthLoading || !isLoggedIn) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4 min-h-screen bg-background">
        <p>Loading user session...</p>
      </div>
    );
  }

  return (
    <main className="relative flex-grow flex flex-col items-center justify-center p-4 min-h-screen bg-background">
       <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => router.back()} 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 z-20"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.svg" alt="4Sure Logo" width={120} height={36} />
          </div>
          <CardTitle className="text-3xl">Welcome, {username || 'Player'}!</CardTitle>
          <CardDescription className="pt-2 text-lg">
            Choose your game mode:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => router.push('/setup')}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <User className="mr-2 h-5 w-5" /> Single Player (vs Computer)
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
          <Button
            onClick={() => router.push('/multiplayer-setup')}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <Users className="mr-2 h-5 w-5" /> Multiplayer
            <ArrowRight className="ml-auto h-5 w-5" />
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center pt-4">
          <Button variant="link" onClick={logout} className="text-sm">
            <LogOut className="mr-2 h-4 w-4" /> Back to Username Select
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
