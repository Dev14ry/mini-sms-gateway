import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmsService } from './sms.service';

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('calculate')
  calculate(@Body() body: { message?: unknown }) {
    return this.smsService.calculate(body?.message);
  }
}
