"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import {
  UserCheck,
  Link as LinkIcon,
  MessageSquareText,
  Share2,
  ArrowRight,
  Sparkles,
  Globe,
  BarChart3,
  Eye,
  Users,
  MessageSquare,
} from "lucide-react";
import { setSignInDialog, setSubscriptionDialog } from "@/store/app";
import { useRouter } from "next/navigation";
import { GengarSubscriptionPlan } from "@/services/api";
import { useUser } from "@/hooks/use-user";

export default function FeaturesPage() {
  const { status } = useSession();
  const router = useRouter();
  const { data: user } = useUser();

  const handleCreateClone = () => {
    if (status === "unauthenticated") {
      setSignInDialog(true);
    } else if (user?.subscriptionPlan === GengarSubscriptionPlan.FREE) {
      setSubscriptionDialog(true);
    } else {
      router.push("/apps/new?me=true");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-2 md:px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Sparkles className="size-4" />
            Digital Clone Feature
          </div>
          <h2 className="text-4xl font-bold tracking-tighter sm:text-6xl">
            Create Your <span className="text-primary">Digital Clone</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Build an AI-powered version of yourself that learns from your social media, 
            blogs, and content. Let others interact with your digital presence 24/7.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              onClick={handleCreateClone}
              className="gap-2"
            >
              Create Your Clone
              <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="/@sontbv" target="_blank" rel="noopener noreferrer">
                See Example
              </a>
            </Button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            How It Works
          </h3>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <UserCheck className="size-6 text-primary" />
                </div>
                <CardTitle>1. Connect Your Identity</CardTitle>
                <CardDescription>
                  Link your social media profiles and content sources to train your AI
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquareText className="size-6 text-primary" />
                </div>
                <CardTitle>2. Customize Interactions</CardTitle>
                <CardDescription>
                  Set up suggested questions and configure how your clone responds
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Share2 className="size-6 text-primary" />
                </div>
                <CardTitle>3. Share & Publish</CardTitle>
                <CardDescription>
                  Get a unique URL (@yourname) to share your digital clone with the world
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>


        {/* Social Media Integration */}
        <div className="mb-16">
          <Card className="overflow-hidden">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Connect Your Digital Presence</CardTitle>
              <CardDescription className="text-lg">
                Integrate with popular social platforms and content sources
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {/* Supported Platforms */}
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/linkedin.svg" alt="LinkedIn" className="size-8" />
                  <span className="text-sm font-medium">LinkedIn</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/reddit.svg" alt="Reddit" className="size-8" />
                  <span className="text-sm font-medium">Reddit</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/medium.svg" alt="Medium" className="size-8" />
                  <span className="text-sm font-medium">Medium</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/github.svg" alt="GitHub" className="size-8" />
                  <span className="text-sm font-medium">GitHub</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/substack.svg" alt="Substack" className="size-8" />
                  <span className="text-sm font-medium">Substack</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/goodreads.svg" alt="Goodreads" className="size-8" />
                  <span className="text-sm font-medium">Goodreads</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/producthunt.svg" alt="Product Hunt" className="size-8" />
                  <span className="text-sm font-medium">Product Hunt</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-background border hover:border-primary/50 transition-colors">
                  <img src="/icons/twitter.svg" alt="Twitter" className="size-8" />
                  <span className="text-sm font-medium">Twitter</span>
                </div>
              </div>
              
              {/* Blog and YouTube Integration */}
              <div className="border-t pt-8">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <LinkIcon className="size-5 text-primary" />
                  External Content Sources
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <Globe className="size-4" />
                      Blog Posts & Articles
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      Import your blog posts and articles from any website. We'll extract the content to train your digital clone.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h5 className="font-medium flex items-center gap-2">
                      <svg className="size-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube Videos
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      Add YouTube videos - we'll extract transcripts to capture your speaking style and knowledge.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suggested Questions Feature */}
        <div className="mb-16">
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareText className="size-5 text-primary" />
                  Smart Conversation Starters
                </CardTitle>
                <CardDescription>
                  Configure suggested questions to guide conversations with your digital clone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    "What does your typical workday look like?",
                    "What recent project are you most proud of?",
                    "How do you stay up to date with industry trends?",
                    "What advice would you give to someone starting out?"
                  ].map((question, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{i + 1}</span>
                      </div>
                      <p className="text-sm">{question}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="size-3" />
                    AI-Generated
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Questions are generated based on your content
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="size-5 text-primary" />
                  Publishing & Sharing
                </CardTitle>
                <CardDescription>
                  Share your digital clone with a custom URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-primary" />
                    <span className="font-medium">Your Public URL</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-background border">
                    <span className="text-muted-foreground">mentionai.io/</span>
                    <span className="font-mono font-medium">@yourname</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Anyone can chat with your digital clone using this unique URL
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h5 className="font-medium text-sm">Privacy Controls</h5>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">Make clone public</span>
                      <div className="size-5 rounded bg-primary flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border">
                      <span className="text-sm">Allow embedding on websites</span>
                      <div className="size-5 rounded bg-muted"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>


        {/* Analytics Dashboard - Plus Feature */}
        <div className="mb-16">
          <Card className="overflow-hidden relative">
            <div className="absolute top-4 right-4">
              <Badge 
                variant="outline" 
                className="bg-primary/10 text-primary border-primary/50"
              >
                Plus Only
              </Badge>
            </div>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <BarChart3 className="size-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Analytics Dashboard</CardTitle>
              <CardDescription className="text-lg">
                Track and measure your digital clone's impact with professional analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Metric Cards Preview */}
                <div className="p-4 rounded-lg bg-background border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Page Views</span>
                    <Eye className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">12,847</p>
                  <p className="text-xs text-green-600">+23% this month</p>
                </div>
                
                <div className="p-4 rounded-lg bg-background border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Unique Visitors</span>
                    <Users className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">3,621</p>
                  <p className="text-xs text-green-600">+18% this month</p>
                </div>
                
                <div className="p-4 rounded-lg bg-background border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Conversations</span>
                    <MessageSquare className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">856</p>
                  <p className="text-xs text-green-600">+42% this month</p>
                </div>
                
                <div className="p-4 rounded-lg bg-background border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Countries</span>
                    <Globe className="size-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">47</p>
                  <p className="text-xs text-muted-foreground">Global reach</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Eye className="size-4 text-primary" />
                    Real-time Insights
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5"></div>
                      Monitor visitor engagement in real-time
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5"></div>
                      Track conversation quality and topics
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5"></div>
                      Identify peak activity times
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Globe className="size-4 text-primary" />
                    Geographic Analytics
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5"></div>
                      See where your visitors come from
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5"></div>
                      Country-wise engagement breakdown
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5"></div>
                      Optimize content for your audience
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-center">
                  <span className="font-medium">Upgrade to Plus</span> to unlock comprehensive analytics 
                  and understand how people interact with your digital clone
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-6 py-8">
          <h3 className="text-2xl font-bold">
            Ready to Create Your Digital Twin?
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of professionals, creators, and thought leaders who have already 
            created their AI-powered digital presence.
          </p>
          <Button 
            size="lg" 
            onClick={handleCreateClone} 
            className="gap-2"
          >
            Create Your Digital Clone Now
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
