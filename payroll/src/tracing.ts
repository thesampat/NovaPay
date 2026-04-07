// tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

export const otelSDK = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'grpc://localhost:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations({
    // Disable fs instrumentation to reduce noise if needed, but we keep defaults
  })],
  serviceName: process.env.SERVICE_NAME || 'unknown-service',
});

// initialize the SDK and register with the OpenTelemetry API
otelSDK.start();

process.on('SIGTERM', () => {
  otelSDK.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
