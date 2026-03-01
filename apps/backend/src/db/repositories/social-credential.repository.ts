import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialCredential, SocialNetworkType } from "../entities/social-credential.entity";

@Injectable()
export class SocialCredentialsRepository {
  constructor(
    @InjectRepository(SocialCredential)
    private socialCredentialsRepository: Repository<SocialCredential>,
  ) {}

  async findByUserAndType(userId: number, type: SocialNetworkType): Promise<SocialCredential> {
    return this.socialCredentialsRepository.findOne({
      where: {
        userId,
        type,
      },
    });
  }

  async findByAppAndType(appId: number, type: SocialNetworkType): Promise<SocialCredential> {
    return this.socialCredentialsRepository.findOne({
      where: {
        appId,
        type,
      },
    });
  }

  async save(socialCredentials: SocialCredential): Promise<SocialCredential> {
    return this.socialCredentialsRepository.save(socialCredentials);
  }

  async update(id: number, data: Partial<SocialCredential>): Promise<void> {
    await this.socialCredentialsRepository.update(id, data);
  }

  async findOne(options): Promise<SocialCredential> {
    return this.socialCredentialsRepository.findOne(options);
  }

  async findByAppId(appId: number): Promise<SocialCredential[]> {
    return this.socialCredentialsRepository.find({
      where: { appId },
      select: ["id", "type", "username", "createdAt"],
    });
  }

  async find(options): Promise<SocialCredential[]> {
    return this.socialCredentialsRepository.find(options);
  }
}
