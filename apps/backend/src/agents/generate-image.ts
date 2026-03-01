import { ConfigService } from "@nestjs/config";
import { tool } from "ai";
import OpenAI from "openai";
import Replicate from "replicate";
import { S3HandlerService } from "src/modules/s3-handler/s3-handler.service";
import { z } from "zod";
import { randomUUID } from "crypto";
import { ModelTierLimits, User } from "src/db/entities/user.entity";
import { AVAILABLE_MODELS } from "src/config/constants";

const replicateApiKey = process.env.REPLICATE_API_TOKEN;
if (!replicateApiKey) {
  throw new Error("REPLICATE_API_TOKEN is not set in the environment variables");
}
const replicate = new Replicate({
  auth: replicateApiKey,
});

const configService = new ConfigService();
const s3HandlerService = new S3HandlerService(configService);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const modelStringToReplicateModel: Record<string, `${string}/${string}` | `${string}/${string}:${string}`> = {
  "sdxl-lightning-4step":
    "bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f",
  "stable-diffusion-3.5": "stability-ai/stable-diffusion-3.5-large",
  "flux-1.1-pro": "black-forest-labs/flux-1.1-pro",
  "sdxl-emoji": "fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e",
  "studio-ghibli": "karanchawla/studio-ghibli:fd1975a55465d2cf70e5e9aad03e0bb2b13b9f9b715d49a27748fc45797a6ae5",
  "sdxl-barbie": "fofr/sdxl-barbie:657c074cdd0e0098e39dae981194c4e852ad5bc88c7fbbeb0682afae714a6b0e",
  "animagine-xl-3.1": "cjwbw/animagine-xl-3.1:6afe2e6b27dad2d6f480b59195c221884b6acc589ff4d05ff0e5fc058690fbb9",
};

// Define the model type
export type ImageModel =
  | "sdxl-lightning-4step"
  | "stable-diffusion-3.5"
  | "flux-1.1-pro"
  | "dall-e-3"
  | "sdxl-emoji"
  | "studio-ghibli"
  | "sdxl-barbie"
  | "animagine-xl-3.1";

// TODO: Only generate 1 image for now
function createGenerateImageSchema(defaultModel: ImageModel) {
  return z.object({
    query: z.string().describe("The prompt to generate an image per model"),
    models: z
      .array(
        z.enum([
          "sdxl-lightning-4step",
          "stable-diffusion-3.5",
          "flux-1.1-pro",
          "dall-e-3",
          "sdxl-emoji",
          "studio-ghibli",
          "sdxl-barbie",
          "animagine-xl-3.1",
        ]),
      )
      .default([defaultModel])
      .describe(
        `An array of models to use for generating images. If not provided, defaults to ["${defaultModel}"].
        Available models:
        - sdxl-lightning-4step: Fast SDXL model
        - stable-diffusion-3.5: Latest Stable Diffusion model
        - flux-1.1-pro: High-quality image generation
        - dall-e-3: OpenAI's DALL-E 3 model
        - sdxl-emoji: Emoji-style images
        - studio-ghibli: Japanese anime style inspired by Studio Ghibli
        - sdxl-barbie: Barbie-style images
        - animagine-xl-3.1: Anime-style images
        Multiple models can be specified, e.g., ["dall-e-3", "flux-pro"]`,
      ),
  });
}

export function generateImageAgent(
  response: {
    value: string;
    toolResults: any[];
    models: string[];
  },
  user: User,
) {
  const defaultModel = AVAILABLE_MODELS.find((model) => model.id === user.defaultImageModelId).name as ImageModel;

  return (tool as any)({
    description: "Generate image based on user's prompt",
    inputSchema: createGenerateImageSchema(defaultModel),
    execute: async (params: any) => {
      const { query, models } = params;
      console.log(`Generating image with models: ${models} with query: ${query}`);

      if (user?.modelUsage?.imageGenerationCount >= ModelTierLimits.imageGeneration) {
        response.value =
          "Monthly limit for image/video generation exceeded. Limit resets at the beginning of each month.";
        response.toolResults.push({
          imageUrl: "Monthly limit for image/video generation exceeded. Limit resets at the beginning of each month.",
        });
        return ["Monthly limit for image/video generation exceeded. Limit resets at the beginning of each month."];
      }

      const imageUrls = await Promise.all(
        models.map(async (model) => {
          let result: string;

          if (model === "dall-e-3") {
            result = await generateImageByDalle3(query);
          } else if (model === "sdxl-emoji") {
            result = await generateEmoji(query);
          } else if (model === "studio-ghibli") {
            result = await generateStudioGhibli(query);
          } else if (model === "sdxl-barbie") {
            result = await generateBarbie(query);
          } else if (model === "animagine-xl-3.1") {
            result = await generateAnime(query);
          } else {
            result = await generateImageByReplicate(model, query);
          }
          console.log("generateImageAgent result", result);

          // Download the image file
          const downloadedFile = await fetch(result);
          if (!downloadedFile.ok) {
            throw new Error(`Failed to download image: ${downloadedFile.statusText}`);
          }
          const imageBuffer = await downloadedFile.arrayBuffer();

          // Determine file extension based on content type
          const contentType = downloadedFile.headers.get("content-type");
          let fileExtension = "png"; // Default to png
          if (contentType) {
            if (contentType.includes("webp")) {
              fileExtension = "webp";
            } else if (contentType.includes("jpeg") || contentType.includes("jpg")) {
              fileExtension = "jpg";
            }
          }

          // Upload image to S3
          const key = `${user.id}/${randomUUID()}.${fileExtension}`;
          console.log("key", key);
          await s3HandlerService.uploadFile(Buffer.from(imageBuffer), contentType, key);
          const imageUrl = await s3HandlerService.generateSignedUrl(key);
          console.log("imageUrl", imageUrl);

          response.toolResults.push({
            imageUrl: imageUrl,
            model: model,
          });
          // response.value = imageUrl;
          response.models.push(model);

          return imageUrl;
        }),
      );

      return imageUrls;
    },
  });
}

