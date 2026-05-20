import { trace, propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import type { Tracer, Span, SpanExporter, ExportResult } from '@opentelemetry/api';
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResultCode } from '@opentelemetry/core';
import { Resource } from '@opentelemetry/resources';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
// JsonTraceSerializer is a transitive dep of exporter-trace-otlp-http
// eslint-disable-next-line import/no-extraneous-dependencies
import { JsonTraceSerializer } from '@opentelemetry/otlp-transformer';

export type { Span } from '@opentelemetry/api';
export { SpanStatusCode } from '@opentelemetry/api';

// React Native's Blob polyfill does not support Uint8Array as a constructor
// argument, so the stock OTLPTraceExporter (which calls xhr.send(new Blob([data])))
// silently fails. This exporter avoids Blob entirely: it decodes the JSON bytes to
// a plain string and POSTs via fetch, which works correctly in React Native / Hermes.
class RNOTLPExporter implements SpanExporter {
  private readonly url: string;
  private readonly timeoutMs: number;
  private _shutdown = false;

  constructor(url: string, timeoutMs = 5000) {
    this.url = url;
    this.timeoutMs = timeoutMs;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this._shutdown) {
      resultCallback({ code: ExportResultCode.FAILED });
      return;
    }

    const request = JsonTraceSerializer.serializeRequest(spans);
    if (!request) {
      resultCallback({ code: ExportResultCode.FAILED });
      return;
    }

    // Decode Uint8Array → string (the JSON serializer outputs UTF-8 encoded JSON)
    const body = new TextDecoder().decode(request);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })
      .then(() => {
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((err: Error) => {
        if (__DEV__) console.warn('[OTel] export failed:', err.message);
        resultCallback({ code: ExportResultCode.FAILED, error: err });
      })
      .finally(() => clearTimeout(timer));
  }

  shutdown(): Promise<void> {
    this._shutdown = true;
    return Promise.resolve();
  }
}

let _tracer: Tracer | null = null;
let _initialized = false;

export function initTelemetry(): void {
  if (_initialized) return;
  _initialized = true;

  const endpoint = process.env.EXPO_PUBLIC_OTEL_ENDPOINT;
  const serviceName = process.env.EXPO_PUBLIC_OTEL_SERVICE_NAME ?? 'landgrab-mobile';

  if (__DEV__) {
    console.log('[OTel] endpoint:', endpoint ?? '(unset — telemetry disabled)');
  }

  if (!endpoint) {
    return;
  }

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    'deployment.environment': __DEV__ ? 'development' : 'production',
    'device.type': 'mobile',
  });

  const exporter = new RNOTLPExporter(`${endpoint}/v1/traces`);

  const provider = new BasicTracerProvider({ resource });
  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register({ propagator: new W3CTraceContextPropagator() });

  _tracer = trace.getTracer(serviceName, '1.0.0');

  if (__DEV__) {
    console.log('[OTel] initialized — service:', serviceName);
  }
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
