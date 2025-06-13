
import SecretSetupForm from '@/components/game/SecretSetupForm';
import Image from 'next/image';

export default function SetupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] py-8">
      <div className="absolute inset-0 overflow-hidden z-0 opacity-10">
         <Image 
          src="https://placehold.co/1200x800.png" 
          alt="Abstract background" 
          layout="fill" 
          objectFit="cover"
          data-ai-hint="security code"
        />
      </div>
      <div className="z-10 w-full">
        <SecretSetupForm />
      </div>
    </div>
  );
}
