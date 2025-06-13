
import GameBoard from '@/components/game/GameBoard';
import Image from 'next/image';

export default function PlayPage() {
  return (
    <div className="relative">
      <div className="absolute inset-0 overflow-hidden z-0 opacity-5">
         <Image 
          src="https://placehold.co/1200x800.png" 
          alt="Abstract background" 
          layout="fill" 
          objectFit="cover"
          data-ai-hint="digital network"
        />
      </div>
      <div className="relative z-10">
        <GameBoard />
      </div>
    </div>
  );
}
