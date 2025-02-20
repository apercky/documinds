import { User } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AvatarWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
}

export function AvatarWithFallback({
  src,
  alt,
  className = "",
  size = 32,
}: AvatarWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-full ${className}`}
        style={{ width: size, height: size }}
      >
        <User className="w-4/6 h-4/6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
