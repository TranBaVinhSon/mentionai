"use client";

import { cn } from "@/lib/utils";
import {
  MessageSquare as AiChat02Icon,
  Globe as BrowserIcon,
  Globe as AiBrowserIcon,
  Sparkles as AiBeautifyIcon,
  Image as AiImageIcon,
  Plane as AirplaneTakeOff01Icon,
  Code as AiProgrammingIcon,
  TrendingUp as LookTopIcon,
  Radio as TransmissionIcon,
  RotateCcw as RefreshIcon,
  Video as AiVideoIcon,
  Users as UserGroupIcon,
  GraduationCap as TeacherIcon,
} from "lucide-react";
import { memo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useUser } from "@/hooks/use-user";
import { GengarSubscriptionPlan } from "@/services/api";
import { EventTypes } from "@/services/event-emitter";
import { emitter } from "@/services/event-emitter";
import { setSignInDialog } from "@/store/app";
import { useRouter } from "next/navigation";
import { useOfficialApps } from "@/hooks/use-official-apps";
import ModelLogo from "@/components/shared/model-logo";
import Image from "next/image";

const defaultExamples = [
  {
    id: 1,
    title: "multi text models",
    icon: AiChat02Icon,
    description:
      "@gpt-4o @claude-3-5-sonnet Writing a LinkedIn post to introduce an innovative multimodal AI service",
    mobileDescription: "@gpt-4o @claude Write LinkedIn post",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 2,
    title: "web search",
    icon: BrowserIcon,
    description: "The latest news about AI in US",
    mobileDescription: "AI news in US",
    isLoginRequired: false,
    isProModel: true,
  },
  {
    id: 3,
    title: "web reader",
    icon: AiBrowserIcon,
    description: "Summary: https://arxiv.org/pdf/1706.03762",
    mobileDescription: "Summarize arxiv paper",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 4,
    title: "hybrid models",
    icon: AiBeautifyIcon,
    description:
      "Using @sdxl-lightning-4step to generate an image of Japan in autumn, and using @claude-3-5-sonnet to write a post about traveling to Japan in autumn for first-time travelers.",
    mobileDescription: "@sdxl @claude Japan travel content",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 5,
    title: "image generation",
    icon: AiImageIcon,
    description: "Using @flux-pro to generate an image of a cat",
    mobileDescription: "@flux-pro cat image",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 6,
    title: "travel planning",
    icon: AirplaneTakeOff01Icon,
    description: "Make a plan for a trip to Germany in autumn",
    mobileDescription: "Trip to Germany",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 7,
    title: "programming",
    icon: AiProgrammingIcon,
    description: "Build a simple chatbot next.js and tailwind css",
    mobileDescription: "Build chatbot with Next.js",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 8,
    title: "multi image generation models",
    icon: AiImageIcon,
    description:
      "Using @dall-e-3 and @stable-diffusion-3 to generate an image of a cat",
    mobileDescription: "@dall-e-3 @sd3 cat image",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 9,
    title: "generate emoji",
    icon: LookTopIcon,
    description: "@sdxl-emoji generate an emoji of a samurai",
    mobileDescription: "@sdxl-emoji samurai",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 10,
    title: "generate ghibli-style image",
    icon: TransmissionIcon,
    description:
      "@studio-ghibli generate image of a family in paris in ghibli style",
    mobileDescription: "@ghibli family in Paris",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 11,
    title: "generate a gif",
    icon: AiImageIcon,
    description: "generate a gif of a cat playing with a ball",
    mobileDescription: "Cat playing gif",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 12,
    title: "generate a short video",
    icon: AiVideoIcon,
    description:
      "generate a short video of a girl walking under falling cherry blossoms during hanami",
    mobileDescription: "Cherry blossom video",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 13,
    title: "career advice",
    icon: TeacherIcon,
    description: "How to get promoted to the Senior Engineer",
    mobileDescription: "Senior Engineer promotion",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 14,
    title: "life advice",
    icon: UserGroupIcon,
    description: "Prepare for the first-time dad",
    mobileDescription: "First-time dad tips",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 15,
    title: "study plan",
    icon: TeacherIcon,
    description:
      "Create a 3-month study plan for machine learning fundamentals",
    mobileDescription: "Study ML basics",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 16,
    title: "business idea",
    icon: UserGroupIcon,
    description:
      "Generate innovative SaaS business ideas for the education sector",
    mobileDescription: "SaaS ideas for education",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 17,
    title: "content creation",
    icon: AiChat02Icon,
    description:
      "@gpt-4o Create a week's worth of engaging social media content for a tech startup",
    mobileDescription: "@gpt-4o Tech startup content",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 18,
    title: "recipe generator",
    icon: AiChat02Icon,
    description: "Create a healthy meal plan for a vegetarian athlete",
    mobileDescription: "Vegetarian athlete meals",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 19,
    title: "art style fusion",
    icon: AiImageIcon,
    description:
      "@flux-pro Generate an image combining cyberpunk and art nouveau styles",
    mobileDescription: "@flux-pro Cyberpunk art",
    isLoginRequired: true,
    isProModel: true,
  },
  {
    id: 20,
    title: "travel planner",
    icon: UserGroupIcon,
    description: "Create a 5-day itinerary for a budget trip to Tokyo",
    mobileDescription: "5-day Tokyo trip",
    isLoginRequired: false,
    isProModel: false,
  },
  {
    id: 21,
    title: "tech titans debate",
    icon: UserGroupIcon,
    description:
      "@elon-musk @steve-jobs Should technology companies prioritize short-term profits or long-term innovation?",
    mobileDescription: "@elon @jobs Profits vs innovation?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 22,
    title: "scientific debate",
    icon: UserGroupIcon,
    description: "@nikola-tesla @einstein Debate the merits of AC vs DC power.",
    mobileDescription: "@tesla @einstein AC vs DC",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 23,
    title: "philosophical debate",
    icon: UserGroupIcon,
    description: "@socrates @aristotle Debate the best form of government.",
    mobileDescription: "@socrates @aristotle Best government",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 24,
    title: "women in stem discussion",
    icon: UserGroupIcon,
    description:
      "@marie-curie @ada-lovelace Discuss the challenges and triumphs for women in STEM historically.",
    mobileDescription: "@curie @ada Women in STEM",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 25,
    title: "art & science discussion",
    icon: UserGroupIcon,
    description:
      "@leonardo-da-vinci @isaac-newton Discuss the relationship between art and science.",
    mobileDescription: "@leonardo @newton Art & science",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 26,
    title: "cosmic discussion",
    icon: UserGroupIcon,
    description:
      "@carl-sagan @stephen-hawking Discuss the possibility of extraterrestrial life.",
    mobileDescription: "@sagan @hawking Alien life?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 27,
    title: "wisdom discussion",
    icon: UserGroupIcon,
    description:
      "@gandalf @master-yoda Share wisdom on the nature of good and evil.",
    mobileDescription: "@gandalf @yoda Good vs evil",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 28,
    title: "detective adventure",
    icon: UserGroupIcon,
    description:
      "@sherlock-holmes @indiana-jones Investigate the disappearance of a rare artifact from the British Museum.",
    mobileDescription: "@sherlock @jones Missing artifact",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "roleplay",
  },
  {
    id: 29,
    title: "sci-fi negotiation",
    icon: UserGroupIcon,
    description:
      "@captain-picard @darth-vader Negotiate a truce between the Federation and the Empire.",
    mobileDescription: "@picard @vader Federation truce",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "roleplay",
  },
  {
    id: 30,
    title: "anime training",
    icon: UserGroupIcon,
    description:
      "@goku @naruto-uzumaki Train together to face a new powerful enemy.",
    mobileDescription: "@goku @naruto Train together",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "roleplay",
  },
  {
    id: 31,
    title: "royal discussion",
    icon: UserGroupIcon,
    description:
      "@cleopatra @marie-antoinette Discuss the pressures and politics of being a powerful queen.",
    mobileDescription: "@cleopatra @antoinette Royal politics",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "roleplay",
  },
  {
    id: 32,
    title: "historical figures debate",
    icon: UserGroupIcon,
    description:
      "@shakespeare @jane-austen Debate the evolution of literature.",
    mobileDescription: "@shakespeare @austen Literature",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 33,
    title: "future of AI discussion",
    icon: UserGroupIcon,
    description:
      "@gpt-4o-mini @claude-3-5-haiku Discuss the potential impact of large language models on creative industries in the next 5 years.",
    mobileDescription: "@gpt-mini @claude Impact of LLMs",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 34,
    title: "simple explanation discussion",
    icon: UserGroupIcon,
    description:
      "@gpt-4o-mini @llama-3.1-70b-versatile Discuss the best way to explain the concept of quantum computing to a high school student.",
    mobileDescription: "@gpt @llama Explain quantum",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 35,
    title: "Mars vs Earth debate",
    icon: UserGroupIcon,
    description:
      "@elon-musk @marie-curie @captain-picard Should humanity pour its resources into colonising Mars or fixing Earth first?",
    mobileDescription: "@elon @curie Mars vs Earth?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 36,
    title: "AI existential debate",
    icon: UserGroupIcon,
    description:
      "@stephen-hawking @ada-lovelace @darth-vader Is artificial super‑intelligence humanity's next evolutionary leap or an existential threat?",
    mobileDescription: "@hawking @ada AI threat?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 37,
    title: "nuclear fusion discussion",
    icon: UserGroupIcon,
    description:
      "@nikola-tesla @einstein @sailor-moon Can limitless clean nuclear fusion solve global inequality—or just create new power imbalances?",
    mobileDescription: "@tesla @einstein Fusion power",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 38,
    title: "AI art rights debate",
    icon: UserGroupIcon,
    description:
      "@leonardo-da-vinci @steve-jobs @jane-austen Should artists own perpetual rights to AI‑generated works inspired by their style?",
    mobileDescription: "@leonardo @jobs AI art rights?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 39,
    title: "UBI debate",
    icon: UserGroupIcon,
    description:
      "@carl-sagan @aristotle @elon-musk Universal Basic Income: liberating creativity or dulling ambition?",
    mobileDescription: "@sagan @aristotle UBI pros/cons",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 40,
    title: "gene-editing ethics debate",
    icon: UserGroupIcon,
    description:
      "@marie-curie @sigmund-freud @gandalf Is gene‑editing (CRISPR babies) ethical if it eliminates disease but enhances traits?",
    mobileDescription: "@curie @freud Gene editing?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 41,
    title: "non-violent resistance debate",
    icon: UserGroupIcon,
    description:
      "@mahatma-gandhi @darth-vader @sherlock-holmes Can non‑violent resistance still succeed in a hyper‑polarised digital age?",
    mobileDescription: "@gandhi @vader Non-violence today?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 42,
    title: "open-source AI debate",
    icon: UserGroupIcon,
    description:
      "@ada-lovelace @steve-jobs @confucius Should governments mandate open‑source AI models for transparency?",
    mobileDescription: "@ada @jobs Open-source AI?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 43,
    title: "revolutionary ethics debate",
    icon: UserGroupIcon,
    description:
      "@alexander-the-great @cleopatra @naruto-uzumaki Do the ends ever justify the means in revolutionary movements?",
    mobileDescription: "@alexander @cleo Ends vs means?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 44,
    title: "mind-uploading debate",
    icon: UserGroupIcon,
    description:
      "@stephen-hawking @master-yoda @elon-musk Immortality via mind‑uploading: paradise, prison, or privilege for the rich?",
    mobileDescription: "@hawking @yoda Mind uploading?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 45,
    title: "time-travel discussion",
    icon: UserGroupIcon,
    description:
      "@indiana-jones @sherlock-holmes @sailor-moon Time‑travel tourism: preserve history or risk paradoxes?",
    mobileDescription: "@jones @sherlock Time travel?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 46,
    title: "space exploration debate",
    icon: UserGroupIcon,
    description:
      "@elon-musk @captain-picard @carl-sagan Should space exploration be led by private companies or international coalitions?",
    mobileDescription: "@elon @picard Space ownership?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 47,
    title: "free will vs destiny debate",
    icon: UserGroupIcon,
    description:
      "@socrates @gandalf @albert-einstein Does free will exist, or is destiny written?",
    mobileDescription: "@socrates @gandalf Free will?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 48,
    title: "AI moderation debate",
    icon: UserGroupIcon,
    description:
      "@steve-jobs @confucius @sherlock-holmes Can AI moderators protect free speech without silencing diversity of thought?",
    mobileDescription: "@jobs @confucius AI moderation?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 49,
    title: "surveillance ethics debate",
    icon: UserGroupIcon,
    description:
      "@florence-nightingale @darth-vader @aristotle Is surveillance for public health (pandemics) a justified trade‑off against privacy?",
    mobileDescription: "@florence @vader Health surveillance?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 50,
    title: "historical reparations debate",
    icon: UserGroupIcon,
    description:
      "@cleopatra @mahatma-gandhi @richard-feynman Reparations for historical injustices: moral imperative or unworkable policy?",
    mobileDescription: "@cleo @gandhi Reparations debate?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 51,
    title: "terraforming ethics debate",
    icon: UserGroupIcon,
    description:
      "@nikola-tesla @carl-sagan @gandalf Should we terraform other planets even if it destroys potential native life?",
    mobileDescription: "@tesla @sagan Terraform planets?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 52,
    title: "quantum encryption debate",
    icon: UserGroupIcon,
    description:
      "@ada-lovelace @richard-feynman @sherlock-holmes Will quantum computing break all current encryption—should we pre‑emptively move to post‑quantum standards now?",
    mobileDescription: "@ada @feynman Quantum encryption?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 53,
    title: "pop-culture education debate",
    icon: UserGroupIcon,
    description:
      "@sailor-moon @naruto-uzumaki @aristotle Is pop‑culture powered education (anime, games) dumbing down or democratizing learning?",
    mobileDescription: "@moon @naruto Pop education?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 54,
    title: "altruism philosophy debate",
    icon: UserGroupIcon,
    description:
      "@sigmund-freud @socrates @master-yoda Can true altruism exist, or is every action ultimately self‑interested?",
    mobileDescription: "@freud @socrates True altruism?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 55,
    title: "AI consciousness debate",
    icon: UserGroupIcon,
    description:
      "@gpt-4.1 @claude-3-7-sonnet Could an AI ever truly become conscious, and if so, what rights should it have?",
    mobileDescription: "@gpt @claude AI consciousness?",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 56,
    title: "future transportation discussion",
    icon: UserGroupIcon,
    description:
      "@gpt-4o @deepseek-v3 How will transportation systems evolve in the next 30 years?",
    mobileDescription: "@gpt @deepseek Future transport?",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 57,
    title: "metaverse ethics debate",
    icon: UserGroupIcon,
    description:
      "@claude-3-7-sonnet @gpt-4.1 Is living primarily in the metaverse a valid lifestyle choice or a form of escapism?",
    mobileDescription: "@claude @gpt Metaverse life?",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 58,
    title: "language evolution discussion",
    icon: UserGroupIcon,
    description:
      "@gpt-4o-mini @llama-3.1-70b-versatile How will language and communication change with advanced AI translation?",
    mobileDescription: "@gpt @llama AI translation?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 59,
    title: "religion in schools debate",
    icon: UserGroupIcon,
    description:
      "@claude-3-7-sonnet @gpt-4.1 Should religious education be mandatory, optional, or prohibited in public schools?",
    mobileDescription: "@claude @gpt Religious ed?",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 60,
    title: "creative writing exploration",
    icon: UserGroupIcon,
    description:
      "@claude-3-5-sonnet @gpt-4o Create a story where AI and humans collaborate to solve a climate crisis.",
    mobileDescription: "@claude @gpt Climate story",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 61,
    title: "digital privacy debate",
    icon: UserGroupIcon,
    description:
      "@gemini-1.5-pro @claude-3-5-sonnet Is privacy a fundamental right or outdated in the age of AI and surveillance?",
    mobileDescription: "@gemini @claude Privacy rights?",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 62,
    title: "human augmentation debate",
    icon: UserGroupIcon,
    description:
      "@gpt-4o @claude-3-7-sonnet Would widespread neural implants lead to greater equality or create a permanent cognitive elite?",
    mobileDescription: "@gpt @claude Neural implants?",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "debate",
  },
  {
    id: 63,
    title: "future cuisine discussion",
    icon: UserGroupIcon,
    description:
      "@claude-3-haiku @gpt-4o-mini How might food production and cuisine evolve over the next 50 years?",
    mobileDescription: "@haiku @gpt Future cuisine?",
    isLoginRequired: true,
    isProModel: false,
    isMultiAI: true,
    category: "discussion",
  },
  {
    id: 64,
    title: "musical innovation discussion",
    icon: UserGroupIcon,
    description:
      "@gpt-4.1-mini @claude-3-5-sonnet Explore how technology is transforming music creation and distribution.",
    mobileDescription: "@gpt @claude Tech in music",
    isLoginRequired: true,
    isProModel: true,
    isMultiAI: true,
    category: "discussion",
  },
];

