"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dayjs from "dayjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarColor } from "@/utils/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Users,
  Sparkles,
  MessageCircle,
  Flame,
  Eye,
  ArrowRight,
  PlusCircle,
  Tag,
} from "lucide-react";
import { gengarApi } from "@/services/api";
import ModelLogo from "@/components/shared/model-logo";
import { SignInDialog } from "@/components/sign-in/sign-in-dialog";
import { setSignInDialog } from "@/store/app";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Define interface for Debate (ensure it matches API)
interface Debate {
  uniqueId: string;
  title: string;
  createdAt: string;
  category?: string;
  debateMetadata: {
    participants: Array<{
      type: string;
      model?: string;
      app?: {
        name: string;
        displayName?: string | null;
        logo?: string | null;
      };
      metadata?: {
        displayName?: string | null;
        logo?: string | null;
      };
    }>;
  };
  [key: string]: any;
}

const getDebateHeat = (debateId: string) => {
  const lastChar = debateId.charAt(debateId.length - 1);
  const num = parseInt(lastChar, 16) % 3;
  return num + 1;
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const getParticipantName = (participant: any) => {
  if (participant.type === "model") {
    return participant.model || "AI Model";
  } else if (participant.type === "app") {
    return (
      participant.app?.displayName ||
      participant.metadata?.displayName ||
      participant.app?.name ||
      "AI App"
    );
  }
  return "Unknown Participant";
};

export default function CommunityPage() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: session, status } = useSession();
  const router = useRouter();

  const spotlightRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        setMousePosition({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const data = await gengarApi.getPublicDebates();
        setDebates(data);
      } catch (err) {
        console.error("Error fetching debates:", err);
        setError("Failed to load debates. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDebates();
  }, []);

  const handleDebateClick = (debateId: string) => {
    if (status === "authenticated") {
      router.push(`/shared/c/${debateId}`);
    } else {
      setSignInDialog(true);
    }
  };

  // Format date function
  const formatDate = (dateString: string) => {
    try {
      return dayjs(dateString).format("MMM DD, YYYY");
    } catch (err) {
      console.error("Error formatting date:", err);
      return dateString;
    }
  };

  // Handler for the new button (placeholder)
  const handleStartNewDebate = () => {
    console.log("Start new debate clicked!");
    // TODO: Implement navigation or modal logic
    // Example: router.push('/debate/new');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/20 via-background to-background/70 relative overflow-hidden pb-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-70">
        <motion.div
          className="absolute top-[-50px] left-[-50px] w-96 h-96 bg-gradient-radial from-purple-500/10 via-transparent to-transparent rounded-full"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        />
        <motion.div
          className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-gradient-radial from-blue-500/10 via-transparent to-transparent rounded-full"
          animate={{ scale: [1, 1.05, 1], rotate: [0, -15, 0] }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 5,
          }}
        />
        <motion.div
          className="absolute top-1/4 right-[10%] w-80 h-80 bg-gradient-radial from-orange-500/10 via-transparent to-transparent rounded-full"
          animate={{ scale: [1, 1.08, 1], rotate: [0, 20, 0] }}
          transition={{
            duration: 18,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 2,
          }}
        />
      </div>

      <div
        ref={spotlightRef}
        className="pointer-events-none fixed inset-0 z-30 transition duration-300 opacity-0 md:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, hsla(240, 70%, 80%, 0.06), transparent 40%)`,
        }}
      />

      <div className="container mx-auto py-12 px-4 relative z-20">
        {/* Keep Animated Header */}
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <motion.div
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="h-9 w-9 " />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r bg-clip-text py-2">
              AI Conversation Inspiration
            </h1>
            <motion.div
              animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            >
              <Sparkles className="h-9 w-9" />
            </motion.div>
          </div>
          <motion.p
            className="text-muted-foreground max-w-2xl mx-auto text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          >
            Explore fascinating debates, discussions, and dialogues between AI
            models and personas. Discover creative conversations shared by our
            community.
          </motion.p>
        </motion.div>

        {/* Restore Grid Layout */}
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <motion.div
                className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </div>
          ) : error ? (
            <motion.div
              className="text-center text-destructive p-8 bg-destructive/10 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p>{error}</p>
            </motion.div>
          ) : (
            // Grid container
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.07 } },
              }}
            >
              {debates.map((debate, index) => {
                const heatLevel = getDebateHeat(debate.uniqueId);
                const isHovered = hoveredCard === debate.uniqueId;

                // Card variant for entrance animation
                const cardVariants = {
                  hidden: { opacity: 0, y: 30, scale: 0.98 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.4, ease: "easeOut" },
                  },
                };

                return (
                  <motion.div
                    key={debate.uniqueId}
                    variants={cardVariants}
                    layout // Animate layout changes
                    className="relative cursor-pointer group"
                    onClick={() => handleDebateClick(debate.uniqueId)}
                    onMouseEnter={() => setHoveredCard(debate.uniqueId)}
                    onMouseLeave={() => setHoveredCard(null)}
                    whileHover={{ zIndex: 10 }} // Bring card to front on hover
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Enhanced Border Glow */}
                    <motion.div
                      className={cn(
                        "absolute -inset-0.5 rounded-xl blur-lg bg-gradient-to-br transition-opacity duration-300",
                        heatLevel === 3
                          ? "from-orange-500/70 to-purple-500/70"
                          : heatLevel === 2
                          ? "from-orange-400/50 to-blue-400/50"
                          : "from-transparent to-transparent",
                        isHovered ? "opacity-70" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />
                    <motion.div
                      className={cn(
                        "absolute inset-0 rounded-xl",
                        "bg-gradient-to-br transition-opacity duration-300",
                        heatLevel === 3
                          ? "from-orange-500/20 via-transparent to-purple-500/10"
                          : heatLevel === 2
                          ? "from-orange-400/15 via-transparent to-blue-400/10"
                          : "from-transparent to-transparent",
                        isHovered ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />

                    {/* Card Component with enhanced hover */}
                    <motion.div
                      initial={false}
                      animate={
                        isHovered
                          ? { scale: 1.03, rotateX: 5, rotateY: -3 }
                          : { scale: 1, rotateX: 0, rotateY: 0 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    >
                      <Card
                        className={cn(
                          "h-full flex flex-col relative overflow-hidden",
                          "bg-card/80 backdrop-blur-sm border border-border/20", // Slightly transparent background
                          "transition-shadow duration-300",
                          isHovered ? "shadow-xl" : "shadow-md"
                        )}
                      >
                        <AnimatePresence>
                          {isHovered && heatLevel >= 2 && (
                            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                              {[...Array(heatLevel * 8)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className={cn(
                                    "absolute w-1 h-1 rounded-full",
                                    heatLevel === 3
                                      ? "bg-orange-400"
                                      : "bg-orange-300/80"
                                  )}
                                  initial={{
                                    x: `${Math.random() * 100}%`,
                                    y: `${Math.random() * 50 + 50}%`, // Start lower
                                    scale: 0,
                                    opacity: 0,
                                  }}
                                  animate={{
                                    x: `+=${(Math.random() - 0.5) * 60}px`, // Wider spread
                                    y: `-=${Math.random() * 50 + 50}px`, // Travel further up
                                    scale: [0, 1.2, 0.6, 0],
                                    opacity: [0, 1, 0.8, 0],
                                  }}
                                  exit={{ opacity: 0 }}
                                  transition={{
                                    duration: 0.8 + Math.random() * 0.5,
                                    ease: "easeOut",
                                    delay: Math.random() * 0.3, // Start quicker
                                  }}
                                  style={{
                                    left: `${Math.random() * 80 + 10}%`,
                                    top: `${Math.random() * 20 + 80}%`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </AnimatePresence>

                        <CardHeader className="relative z-10">
                          <div className="flex justify-between items-start mb-1">
                            <CardTitle className="line-clamp-2 pr-6 text-base font-semibold">
                              {debate.title}
                            </CardTitle>

                            {/* Animated Heat Indicator */}
                            {heatLevel >= 2 && (
                              <motion.div
                                className="flex items-center text-orange-500 flex-shrink-0"
                                initial={{ scale: 1 }}
                                animate={
                                  isHovered
                                    ? { scale: [1, 1.2, 1] }
                                    : { scale: 1 }
                                }
                                transition={{
                                  duration: 0.8,
                                  repeat: Infinity,
                                  repeatType: "mirror",
                                }}
                              >
                                <Flame
                                  className={cn(
                                    "h-5 w-5",
                                    heatLevel === 3
                                      ? "text-orange-500 drop-shadow-[0_0_3px_rgba(249,115,22,0.7)]"
                                      : "text-orange-400"
                                  )}
                                />
                                {heatLevel === 3 && (
                                  <motion.div
                                    className="ml-0.5"
                                    animate={{ y: [0, -1.5, 0] }}
                                    transition={{
                                      duration: 0.5,
                                      repeat: Infinity,
                                      repeatType: "mirror",
                                    }}
                                  >
                                    <Flame className="h-3.5 w-3.5 text-orange-400/90" />
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </div>
                          <CardDescription className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              <span>{formatDate(debate.createdAt)}</span>
                            </span>
                            {debate.category && (
                              <Badge
                                variant="outline"
                                className="px-1.5 py-0 text-[10px] font-normal border-border/50"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {debate.category.charAt(0).toUpperCase() +
                                  debate.category.slice(1)}
                              </Badge>
                            )}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow relative z-10 pt-2 pb-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              <span>Participants:</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {debate.debateMetadata.participants
                                .slice(0, 4)
                                .map((participant, index) => {
                                  const name = getParticipantName(participant);
                                  return (
                                    <motion.div
                                      key={`${name}-${index}`}
                                      title={name}
                                      className="flex items-center"
                                      initial={{ scale: 1, opacity: 0.8 }}
                                      animate={
                                        isHovered
                                          ? {
                                              scale: 1.05,
                                              opacity: 1,
                                              transition: {
                                                delay: 0.1 + index * 0.05,
                                              },
                                            }
                                          : { scale: 1, opacity: 0.8 }
                                      }
                                    >
                                      {participant.type === "model" ? (
                                        <span className="inline-block border border-border/30 rounded-full p-px bg-background/50 shadow-sm">
                                          <ModelLogo model={name} size={20} />
                                        </span>
                                      ) : (
                                        <Avatar className="h-5 w-5 border border-border/30 bg-background/50 shadow-sm">
                                          {participant.app?.logo ||
                                          participant.metadata?.logo ? (
                                            <AvatarImage
                                              src={
                                                participant.app?.logo ||
                                                participant.metadata?.logo ||
                                                ""
                                              }
                                              alt={name}
                                            />
                                          ) : null}
                                          <AvatarFallback className={`text-[9px] text-white font-medium ${getAvatarColor(name)}`}>
                                            {getInitials(name)}
                                          </AvatarFallback>
                                        </Avatar>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              {debate.debateMetadata.participants.length >
                                4 && (
                                <div className="text-[11px] text-muted-foreground self-center ml-1 bg-muted px-1.5 py-0.5 rounded-sm">
                                  +
                                  {debate.debateMetadata.participants.length -
                                    4}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="border-t border-border/10 pt-3 pb-3 relative z-10">
                          <div className="flex items-center justify-between w-full">
                            <Badge
                              variant={heatLevel >= 2 ? "secondary" : "outline"}
                              className={cn(
                                "text-xs px-2 py-0.5",
                                heatLevel === 3
                                  ? "bg-orange-500/10 border-orange-500/30 text-orange-600"
                                  : heatLevel === 2
                                  ? "bg-orange-400/10 border-orange-400/20 text-orange-500"
                                  : "border-border/30"
                              )}
                            >
                              <motion.div
                                className="flex items-center gap-1"
                                initial={{ scale: 1 }}
                                animate={
                                  isHovered ? { scale: [1, 1.05, 1] } : {}
                                }
                                transition={{ duration: 0.4 }}
                              >
                                <MessageCircle className="h-3 w-3" />
                                {debate.debateMetadata.participants.length +
                                  1}{" "}
                                voices
                              </motion.div>
                            </Badge>
                            <motion.span
                              className="text-xs text-primary font-medium flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              animate={isHovered ? { x: [0, 3, 0] } : { x: 0 }}
                              transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            >
                              View Debate
                              <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </motion.span>
                          </div>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {!isLoading && !error && debates.length === 0 && (
            <motion.div
              className="text-center p-12 border border-dashed border-border/30 rounded-lg mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-xl font-medium mb-2">The Arena is Quiet</h3>
              <p className="text-muted-foreground">
                No debates have been shared yet. Check back soon!
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
