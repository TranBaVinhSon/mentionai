import Image from "next/image";
import { Logo } from "../layout/sidebar";

interface AppLogoProps {
  logo?: string;
  size?: number;
}

export default function AppLogo({ logo, size = 16 }: AppLogoProps) {
  if (!logo) {
    return <Logo size={size} />;
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-sm overflow-hidden flex items-center justify-center"
    >
      <img
        src={logo}
        alt="App logo"
        width={size}
        height={size}
        className="w-full h-full object-contain"
        style={{ margin: 0 }}
      />
    </div>
  );
} 