async function generateImageByReplicate(model: string, prompt: string): Promise<string> {
  const replicateModel = modelStringToReplicateModel[model];
  if (!replicateModel) {
    throw new Error(`Replicate model for ${model} not found`);
  }

  let inputReplicateModel = {};

  // Return an array of images
  if (model === "sdxl-lightning-4step") {
    inputReplicateModel = {
      width: 1024,
      height: 1024,
      prompt,
      scheduler: "K_EULER",
      num_outputs: 1,
      guidance_scale: 0,
    };
    //
  } else if (model === "stable-diffusion-3.5") {
    inputReplicateModel = {
      cfg: 3.5,
      steps: 28,
      prompt,
      aspect_ratio: "1:1",
      output_format: "webp",
      output_quality: 90,
      negative_prompt: "",
      prompt_strength: 0.9,
    };
    // Return only one image
  } else if (model === "flux-1.1-pro") {
    inputReplicateModel = {
      prompt,
      width: 1024,
      height: 1024,
      step: 20,
    };
  }
  const output = await replicate.run(replicateModel, {
    input: inputReplicateModel,
  });
  console.log(output);

  if (Array.isArray(output)) {
    return output[0] as string;
  }

  return output as unknown as string;
}

async function generateImageByDalle3(prompt: string): Promise<any> {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
  });
  return response.data[0].url;
}

async function generateEmoji(prompt: string): Promise<any> {
  const output = await replicate.run(
    "fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e",
    {
      input: {
        width: 1024,
        height: 1024,
        prompt,
        refine: "no_refiner",
        scheduler: "K_EULER",
        lora_scale: 0.6,
        num_outputs: 1,
        guidance_scale: 7.5,
        apply_watermark: false,
        high_noise_frac: 0.8,
        negative_prompt: "",
        prompt_strength: 0.8,
        num_inference_steps: 50,
      },
    },
  );

  if (Array.isArray(output)) {
    return output[0] as string;
  }

  return output as unknown as string;
}

async function generateStudioGhibli(prompt: string): Promise<any> {
  const output = await replicate.run(
    "karanchawla/studio-ghibli:fd1975a55465d2cf70e5e9aad03e0bb2b13b9f9b715d49a27748fc45797a6ae5",
    {
      input: {
        width: 1024,
        height: 1024,
        prompt,
        refine: "no_refiner",
        scheduler: "K_EULER",
        lora_scale: 0.6,
        num_outputs: 1,
        guidance_scale: 7.5,
        apply_watermark: true,
        high_noise_frac: 0.8,
        negative_prompt: "",
        prompt_strength: 0.8,
        num_inference_steps: 50,
      },
    },
  );
  if (Array.isArray(output)) {
    return output[0] as string;
  }

  return output as unknown as string;
}

async function generateBarbie(prompt: string): Promise<any> {
  const output = await replicate.run(
    "fofr/sdxl-barbie:657c074cdd0e0098e39dae981194c4e852ad5bc88c7fbbeb0682afae714a6b0e",
    {
      input: {
        width: 1024,
        height: 1024,
        prompt,
        refine: "no_refiner",
        scheduler: "K_EULER",
        lora_scale: 0.6,
        num_outputs: 1,
        guidance_scale: 7.5,
        apply_watermark: true,
        high_noise_frac: 0.8,
        negative_prompt: "underexposed",
        prompt_strength: 0.8,
        num_inference_steps: 50,
      },
    },
  );
  if (Array.isArray(output)) {
    return output[0] as string;
  }

  return output as unknown as string;
}

async function generateAnime(prompt: string): Promise<any> {
  const output = await replicate.run(
    "cjwbw/animagine-xl-3.1:6afe2e6b27dad2d6f480b59195c221884b6acc589ff4d05ff0e5fc058690fbb9",
    {
      input: {
        width: 1024,
        height: 1024,
        prompt,
        guidance_scale: 7,
        style_selector: "(None)",
        negative_prompt:
          "nsfw, lowres, (bad), text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, oldest, early, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]",
        quality_selector: "Standard v3.1",
        num_inference_steps: 28,
      },
    },
  );
  if (Array.isArray(output)) {
    return output[0] as string;
  }

  return output as unknown as string;
}
