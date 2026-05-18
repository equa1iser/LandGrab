from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.redis_client import close_redis
from app.core.telemetry import setup_telemetry, get_logger
from app.api.v1.router import api_router

limiter = Limiter(key_func=get_remote_address)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.data_sources.registry import initialize_registry
    await initialize_registry()
    logger.info("LandGrab startup complete")
    yield
    await close_redis()
    logger.info("LandGrab shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

setup_telemetry(app)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_cors_origins = settings.ALLOWED_ORIGINS + settings.MOBILE_ALLOWED_ORIGINS
# In debug mode allow all origins so mobile devices on the LAN can connect
if settings.DEBUG:
    _cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=not settings.DEBUG,  # credentials forbidden when allow_origins="*"
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {
        "status": "operational",
        "version": settings.VERSION,
        "app": settings.APP_NAME,
    }
