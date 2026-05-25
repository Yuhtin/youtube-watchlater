import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CardModule } from './card/card.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PlaylistModule } from './playlist/playlist.module';
import { SuggestionModule } from './suggestion/suggestion.module';
import { YoutubeModule } from './youtube/youtube.module';
import { CronModule } from './cron/cron.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CardModule,
    PrismaModule,
    UserModule,
    AuthModule,
    PlaylistModule,
    SuggestionModule,
    YoutubeModule,
    CronModule,
  ],
})
export class AppModule { }
