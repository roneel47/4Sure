
"use client";
import LoginForm from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from 'next/image';

export default function LoginPage() {
  const { isLoggedIn, isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && isLoggedIn) {
      router.replace("/setup");
    }
  }, [isLoggedIn, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    );
  }

  if (isLoggedIn) {
    // This state will be hit if user is logged in AFTER isAuthLoading is false,
    // but before the useEffect redirects. Should be very brief.
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <p>Loading...</p>
      </div>
    ); 
  }

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 bg-background">
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
