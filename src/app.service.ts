import { Injectable } from '@nestjs/common';
import { getLogger } from '@pague-co-uk/sms-gateway-telemetry';

@Injectable()
export class AppService {
  private readonly logger = getLogger();

  getHello(): string {
    this.logger.info('getHello() called');
    this.logger.debug('Debug log from AppService');
    this.logger.warn('Warning log from AppService');

    return 'Hello World!';
  }
}