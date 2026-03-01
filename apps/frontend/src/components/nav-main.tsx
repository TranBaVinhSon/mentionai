"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-user";
import { GengarSubscriptionPlan } from "@/services/api";
import { setSignInDialog, setSubscriptionDialog } from "@/store/app";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React from "react";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: any;
    badge?: {
      text: string;
      color: string;
    };
    provider?: any;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      icon?: any;
      badge?: {
        text: string;
        color: string;
      };
    }[];
  }[];
}) {
  const { status, data: session } = useSession();
  const router = useRouter();
  const { data: user } = useUser();
  console.log(user);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(({ provider: Provider = React.Fragment, ...item }) => {
          const MenuContent = (
            <SidebarMenuButton asChild tooltip={item.title}>
              <div className="flex items-center gap-2">
                {item.icon && <item.icon />}
                <span className="flex items-center gap-2">
                  {item.title}
                  {item.badge && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${item.badge.color}`}
                    >
                      {item.badge.text}
                    </span>
                  )}
                </span>
              </div>
            </SidebarMenuButton>
          );

          return (
            <SidebarMenuItem key={item.title}>
              {Provider ? <Provider>{MenuContent}</Provider> : MenuContent}
              {item.items?.length ? (
                <SidebarMenuSub>
                  {item.items.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton
                        className="cursor-pointer"
                        onClick={() => {
                          if (subItem.url === "/apps/new") {
                            if (status === "unauthenticated") {
                              setSignInDialog(true);
                            } else if (
                              user?.subscriptionPlan ===
                              GengarSubscriptionPlan.FREE
                            ) {
                              setSubscriptionDialog(true);
                            } else {
                              router.push(subItem.url);
                            }
                          } else {
                            router.push(subItem.url);
                          }
                        }}
                      >
                        {subItem.icon && <subItem.icon />}
                        <span className="flex items-center gap-2">
                          {subItem.title}
                          {subItem.badge && (
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${subItem.badge.color}`}
                            >
                              {subItem.badge.text}
                            </span>
                          )}
                        </span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              ) : null}
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
