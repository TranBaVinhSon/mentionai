"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Info as InformationCircleIcon,
  Loader2 as Loading02Icon,
  Eye as VisionIcon,
} from "lucide-react";
import { MyTooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { GengarSubscriptionPlan } from "@/services/api";
import { ReactNode } from "react";
import ModelLogo from "./model-logo";
import { PricingFeature } from "@/constants/pricing";

interface PricingCardProps {
  plan: GengarSubscriptionPlan;
  title: string;
  description: string;
  price: number;
  features: PricingFeature[];
  currentPlan?: GengarSubscriptionPlan | null;
  onChoosePlan: (plan: GengarSubscriptionPlan) => void;
  loading?: boolean;
  footerText?: string;
  isHighlighted?: boolean;
}

function PricingItem({
  isProItem,
  children,
  className,
}: {
  isProItem?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <li className="flex items-start">
      <CheckCircle2
        className={`w-5 h-5 mt-0.5 mr-2 ${
          isProItem ? "text-orange-500" : "text-primary"
        }`}
      />
      <span className={`flex-1 ${className}`}>{children}</span>
    </li>
  );
}

export function PricingCard({
  plan,
  title,
  description,
  price,
  features,
  currentPlan,
  onChoosePlan,
  loading = false,
  footerText,
  isHighlighted = false,
}: PricingCardProps) {
  const isCurrentPlan = currentPlan === plan;
  const isPlusCard = plan === GengarSubscriptionPlan.PLUS;
  const isProCard = plan === GengarSubscriptionPlan.PRO;

  return (
    <Card
      className={`w-full relative ${isHighlighted ? "bg-accent/10 border-accent" : ""}`}
    >
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl font-bold">
          {title}{" "}
          {isCurrentPlan && (isPlusCard || isProCard) ? (
            <CheckCircle2 className="inline-block w-6 h-6 ml-2 text-primary" />
          ) : null}
        </CardTitle>
        <p className="text-md text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">
          ${price}
          <span className="text-xl font-normal text-muted-foreground">
            /month
          </span>
        </div>

        {isCurrentPlan ? (
          <Button
            className="w-full mt-4 cursor-not-allowed"
            variant={isPlusCard || isProCard ? "default" : "outline"}
            disabled
          >
            Current Plan
          </Button>
        ) : (
          <Button
            className="w-full mt-4"
            variant={isPlusCard || isProCard ? "default" : "outline"}
            onClick={() => onChoosePlan(plan)}
            disabled={loading || isProCard}
          >
            {loading && (
              <Loading02Icon size={20} className="mr-1 animate-spin" />
            )}
            {isProCard ? "Coming Soon" : `Choose ${title}`}
          </Button>
        )}

        <ul className="mt-6 space-y-2">
          {features.map((feature, index) => (
            <PricingItem
              key={index}
              isProItem={isPlusCard || isProCard}
              className="flex flex-col"
            >
              <div className="flex items-center">
                {typeof feature.text === "string" ? (
                  <span>{feature.text}</span>
                ) : (
                  feature.text
                )}
                {!feature.socialIcons &&
                  !feature.modelIcons &&
                  feature.isNew && (
                    <span className="ml-1 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      New
                    </span>
                  )}
                {feature.tooltip && (
                  <MyTooltip content={feature.tooltip}>
                    <TooltipTrigger>
                      {feature.tooltipIcon === "vision" ? (
                        <VisionIcon size={16} className="ml-1" />
                      ) : (
                        <InformationCircleIcon size={16} className="ml-1" />
                      )}
                    </TooltipTrigger>
                  </MyTooltip>
                )}
              </div>
              {feature.socialIcons && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    {feature.socialIcons.map((icon, iconIndex) => (
                      <Avatar key={iconIndex} className="w-5 h-5">
                        <AvatarImage src={icon.src} alt={icon.alt} />
                        <AvatarFallback className="text-xs">
                          {icon.alt.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  {feature.isNew && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      New
                    </span>
                  )}
                </div>
              )}
              {feature.modelIcons && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1">
                    {feature.modelIcons.map((model, modelIndex) => (
                      <MyTooltip key={modelIndex} content={model.name}>
                        <TooltipTrigger>
                          <div className="w-5 h-5 flex items-center justify-center">
                            <ModelLogo model={model.model} size={20} />
                          </div>
                        </TooltipTrigger>
                      </MyTooltip>
                    ))}
                  </div>
                  {feature.isNew && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      New
                    </span>
                  )}
                </div>
              )}
            </PricingItem>
          ))}
        </ul>
      </CardContent>
      {footerText && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{footerText}</p>
        </CardFooter>
      )}
    </Card>
  );
}
