import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';

@Module({
  imports: [],
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
