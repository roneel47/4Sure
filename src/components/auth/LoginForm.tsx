
"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

export default function LoginForm() {
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    login();
    router.push("/setup");
  };

  if (isLoggedIn) {
    // This case should ideally be handled by redirect in page.tsx or layout.tsx
    // For robustness, if user is logged in and somehow lands here, redirect.
    if (typeof window !== 'undefined') router.push("/setup");
    return null;
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl text-primary">NumberLock Duel</CardTitle>
        <CardDescription className="text-muted-foreground pt-2">
          Guess the secret 4-digit number before your opponent does!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <p className="text-center">
          Click below to start. A random username will be generated for you.
        </p>
        <Button onClick={handleLogin} className="w-full" size="lg">
          <Play className="mr-2 h-5 w-5" /> Login to Play
        </Button>
      </CardContent>
    </Card>
  );
}
