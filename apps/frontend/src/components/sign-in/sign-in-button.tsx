"use client";

import { useSession } from "next-auth/react";
import { setSignInDialog } from "@/store/app";
import { LogIn as LoginCircle02Icon } from "lucide-react";

export default function SignInButton() {
  const { data: session } = useSession();
  return (
    <>
      {!session && (
        <button
          onClick={() => setSignInDialog(true)}
          className="py-2 text-sm bg-black text-white focus:outline-none rounded-full dark:bg-white px-4 dark:text-black font-semibold flex items-center justify-center gap-2"
        >
          <LoginCircle02Icon size={20} />
          Sign In
        </button>
      )}
    </>
  );
}
