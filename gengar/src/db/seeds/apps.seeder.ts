import { readFile } from "node:fs/promises";
import { inspect } from "node:util";
import { Seeder } from "@jorgebodega/typeorm-seeding";
import { plainToInstance } from "class-transformer";
import { DataSource } from "typeorm";
import { App } from "../entities/app.entity";
import { apps } from "./data/apps";

export default class AppSeeder extends Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    await dataSource.transaction(async (transactionalEntityManager) => {
      for (const app of apps) {
        const existingApp = await transactionalEntityManager
          .getRepository(App)
          .findOne({ where: { name: app.name, isOfficial: true } });

        if (existingApp) {
          // Update existing app
          Object.assign(existingApp, {
            ...app,
            updatedAt: new Date(),
          });
          await transactionalEntityManager.getRepository(App).save(existingApp);
        } else {
          // Create new app
          const appEntity = new App();
          Object.assign(appEntity, {
            ...app,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await transactionalEntityManager.getRepository(App).save(appEntity);
        }
      }
    });
  }
}