const titleDecoration = [
  "text-info underline decoration-info underline-offset-4 decoration-wavy",
  "text-destructive underline decoration-destructive underline-offset-4 decoration-wavy",
  "text-primary underline decoration-primary underline-offset-4 decoration-wavy",
  "text-success underline decoration-success underline-offset-4 decoration-wavy",
  "text-warning underline decoration-warning underline-offset-4 decoration-wavy",
];

function randomNoRepeats<T>(array: T[]) {
  let copy = [...array];

  return function () {
    if (copy.length === 0) {
      copy = [...array];
    }
    const randomIndex = Math.floor(Math.random() * copy.length);
    const item = copy[randomIndex];
    copy.splice(randomIndex, 1);
    return item;
  };
}

// Get 4 random examples every day, prioritizing multi-AI examples
function shuffleExamples(): typeof defaultExamples {
  const maxExamples = 6;
  // Get multi-AI examples
  const multiAIExamples = defaultExamples.filter((ex) => ex.isMultiAI);
  const regularExamples = defaultExamples.filter((ex) => !ex.isMultiAI);

  // Make sure we get different types of multi-AI examples when possible
  const categories = ["debate", "discussion", "roleplay"];
  const selectedMultiAI: typeof defaultExamples = [];

  // Try to select one example from each category if available
  for (const category of categories) {
    const categoryExamples = multiAIExamples.filter(
      (ex) => ex.category === category
    );
    if (categoryExamples.length > 0) {
      selectedMultiAI.push(
        categoryExamples[Math.floor(Math.random() * categoryExamples.length)]
      );
      if (selectedMultiAI.length >= 3) break; // Get at most 2 multi-AI examples
    }
  }

  // If we couldn't get 2 examples from different categories, just get random multi-AI examples
  while (selectedMultiAI.length < 3 && multiAIExamples.length > 0) {
    selectedMultiAI.push(
      multiAIExamples[Math.floor(Math.random() * multiAIExamples.length)]
    );
  }

  // Get remaining examples from regular pool
  const randomRegular = randomNoRepeats(regularExamples);
  const remainingExamples = Array.from({
    length: maxExamples - selectedMultiAI.length,
  }).map(() => randomRegular());

  return [...selectedMultiAI, ...remainingExamples];
}

