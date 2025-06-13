
"use client";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from 'next/image';

export default function LoginPage() {
  const { isLoggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/setup");
    }
  }, [isLoggedIn, router]);

  if (isLoggedIn) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    ); // Or a loading spinner
  }

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-zinc-800">
       <div className="absolute inset-0 overflow-hidden z-0">
        <Image 
          src="https://placehold.co/1200x800.png" 
          alt="Abstract background" 
          layout="fill" 
          objectFit="cover" 
          className="opacity-20"
          data-ai-hint="abstract geometric"
        />
      </div>
      <div className="z-10">
        <LoginForm />
      </div>
    </main>
  );
}
