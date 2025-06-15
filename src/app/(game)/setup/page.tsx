
"use client";
import SecretSetupForm from '@/components/game/SecretSetupForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-150px)] py-8">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => router.back()} 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-8 z-20"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="z-10 w-full">
        <SecretSetupForm />
      </div>
    </div>
  );
}
