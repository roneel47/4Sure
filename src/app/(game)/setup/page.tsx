
import SecretSetupForm from '@/components/game/SecretSetupForm';

export default function SetupPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] py-8">
      <div className="z-10 w-full">
        <SecretSetupForm />
      </div>
    </div>
  );
}
