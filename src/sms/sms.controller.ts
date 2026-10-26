import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendSmsDto } from './dto/send-sms.dto';
import { SmsService } from './sms.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('sms')
@UseGuards(JwtAuthGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('calculate')
  calculate(@Body() body: { message?: unknown }) {
    return this.smsService.calculate(body?.message);
  }

  @Post('send')
  send(@Req() request: AuthenticatedRequest, @Body() body: SendSmsDto) {
    return this.smsService.send(request.user.userId, body);
  }

  @Get('logs')
  getLogs(
    @Req() request: AuthenticatedRequest,
    @Query()
    query: {
      page?: string;
      limit?: string;
      status?: string;
      number?: string;
      from?: string;
      to?: string;
    },
  ) {
    return this.smsService.getLogs(request.user.userId, query);
  }
}
