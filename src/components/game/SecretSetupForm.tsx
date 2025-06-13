
"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DigitInput from './DigitInput';
import { useGame } from '@/contexts/GameContext';
import { LockKeyhole } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_DIGITS = 4;

export default function SecretSetupForm() {
  const [secretDigits, setSecretDigits] = useState<string[]>(Array(MAX_DIGITS).fill(''));
  const { submitPlayerSecret, isSubmitting } = useGame();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secretDigits.some(digit => digit === '') || secretDigits.length !== MAX_DIGITS) {
      toast({
        title: "Invalid Secret",
        description: `Please enter all ${MAX_DIGITS} digits for your secret number.`,
        variant: "destructive",
      });
      return;
    }
    await submitPlayerSecret(secretDigits);
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl text-primary flex items-center justify-center">
          <LockKeyhole className="mr-3 h-8 w-8" /> Set Your Secret Number
        </CardTitle>
        <CardDescription className="pt-2">
          Enter a 4-digit number (0-9, repetition allowed). This will be your secret.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DigitInput
            count={MAX_DIGITS}
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
