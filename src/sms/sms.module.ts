import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsProviderRegistry } from './providers/sms-provider.registery';

@Module({
  imports: [PrismaModule],
  controllers: [SmsController],
  providers: [SmsService, SmsProviderRegistry],
  exports: [SmsService, SmsProviderRegistry],
})
export class SmsModule {}
