import { trace, propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import type { Tracer, Span } from '@opentelemetry/api';
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export type { Span } from '@opentelemetry/api';
export { SpanStatusCode } from '@opentelemetry/api';

let _tracer: Tracer | null = null;
let _initialized = false;

export function initTelemetry(): void {
  if (_initialized) return;
  _initialized = true;

  const endpoint = process.env.EXPO_PUBLIC_OTEL_ENDPOINT;
  const serviceName = process.env.EXPO_PUBLIC_OTEL_SERVICE_NAME ?? 'landgrab-mobile';

  if (!endpoint) {
    return;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    'deployment.environment': __DEV__ ? 'development' : 'production',
    'device.type': 'mobile',
  });

  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers: { 'Content-Type': 'application/json' },
    timeoutMillis: 5000,
  });

  const provider = new BasicTracerProvider({ resource });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register({ propagator: new W3CTraceContextPropagator() });

  _tracer = trace.getTracer(serviceName, '1.0.0');
}

export function getTracer(): Tracer {
  return _tracer ?? trace.getTracer('landgrab-mobile');
}

export function injectTraceContext(
  span: Span,
  carrier: Record<string, string>,
): void {
  const ctx = trace.setSpan(ROOT_CONTEXT, span);
  propagation.inject(ctx, carrier);
}

export function installGlobalErrorHandler(): void {
  const tracer = getTracer();
  const ErrorUtils = (global as any).ErrorUtils;
  if (!ErrorUtils) return;

  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
    const span = tracer.startSpan('js.unhandled_error');
    span.recordException(error);
    span.setAttributes({
      'error.type': error?.name ?? 'UnknownError',
      'error.fatal': isFatal,
      'error.message': error?.message ?? '',
    });
    span.setStatus({ code: 2, message: error?.message });
    span.end();
    if (previousHandler) previousHandler(error, isFatal);
  });
}
