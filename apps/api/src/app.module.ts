import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CardModule } from './card/card.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { SuggestionModule } from './suggestion/suggestion.module';
import { ListModule } from './list/list.module';
import { YoutubeModule } from './youtube/youtube.module';
import { CronModule } from './cron/cron.module';
import { SmartPickModule } from './smart-pick/smart-pick.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CardModule,
    PrismaModule,
    UserModule,
    AuthModule,
    SuggestionModule,
    ListModule,
    YoutubeModule,
    CronModule,
    SmartPickModule,
  ],
})
export class AppModule { }