interface ExamplesProps {
  onExampleClick?: (description: string) => void;
}

export const Examples = memo(({ onExampleClick }: ExamplesProps) => {
  const [examples, setExamples] = useState<typeof defaultExamples>([]);
  const { data: user } = useUser();
  const router = useRouter();
  const { apps } = useOfficialApps();

  useEffect(() => {
    setExamples(shuffleExamples());
  }, []);

  // Function to render description with model logos
  const renderDescriptionWithLogos = (description: string) => {
    if (!description.includes("@")) return description;

    // Split by @ and process each part
    const parts = description.split("@");
    return (
      <>
        {parts[0]}
        {parts.slice(1).map((part, index) => {
          // Extract model name (text until space or end)
          const modelNameEnd = part.search(/\s/);
          const modelName =
            modelNameEnd > -1 ? part.slice(0, modelNameEnd) : part;
          const restOfPart = modelNameEnd > -1 ? part.slice(modelNameEnd) : "";

          // Check if this is an official app
          const officialApp = apps?.find(
            (app) =>
              app.name?.toLowerCase() === modelName.toLowerCase() ||
              app.uniqueId?.toLowerCase() === modelName.toLowerCase()
          );

          return (
            <span key={index}>
              <span className="inline-flex items-center bg-orange-100 dark:bg-orange-950/30 rounded-md px-1 mr-0.5">
                <span className="text-orange-800 dark:text-orange-300">
                  @{modelName}
                </span>
                <span className="ml-1 flex items-center justify-center">
                  {officialApp?.logo ? (
                    <Image
                      src={officialApp.logo}
                      alt={officialApp.displayName || modelName}
                      width={16}
                      height={16}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <ModelLogo model={modelName} size={16} />
                  )}
                </span>
              </span>
              {restOfPart}
            </span>
          );
        })}
      </>
    );
  };

  // if (examples.length === 0) {
  //   return (
  //     <div className="pt-4 md:pt-12 pb-8">
  //       <div className="flex items-center justify-between mb-4 text-foreground/60 text-sm">
  //         <h2 className="">~ / or try these example prompts 👇</h2>

  //         <button
  //           onClick={() => {
  //             setExamples(shuffleExamples());
  //           }}
  //           className="flex items-center justify-center"
  //         >
  //           <RefreshIcon size={16} className="mr-2" />
  //           <span className="">Refresh prompts</span>
  //         </button>
  //       </div>
  //       <div className="w-full flex items-center justify-center">
  //         <Spinner />
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="pt-2 md:pt-8 pb-6 md:pb-24">
      <div className="flex items-center justify-between mb-2 md:mb-4 text-foreground/60 text-sm md:text-sm px-2 md:px-0">
        <h2 className="">~ / or try these example prompts 👇</h2>

        <Button
          onClick={() => {
            setExamples(shuffleExamples());
          }}
          variant="ghost"
          size="sm"
          className="text-foreground/60 h-auto p-1 hidden md:flex"
        >
          <RefreshIcon size={16} className="mr-2" />
          <span className="text-sm">Refresh prompts</span>
        </Button>
      </div>

      {/* Mobile carousel */}
      <div className="md:hidden w-full px-6 max-w-[100vw] m-auto md:px-2">
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full overflow-visible"
        >
          <CarouselContent className="-ml-2 md:-ml-4 overflow-visible">
            {examples.map(({ icon: Icon, ...example }, index) => (
              <CarouselItem
                key={`mobile_${example.id}_${index}`}
                className="pl-2 basis-1/2 overflow-visible"
              >
                <Card
                  onClick={() => {
                    if (
                      user?.subscriptionPlan === GengarSubscriptionPlan.PLUS
                    ) {
                      emitter.emit(
                        EventTypes.SET_EDITOR_CONTENT,
                        example.description
                      );
                      onExampleClick?.(example.description);
                    } else {
                      if (!user && example.isLoginRequired) {
                        setSignInDialog(true);
                        return;
                      }
                      if (
                        user &&
                        example.isProModel &&
                        // @ts-ignore
                        user.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                      ) {
                        router.push("/pricing");
                        return;
                      }
                      emitter.emit(
                        EventTypes.SET_EDITOR_CONTENT,
                        example.description
                      );
                      onExampleClick?.(example.description);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col relative overflow-visible h-full"
                  )}
                >
                  <CardContent className="px-3 py-3 flex flex-col h-full">
                    {example.isMultiAI && (
                      <div className="absolute top-0 md:-top-2 right-0 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium z-10">
                        {example.category === "debate"
                          ? "Debate"
                          : example.category === "discussion"
                          ? "Discussion"
                          : example.category === "roleplay"
                          ? "Roleplay"
                          : "Multi-AI"}
                      </div>
                    )}
                    <p className="flex-1 text-sm mb-3 leading-6">
                      {renderDescriptionWithLogos(example.description)}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center space-x-1 max-w-[calc(100%-30px)]">
                        <Icon
                          size={16}
                          className={
                            example.isMultiAI
                              ? "text-primary"
                              : titleDecoration[
                                  index % titleDecoration.length
                                ].split(" ")[0]
                          }
                        />
                        <div
                          className={cn("text-xs truncate text-foreground/60")}
                        >
                          {example.title}
                        </div>
                      </div>

                      {example.isProModel && (
                        <span className="bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs px-1.5 h-4">
                          Plus
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid mb-6 grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
        {examples.map(({ icon: Icon, ...example }, index) => (
          <div className="group" key={`${example.id}_${index}`}>
            <Card
              onClick={() => {
                if (user?.subscriptionPlan === GengarSubscriptionPlan.PLUS) {
                  emitter.emit(
                    EventTypes.SET_EDITOR_CONTENT,
                    example.description
                  );
                  onExampleClick?.(example.description);
                } else {
                  if (!user && example.isLoginRequired) {
                    setSignInDialog(true);
                    return;
                  }
                  if (
                    user &&
                    example.isProModel &&
                    // @ts-ignore
                    user.subscriptionPlan !== GengarSubscriptionPlan.PLUS
                  ) {
                    router.push("/pricing");
                    return;
                  }
                  emitter.emit(
                    EventTypes.SET_EDITOR_CONTENT,
                    example.description
                  );
                  onExampleClick?.(example.description);
                }
              }}
              className={cn("flex cursor-pointer h-full flex-col relative")}
            >
              <CardContent className="px-3 py-3 flex flex-col h-full">
                {example.isMultiAI && (
                  <div className="absolute -top-5 md:-top-2 right-0 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium z-10">
                    {example.category === "debate"
                      ? "Debate"
                      : example.category === "discussion"
                      ? "Discussion"
                      : example.category === "roleplay"
                      ? "Roleplay"
                      : "Multi-AI"}
                  </div>
                )}
                <p className="flex-1 text-sm mb-4 leading-6">
                  {renderDescriptionWithLogos(example.description)}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center space-x-2 max-w-[calc(100%-30px)]">
                    <Icon
                      size={20}
                      className={
                        example.isMultiAI
                          ? "text-primary underline decoration-primary underline-offset-4 decoration-wavy"
                          : titleDecoration[index % titleDecoration.length]
                      }
                    />
                    <div className={cn("text-xs truncate text-foreground/60")}>
                      {example.title}
                    </div>
                  </div>

                  {example.isProModel && (
                    <span className="bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-[10px] px-1 h-4">
                      Plus
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
});
