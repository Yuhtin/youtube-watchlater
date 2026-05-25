import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SmartPickController } from './smart-pick.controller';
import { SmartPickService } from './smart-pick.service';

@Module({
    imports: [AuthModule],
    controllers: [SmartPickController],
    providers: [SmartPickService],
})
export class SmartPickModule { }
