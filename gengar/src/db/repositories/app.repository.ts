import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { App } from "../entities/app.entity";

@Injectable()
export class AppRepository extends Repository<App> {
  constructor(private dataSource: DataSource) {
    super(App, dataSource.createEntityManager());
  }

  async findByName(name: string): Promise<App | null> {
    return this.findOne({
      where: { name },
    });
  }

  async findByUniqueId(uniqueId: string): Promise<App | null> {
    return this.findOne({
      where: { uniqueId },
    });
  }

  async findPublishedByName(name: string): Promise<App | null> {
    return this.findOne({
      where: {
        name,
        isPublished: true,
        isMe: true, // Only "me" apps can be published
      },
    });
  }

  async updateSearchVector(appId: number, content: string): Promise<void> {
    await this.query(`UPDATE apps SET "searchVector" = to_tsvector('simple', COALESCE($1, '')) WHERE id = $2`, [
      content,
      appId,
    ]);
  }
}
