from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic models
class WearableDevice(BaseModel):
    device_id: str
    device_name: str
    manufacturer: str
    device_type: str  # fitbit, apple_watch, garmin, etc.
    connected: bool = False
    permissions_granted: bool = False
    last_sync: Optional[str] = None

class WearablePermission(BaseModel):
    user_id: str
    device_id: str
    permissions: Dict[str, bool]  # {"heart_rate": True, "steps": True, "sleep": False}
    granted_at: str

class WearableData(BaseModel):
    user_id: str
    device_id: str
    data_type: str  # heart_rate, steps, sleep, etc.
    value: str
    unit: str
    timestamp: str
    sync_id: str

class PermissionRequest(BaseModel):
    user_id: str
    device_type: str
    requested_permissions: List[str]

@router.get("/api/wearables/devices/{user_id}")
async def get_user_devices(user_id: str):
    """Get all wearable devices for a user"""
    try:
        devices = await db.wearable_devices.find({"user_id": user_id}).to_list(length=None)
        return {"devices": devices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/wearables/request-permission")
async def request_wearable_permission(request: PermissionRequest):
    """Request permission to access wearable data"""
    try:
        permission_id = str(uuid.uuid4())
        
        # Create permission request record
        permission_request = {
            "permission_id": permission_id,
            "user_id": request.user_id,
            "device_type": request.device_type,
            "requested_permissions": request.requested_permissions,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.wearable_permissions.insert_one(permission_request)
        
        return {
            "permission_id": permission_id,
            "status": "pending",
            "message": "Permission request created. Please check your device for authorization."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/wearables/grant-permission")
async def grant_permission(permission_data: WearablePermission):
    """Grant permission for wearable data access"""
    try:
        # Update permission status
        permission_record = {
            "user_id": permission_data.user_id,
            "device_id": permission_data.device_id,
            "permissions": permission_data.permissions,
            "granted_at": permission_data.granted_at,
            "status": "granted"
        }
        
        # Insert or update the permission
        await db.wearable_permissions.update_one(
            {"user_id": permission_data.user_id, "device_id": permission_data.device_id},
            {"$set": permission_record},
            upsert=True
        )
        
        # Update device connection status
        await db.wearable_devices.update_one(
            {"device_id": permission_data.device_id, "user_id": permission_data.user_id},
            {"$set": {
                "connected": True,
                "permissions_granted": True,
                "last_sync": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return {"status": "success", "message": "Permission granted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/wearables/connect-device")
async def connect_device(device: WearableDevice):
    """Connect a new wearable device"""
    try:
        device_record = device.dict()
        device_record["created_at"] = datetime.now(timezone.utc).isoformat()
        device_record["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Insert or update device
        await db.wearable_devices.update_one(
            {"device_id": device.device_id},
            {"$set": device_record},
            upsert=True
        )
        
        return {
            "status": "success",
            "message": f"Device {device.device_name} connected successfully",
            "device_id": device.device_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/wearables/sync-data")
async def sync_wearable_data(data_list: List[WearableData]):
    """Sync wearable data from connected devices"""
    try:
        synced_records = []
        
        for data in data_list:
            data_record = data.dict()
            data_record["synced_at"] = datetime.now(timezone.utc).isoformat()
            
            # Insert data record
            result = await db.wearable_data.insert_one(data_record)
            synced_records.append({
                "sync_id": data.sync_id,
                "data_type": data.data_type,
                "status": "synced",
                "record_id": str(result.inserted_id)
            })
        
        # Update last sync time for device
        if data_list:
            await db.wearable_devices.update_one(
                {"device_id": data_list[0].device_id},
                {"$set": {"last_sync": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {
            "status": "success",
            "synced_count": len(synced_records),
            "records": synced_records
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/wearables/data/{user_id}")
async def get_wearable_data(user_id: str, data_type: Optional[str] = None, limit: int = 100):
    """Get wearable data for a user"""
    try:
        query = {"user_id": user_id}
        if data_type:
            query["data_type"] = data_type
        
        data = await db.wearable_data.find(query).sort("timestamp", -1).limit(limit).to_list(length=None)
        
        return {
            "user_id": user_id,
            "data_type": data_type,
            "count": len(data),
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/wearables/permissions/{user_id}")
async def get_user_permissions(user_id: str):
    """Get user's wearable permissions"""
    try:
        permissions = await db.wearable_permissions.find({"user_id": user_id}).to_list(length=None)
        return {"permissions": permissions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/api/wearables/disconnect/{device_id}")
async def disconnect_device(device_id: str):
    """Disconnect a wearable device"""
    try:
        # Update device status
        result = await db.wearable_devices.update_one(
            {"device_id": device_id},
            {"$set": {
                "connected": False,
                "permissions_granted": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {"status": "success", "message": "Device disconnected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))