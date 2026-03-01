"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

import { useIsMobile } from "@/hooks/use-mobile";
import { gengarApi } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { PropsWithChildren, useState, useMemo } from "react";
import { useSidebar } from "../ui/sidebar";
import { useRouter } from "next/navigation";
import { ScrollArea } from "../ui/scroll-area";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";

export const History = ({ children }: PropsWithChildren) => {
  const { status } = useSession();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Only fetch conversations when the modal/popover is open
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: gengarApi.getConversations,
    enabled: status === "authenticated" && open,
  });

  const filteredChats = useMemo(() => {
    return (data || []).filter((chat) =>
      chat.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [data, search]);

  if (status === "unauthenticated") return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{children}</DrawerTrigger>
        <DrawerContent className="h-full max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-left">~ / history</DrawerTitle>
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2"
            />
          </DrawerHeader>
          <ScrollArea>
            {isLoading ? (
              <div className="flex flex-col gap-4 px-4 py-3">
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
                <Skeleton className="w-full h-4" />
              </div>
            ) : (
              <ul className="pt-4 pb-0">
                {filteredChats.length === 0 && (
                  <li className="text-muted-foreground text-sm px-4 pb-8">
                    {data?.length === 0
                      ? "No conversations yet."
                      : "No results found."}
                  </li>
                )}
                {filteredChats.map((chat, idx) => (
                  <li
                    key={idx}
                    className="group hover:bg-muted transition-colors duration-200"
                  >
                    <div
                      onClick={() => {
                        router.push(`/c/${chat.uniqueId}`);
                        setOpen(false);
                        setOpenMobile(false);
                      }}
                      className="flex items-center space-x-4 py-2.5 px-4"
                    >
                      <p className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-sm">
                        {chat.title}
                      </p>
                      <div className="flex justify-between text-foreground/40 text-xs">
                        <p>
                          {chat?.isDebate && (
                            <span className="mr-1 bg-orange-400/15 text-orange-500 rounded-md px-1 py-0.5">
                              Debate
                            </span>
                          )}
                          {chat?.createdAt
                            ? dayjs(chat.createdAt).format("MMM D, YYYY")
                            : "unknown"}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="right"
        sideOffset={16}
        className="w-72 py-1 px-0"
      >
        <div className="px-4 py-3">
          <h2 className="text-foreground/40 text-sm mb-2">~ / history</h2>
          <Input
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-4 px-4 py-3">
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
            <Skeleton className="w-full h-4" />
          </div>
        ) : (
          <ul className="flex flex-col max-h-96 overflow-auto">
            {filteredChats.length === 0 && (
              <li className="text-muted-foreground text-sm px-4 py-2">
                {data?.length === 0
                  ? "No conversations yet."
                  : "No results found."}
              </li>
            )}
            {filteredChats.map((chat, idx) => (
              <li
                key={idx}
                className="group hover:bg-muted transition-colors duration-200"
              >
                <Link
                  href={`/c/${chat.uniqueId}`}
                  className={`flex flex-col space-y-1 py-2.5 px-4 ${
                    isMobile ? "text-sm" : "text-base"
                  }`}
                >
                  <p className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-sm">
                    {chat.title}
                  </p>
                  <div className="flex justify-between text-foreground/40 text-xs">
                    <p>
                      {chat.isDebate && (
                        <span className="mr-1 text-orange-500">Debate</span>
                      )}
                      {chat?.createdAt
                        ? dayjs(chat.createdAt).format("MMM D, YYYY")
                        : "unknown"}
                    </p>
                    {/* <p>{chat.models.join(", ")}</p> */}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
