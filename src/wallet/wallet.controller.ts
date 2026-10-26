import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletService } from './wallet.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@Req() req: AuthenticatedRequest) {
    return this.walletService.getWallet(req.user.userId);
  }

  @Post('deduct')
  deductCredits(
    @Req() req: AuthenticatedRequest,
    @Body() body: { credits?: unknown },
  ) {
    return this.walletService.deductCredits(req.user.userId, body?.credits);
  }
}
