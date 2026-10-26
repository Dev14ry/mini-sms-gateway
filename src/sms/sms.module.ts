import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsProviderRegistry } from './providers/sms-provider.registery';

@Module({
  controllers: [SmsController],
  providers: [SmsService, SmsProviderRegistry],
  exports: [SmsService, SmsProviderRegistry],
})
export class SmsModule {}
