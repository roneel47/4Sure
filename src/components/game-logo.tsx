import { Lock } from 'lucide-react';

const GameLogo = ({ size = "default" }: { size?: "default" | "small" }) => {
  const iconSize = size === "small" ? "w-6 h-6" : "w-10 h-10";
  const textSize = size === "small" ? "text-2xl" : "text-4xl sm:text-5xl";
  const marginBottom = size === "small" ? "mb-4" : "mb-8 sm:mb-12";

  return (
    <div className={`flex items-center space-x-3 ${marginBottom}`}>
      <Lock className={`${iconSize} text-primary`} />
      <h1 className={`${textSize} font-headline font-bold text-primary`}>4Sure</h1>
    </div>
  );
};

export default GameLogo;
