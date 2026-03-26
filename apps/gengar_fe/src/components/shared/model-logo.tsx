import Image from "next/image";
import { ClaudeIcon } from "../icons/claude";
import { LLamaIcon } from "../icons/llama";
import { StableDiffusionIcon } from "../icons/stable";
import { PerplexityLogo } from "../icons/perplexity";
import { GoogleIcon } from "../icons/google";
import { TwitterXIcon } from "../icons/twitter-x";
import { NvidiaIcon } from "../icons/nvidia";
import { DeepSeekIcon } from "../icons/deepseek";
import { OpenAILogo } from "../icons/openai";

export default function ModelLogo({
  model = "",
  size = 16,
}: {
  model: string;
  size: number;
}) {
  // Return null if no model is provided
  if (!model || model.trim() === "") {
    return null;
  }

  model = model.toLowerCase();
  if (model.includes("claude")) {
    return <ClaudeIcon size={size} />;
  }

  if (model.includes("llama")) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-sm"
      >
        <LLamaIcon size={size} />
      </div>
    );
  }

  if (model.includes("stable-diffusion")) {
    return <StableDiffusionIcon size={size} />;
  }

  if (model.includes("gemini")) {
    return <GoogleIcon size={size} />;
  }

  if (model.includes("gpt") || model.includes("o1") || model.includes("o3")) {
    return <OpenAILogo size={size} />;
  }

  if (model.includes("perplexity")) {
    return <PerplexityLogo size={size} />;
  }

  if (model.includes("grok")) {
    return <TwitterXIcon size={size} />;
  }

  if (model.includes("nvidia")) {
    return <NvidiaIcon size={size} />;
  }

  if (model.includes("deepseek")) {
    return <DeepSeekIcon size={size} />;
  }

  if (model.includes("dall-e")) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-sm"
      >
        <OpenAILogo size={size} />
      </div>
    );
  }

  // Return null instead of default Logo when no model matches
  return null;
}
