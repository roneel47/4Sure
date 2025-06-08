import Image from 'next/image';

const GameLogo = ({ size = "default" }: { size?: "default" | "small" }) => {
  const imageWidth = size === "small" ? 100 : 180; // Adjusted width for the new logo
  const imageHeight = size === "small" ? 30 : 54; // Adjusted height for the new logo
  const marginBottom = size === "small" ? "mb-4" : "mb-8 sm:mb-12";

  return (
    <div className={`flex items-center ${marginBottom}`} data-ai-hint="game logo">
      <Image
        src="/4Sure.png"
        alt="4Sure Game Logo"
        width={imageWidth}
        height={imageHeight}
        priority // Preload logo as it's likely LCP
      />
    </div>
  );
};

export default GameLogo;
