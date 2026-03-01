import { CommandFactory } from "nest-commander";
import { ConsoleModule } from "./console.module";

async function bootstrap() {
  await CommandFactory.run(ConsoleModule, ["log", "warn", "error"]);
}

bootstrap();
