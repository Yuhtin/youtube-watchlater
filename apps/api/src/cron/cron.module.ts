import { Module } from '@nestjs/common';
import { PlaylistResyncService } from './playlist-resync.service';
import { YoutubeModule } from '../youtube/youtube.module';

@Module({
    imports: [YoutubeModule],
    providers: [PlaylistResyncService],
})
export class CronModule { }
