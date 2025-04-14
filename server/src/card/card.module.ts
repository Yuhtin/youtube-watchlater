import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
