import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { User } from "../entities/user.entity";

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return await this.findOne({ where: { email } });
  }
}
