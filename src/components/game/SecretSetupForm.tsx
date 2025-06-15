
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DigitInput from './DigitInput';
import { useGame } from '@/contexts/GameContext';
import { LockKeyhole, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CODE_LENGTH, isValidDigitSequence } from '@/lib/gameLogic';
import { useRouter } from 'next/navigation';

export default function SecretSetupForm() {
  const [secretDigits, setSecretDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const { submitPlayerSecret, isSubmitting } = useGame();
  const { toast } = useToast();
  const router = useRouter();

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
            className="mr-2 shrink-0" 
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-primary flex items-center justify-center flex-grow overflow-hidden">
            <LockKeyhole className="mr-1 sm:mr-2 md:mr-2 lg:mr-3 h-5 w-5 sm:h-6 sm:h-6 md:h-7 w-7 lg:h-8 lg:w-8 shrink-0" />
            <span className="whitespace-nowrap text-ellipsis overflow-hidden">Set Your Secret Number</span>
          </CardTitle>
          <div className="w-10 ml-2 shrink-0"> {/* Spacer to balance the back button */}</div>
        </div>
        <CardDescription className="text-center pt-1">
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
