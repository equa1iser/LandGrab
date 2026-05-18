import logging
from typing import Optional

_cache_hit_counter = None
_cache_miss_counter = None
_deal_score_histogram = None


def setup_telemetry(app) -> None:
    from app.core.config import settings

    endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT
    if not endpoint:
        return

    from opentelemetry import trace, metrics
    from opentelemetry._logs import set_logger_provider
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
    from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION

    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    from opentelemetry.instrumentation.celery import CeleryInstrumentor

    global _cache_hit_counter, _cache_miss_counter, _deal_score_histogram

    resource = Resource.create({
        SERVICE_NAME: settings.OTEL_SERVICE_NAME,
        SERVICE_VERSION: settings.VERSION,
    })

    # Traces
    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
    )
    trace.set_tracer_provider(tracer_provider)

    # Metrics
    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=endpoint),
        export_interval_millis=60_000,
    )
    meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    metrics.set_meter_provider(meter_provider)

    # Logs
    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(OTLPLogExporter(endpoint=endpoint))
    )
    set_logger_provider(logger_provider)
    otel_handler = LoggingHandler(level=logging.DEBUG, logger_provider=logger_provider)
    logging.getLogger().addHandler(otel_handler)
    logging.getLogger().setLevel(logging.INFO)

    # Auto-instrumentors
    FastAPIInstrumentor().instrument_app(app)
    SQLAlchemyInstrumentor().instrument(enable_commenter=True)
    RedisInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()
    CeleryInstrumentor().instrument()

    # Custom metrics
    meter = metrics.get_meter("landgrab", settings.VERSION)
    _cache_hit_counter = meter.create_counter(
        "landgrab.cache.hits",
        description="Redis cache hits",
        unit="1",
    )
    _cache_miss_counter = meter.create_counter(
        "landgrab.cache.misses",
        description="Redis cache misses",
        unit="1",
    )
    _deal_score_histogram = meter.create_histogram(
        "landgrab.deal_score.duration_ms",
        description="Deal score computation duration",
        unit="ms",
    )
    meter.create_counter(
        "landgrab.rentcast.api_calls",
        description="RentCast API calls tracked against monthly quota",
        unit="1",
    )
    meter.create_counter(
        "landgrab.external_api.calls",
        description="External data source API calls",
        unit="1",
    )


def get_cache_hit_counter():
    return _cache_hit_counter


def get_cache_miss_counter():
    return _cache_miss_counter


def get_deal_score_histogram():
    return _deal_score_histogram


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
