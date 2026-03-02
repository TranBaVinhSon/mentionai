import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { MemoryService } from "../../../modules/memory/memory.service";
import { SocialCredential } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";

export abstract class BaseSnsService {
  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository?: SocialContentRepository,
    protected readonly memoryService?: MemoryService,
  ) {}

  // Abstract method to be implemented by each social service
  abstract syncContent(credential: SocialCredential, appId: number): Promise<void>;
}
