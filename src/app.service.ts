import { Injectable } from '@nestjs/common';
import {
  createCounterMetric,
  createHistogramMetric,
  getLogger,
} from '@pague-co-uk/sms-gateway-telemetry';

const requests = createCounterMetric({
  name: 'app.requests.total',
  description: 'Total application requests',
});

const requestDuration = createHistogramMetric({
  name: 'app.request.duration',
  description: 'Application request duration',
  unit: 'ms',
});

@Injectable()
export class AppService {
  private readonly logger = getLogger();

  getHello(): string {
    const start = performance.now();

    requests.increment({
      endpoint: '/',
      method: 'GET',
    });

    this.logger.info(
      {
        endpoint: '/',
      },
      'Processing request',
    );

    requestDuration.record(
      performance.now() - start,
      {
        endpoint: '/',
        method: 'GET',
      },
    );

    return 'Hello World!';
  }
}