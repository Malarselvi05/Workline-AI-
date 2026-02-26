from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as async_redis
import os
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/runs/{run_id}")
async def websocket_runs(websocket: WebSocket, run_id: int):
    """
    WebSocket endpoint for real-time run status updates.
    Subscribes to Redis pub/sub for the specific run.
    """
    await websocket.accept()
    redis_client = await async_redis.from_url(REDIS_URL)
    pubsub = redis_client.pubsub()
    
    channel = f"run_status:{run_id}"
    await pubsub.subscribe(channel)
    
    logger.info(f"WebSocket subscrided to {channel}")
    
    try:
        while True:
            # We use a loop to check for messages
            # get_message with timeout allows the loop to be interrupted by disconnect
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
            if message:
                try:
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                except Exception as send_error:
                    logger.warning(f"Error sending WS message: {send_error}")
                    break
            
            # Short sleep to prevent CPU spinning if get_message returns None immediately
            await asyncio.sleep(0.01)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for run {run_id}")
    except Exception as e:
        logger.error(f"WebSocket error for run {run_id}: {e}")
    finally:
        await pubsub.unsubscribe(channel)
        await redis_client.close()

@router.websocket("/workspace/{org_id}")
async def websocket_workspace(websocket: WebSocket, org_id: int):
    """
    WebSocket endpoint for general workspace events (drift alerts, workflow saves, etc.).
    """
    await websocket.accept()
    redis_client = await async_redis.from_url(REDIS_URL)
    pubsub = redis_client.pubsub()
    
    channel = f"workspace_events:{org_id}"
    await pubsub.subscribe(channel)
    
    logger.info(f"WebSocket subscrided to {channel}")

    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
            if message:
                try:
                    data = json.loads(message["data"])
                    await websocket.send_json(data)
                except Exception as send_error:
                    logger.warning(f"Error sending WS message: {send_error}")
                    break
            
            await asyncio.sleep(0.01)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for workspace {org_id}")
    except Exception as e:
        logger.error(f"WebSocket error for workspace {org_id}: {e}")
    finally:
        await pubsub.unsubscribe(channel)
        await redis_client.close()
