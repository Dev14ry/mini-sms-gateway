import { BadRequestException, Injectable } from '@nestjs/common';
import { calculateSms } from './utils/sms-calculator';

@Injectable()
export class SmsService {
  calculate(message: unknown) {
    if (typeof message !== 'string') {
      throw new BadRequestException('Message must be a string');
    }

    try {
      return calculateSms(message);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Unable to calculate SMS cost');
    }
  }
}
