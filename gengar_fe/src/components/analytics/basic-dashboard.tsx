"use client";

import { useQuery } from "@tanstack/react-query";
import { gengarApi } from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, MessagesSquare, Sparkles } from "lucide-react";
import { UpgradeDialog } from "@/components/shared/upgrade-dialog";
import { useState } from "react";

interface BasicDashboardProps {
  uniqueId: string;
}

export function BasicDashboard({ uniqueId }: BasicDashboardProps) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["app-basic-analytics", uniqueId],
    queryFn: () => gengarApi.getAppBasicAnalytics(uniqueId),
    enabled: !!uniqueId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-primary/10 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totalConversations.toLocaleString() ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Messages
            </CardTitle>
            <MessagesSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.totalMessages.toLocaleString() ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="py-8">
          <div className="text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">
              Want deeper insights?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Upgrade to Plus for detailed analytics including page views,
              unique visitors, geographic distribution, charts, and
              conversation history.
            </p>
            <Button
              onClick={() => setShowUpgradeDialog(true)}
              className="mt-2"
            >
              Upgrade to Plus
            </Button>
          </div>
        </CardContent>
      </Card>

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        title="Upgrade to Plus for Full Analytics"
        description="Get detailed insights into your digital clone's performance with our advanced analytics dashboard."
        features={[
          "Track page views and unique visitors",
          "Analyze geographic distribution",
          "View detailed charts and trends",
          "Access full conversation history",
        ]}
      />
    </>
  );
}
