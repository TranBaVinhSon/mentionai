import { ApiResponseProperty } from "@nestjs/swagger";
import { App } from "src/db/entities/app.entity";

export class AppDto {
  @ApiResponseProperty({
    example: "perplexity",
  })
  name: string;

  @ApiResponseProperty({
    example: "perplexity",
  })
  displayName: string;

  @ApiResponseProperty({
    example: "https://example.com/logo.png",
  })
  logo: string;

  inputSchema: Record<string, any>;

  outputSchema: Record<string, any>;

  constructor(app: App) {
    this.name = app.name;
    this.logo = app.logo;
    this.displayName = app.displayName;
    this.inputSchema = app.inputSchema;
    this.outputSchema = app.outputSchema;
  }
}
