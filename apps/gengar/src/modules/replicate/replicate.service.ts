import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Replicate from "replicate";

@Injectable()
export class ReplicateService {
  private replicateApiKey: string;
  private replicate: Replicate;
  constructor(private readonly configService: ConfigService) {
    this.replicateApiKey = this.configService.get<string>("replicate.apiKey");
    if (!this.replicateApiKey) {
      throw new Error("Replicate API key is not set");
    }
    this.replicate = new Replicate({
      auth: this.replicateApiKey,
    });
  }

  async generateImage(prompt: string) {
    const output = await this.replicate.run(
      "bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f",
      {
        input: {
          width: 1024,
          height: 1024,
          prompt,
          scheduler: "K_EULER",
          num_outputs: 1,
          guidance_scale: 0,
          negative_prompt: "worst quality, low quality",
          num_inference_steps: 4,
        },
      },
    );
    console.log(output);
  }
}
