import { Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [CardModule, PrismaModule],
})
export class AppModule { }
