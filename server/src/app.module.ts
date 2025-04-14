import { Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [CardModule, PrismaModule, UserModule],
})
export class AppModule { }