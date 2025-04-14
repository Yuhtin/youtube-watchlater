import { Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [CardModule, PrismaModule, UserModule, AuthModule],
})
export class AppModule { }