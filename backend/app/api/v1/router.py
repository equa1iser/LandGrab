from fastapi import APIRouter

from app.api.v1.routes import properties, search, auth, users, market, admin, settings

api_router = APIRouter()

api_router.include_router(properties.router, prefix="/properties", tags=["properties"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
