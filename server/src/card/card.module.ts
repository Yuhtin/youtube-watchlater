import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardController } from './card.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlaylistController } from 'src/playlist/playlist.controller';
import { PlaylistModule } from 'src/playlist/playlist.module';

@Module({
  imports: [PlaylistModule],
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
