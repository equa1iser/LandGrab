export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node')
    const { Resource } = await import('@opentelemetry/resources')
    const { SemanticResourceAttributes } = await import('@opentelemetry/semantic-conventions')

    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    if (!endpoint) return

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'landgrab-frontend',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
      }),
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    })

    sdk.start()
  }
}
