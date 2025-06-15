
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DigitInput from './DigitInput';
import { useGame } from '@/contexts/GameContext';
import { LockKeyhole, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
import { useToast } from '@/hooks/use-toast';
import { CODE_LENGTH, isValidDigitSequence } from '@/lib/gameLogic';
import { useRouter } from 'next/navigation'; // Added useRouter

export default function SecretSetupForm() {
  const [secretDigits, setSecretDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const { submitPlayerSecret, isSubmitting } = useGame();
  const { toast } = useToast();
  const router = useRouter(); // Initialize router

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secretDigits.some(digit => digit === '') || secretDigits.length !== CODE_LENGTH) {
      toast({
        title: "Invalid Secret",
        description: `Please enter all ${CODE_LENGTH} digits for your secret number.`,
        variant: "destructive",
      });
      return;
    }
    if (!isValidDigitSequence(secretDigits)) {
      toast({
        title: "Invalid Secret Pattern",
        description: `Code cannot have 3 or 4 identical consecutive digits (e.g., no "0001" or "1111").`,
        variant: "destructive",
      });
      return;
    }
    await submitPlayerSecret(secretDigits);
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between w-full mb-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            aria-label="Go back"
            className="mr-2" // Add some margin if needed
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-3xl text-primary flex items-center justify-center flex-grow">
            <LockKeyhole className="mr-3 h-8 w-8" /> Set Your Secret Number
          </CardTitle>
          <div className="w-10 ml-2"> {/* Spacer to balance the back button, adjust width as needed (w-10 is for size="icon") */}</div>
        </div>
        <CardDescription className="text-center pt-1"> {/* Ensure description is centered if CardHeader lost text-center */}
          Enter a {CODE_LENGTH}-digit number (0-9, repetition allowed, but no 3 or 4 identical in a row).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DigitInput
            count={CODE_LENGTH}
            values={secretDigits}
            onChange={setSecretDigits}
            disabled={isSubmitting}
            ariaLabel="Secret digit"
          />
          <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
            {isSubmitting ? 'Submitting...' : 'Confirm Secret'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
