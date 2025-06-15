
"use client";
import SecretSetupForm from '@/components/game/SecretSetupForm';
// Button and ArrowLeft icon are no longer needed here as the back button is in SecretSetupForm
// import { Button } from '@/components/ui/button';
// import { ArrowLeft } from 'lucide-react';
// import { useRouter } from 'next/navigation'; // useRouter might still be needed if other navigation exists, but not for back button

export default function SetupPage() {
  // const router = useRouter(); // No longer needed if only for the back button

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-150px)] py-8">
      {/* Back button previously here is now removed and integrated into SecretSetupForm */}
      <div className="z-10 w-full">
        <SecretSetupForm />
      </div>
    </div>
  );
}
