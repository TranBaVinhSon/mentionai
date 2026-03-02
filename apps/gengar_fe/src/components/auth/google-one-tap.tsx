"use client";

import { useGoogleOneTap } from "@/hooks/use-google-one-tap";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface GoogleOneTapProps {
  disabled?: boolean;
}

export function GoogleOneTap({ disabled = false }: GoogleOneTapProps) {
  const { data: session } = useSession();
  const { cancel } = useGoogleOneTap({ disabled });

  useEffect(() => {
    if (session) {
      cancel();
    }
  }, [session, cancel]);

 
  return null;
}
