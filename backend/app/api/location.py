from fastapi import APIRouter, Query, HTTPException
from app.services.geocoding_service import reverse_geocode_coords

router = APIRouter(prefix="/location", tags=["Location"])

@router.get("/reverse-geocode")
async def reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lng: float = Query(..., ge=-180.0, le=180.0, description="Longitude")
):
    address = await reverse_geocode_coords(lat, lng)
    return {
        "latitude": lat,
        "longitude": lng,
        "address": address or f"{lat:.5f}, {lng:.5f}"
    }
