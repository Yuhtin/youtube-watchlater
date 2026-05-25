import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@watchlater/db';

@Injectable()
export class PrismaService extends PrismaClient {
  async onModuleInit() {
    await this.$connect();
  }
}
