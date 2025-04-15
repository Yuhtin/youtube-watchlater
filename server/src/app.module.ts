import { Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PlaylistModule } from './playlist/playlist.module';

@Module({
  imports: [CardModule, PrismaModule, UserModule, AuthModule, PlaylistModule],
})
export class AppModule { }