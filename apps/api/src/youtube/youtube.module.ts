import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';

@Module({
    imports: [AuthModule],
    controllers: [YoutubeController],
    providers: [YoutubeService],
    exports: [YoutubeService],
})
export class YoutubeModule { }
