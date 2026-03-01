"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  href?: string;
  current?: boolean;
}

const routeNameMap: Record<string, string> = {
  browse: "Browse",
  community: "Community",
  apps: "Explore",
  models: "Models",
  features: "Features",
  pricing: "Pricing",
  faq: "FAQ",
  blog: "Blog",
  shared: "Shared",
  new: "New",
  edit: "Edit",
  dashboard: "Dashboard",
  c: "Conversation",
  explore: "Explore",
};

export function Breadcrumbs() {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbSegment[] => {
    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs: BreadcrumbSegment[] = [];

    // Always start with home
    breadcrumbs.push({
      label: "Home",
      href: "/",
    });

    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Handle dynamic segments
      if (segment.startsWith("[") && segment.endsWith("]")) {
        // Skip dynamic segments in breadcrumbs for now
        return;
      }

      // Check if this is a username (starts with @)
      if (segment.startsWith("@")) {
        breadcrumbs.push({
          label: segment,
          href: isLast ? undefined : currentPath,
          current: isLast,
        });
        return;
      }

      // Map route names to user-friendly labels
      const label = routeNameMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Special handling for apps segment to link to explore
      let href = isLast ? undefined : currentPath;
      if (segment === "apps" && !isLast) {
        href = "/explore";
      }

      breadcrumbs.push({
        label,
        href,
        current: isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on homepage
  if (pathname === "/" || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="hidden md:block w-full border-b bg-background sticky top-16 z-40">
      <div className="mx-auto px-4 md:px-10 py-2">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {crumb.current ? (
                    <BreadcrumbPage className="max-w-[200px] truncate">
                      {crumb.label === "Home" ? (
                        <Home className="size-4" />
                      ) : (
                        crumb.label
                      )}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href!} className="hover:text-foreground transition-colors">
                        {crumb.label === "Home" ? (
                          <Home className="size-4" />
                        ) : (
                          crumb.label
                        )}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}