import {
  Clock as Clock03Icon,
  Home as Home04Icon,
  Search as Search01Icon,
  Settings as Settings03Icon,
} from "lucide-react";
import { memo } from "react";
import { HomeIcon } from "../icons";
import Link from "next/link";
import { History } from "./history";
import { User } from "./user";

export const Logo = ({ size }: { size: number }) => (
  <div
    style={{ width: size, height: size }}
    className="w-5 h-5 relative border-2 rounded-md border-black dark:border-white"
  >
    <div className="w-1 h-1 absolute right-1 bottom-1 rounded-full bg-black dark:bg-white" />
  </div>
);

export const Sidebar = memo(() => {
  return (
    <div className="w-16 bg-muted dark:bg-background hidden md:block fixed h-full z-10 border border-border">
      <div className="w-full h-full relative flex flex-col justify-between">
        {/* <div className="items-center mb-10 flex flex-col pt-6 justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div> */}
        <div className="flex-1 h-full w-full flex py-6 flex-col items-center space-y-8">
          <Link href="/">
            <Home04Icon size={22} className="text-foreground" />
          </Link>
          <History />
        </div>
        <div className="pb-6 flex flex-col space-y-6 items-center justify-center">
          <User />
        </div>
      </div>
    </div>
  );
});
