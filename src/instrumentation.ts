import { initTelemetry } from '@pague-co-uk/sms-gateway-telemetry';
import packageJson from '../package.json';

initTelemetry({
  service: {
    name: 'control-plane-api',
    version: packageJson.version,
  },
  collector: {
    tracesEndpoint: 'http://localhost:4318/v1/traces',
    metricsEndpoint: 'http://localhost:4318/v1/metrics',
  },
  metrics: {
    exportIntervalMillis: 10000,
  },
});