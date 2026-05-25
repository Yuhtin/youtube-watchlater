import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YoutubeModule } from '../youtube/youtube.module';
import { ListController } from './list.controller';
import { ListService } from './list.service';

@Module({
    imports: [AuthModule, YoutubeModule],
    controllers: [ListController],
    providers: [ListService],
    exports: [ListService],
})
export class ListModule { }
