import asyncio
import json
import websockets

# Đặt tên định danh cho tab chạy trên mây
CLIENT_ID = "HenDy-Cloud-Worker-01"

# Thay bằng URL WebSocket thực tế trên Railway của bạn
SERVER_URI = "wss://hendy-server-production.up.railway.app"

async def execute_automation(data):
    username = data.get("username")
    brand = data.get("brand")
    concurrence = data.get("concurrence")
    game_name = data.get("game_name")

    print(f"[{CLIENT_ID}] Nhận cấu hình cho User: {username}")

    yield {
        "client_id": CLIENT_ID,
        "status": "RUNNING",
        "log": f"[{username}] Đang chạy ngầm trên Cloud cho Brand {brand} | Game: {game_name}"
    }
    await asyncio.sleep(1)

    yield {
        "client_id": CLIENT_ID,
        "status": "SUCCESS",
        "log": f"[{username}] Đã xử lý thành công trên mây (Đồng thuận: {concurrence})"
    }

async def client_listener():
    while True:
        try:
            print(f"[{CLIENT_ID}] Đang kết nối tới Cloud Server...")
            async with websockets.connect(SERVER_URI) as websocket:
                print(f"[{CLIENT_ID}] Đã kết nối thành công tới WebSocket Cloud!")

                await websocket.send(json.dumps({
                    "client_id": CLIENT_ID,
                    "status": "READY",
                    "log": f"{CLIENT_ID} đã sẵn sàng chạy 24/7 trên mây."
                }))

                async for message in websocket:
                    try:
                        data = json.loads(message)
                        if data.get("action") == "APPLY_CONFIG":
                            async for log_update in execute_automation(data):
                                await websocket.send(json.dumps(log_update))
                    except json.JSONDecodeError:
                        pass

        except Exception as e:
            print(f"[{CLIENT_ID}] Mất kết nối ({e}), thử kết nối lại sau 5 giây...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(client_listener())import asyncio
import json
import websockets

# Đặt tên định danh cho tab chạy trên mây
CLIENT_ID = "HenDy-Cloud-Worker-01"

# Thay bằng URL WebSocket thực tế trên Railway của bạn
SERVER_URI = "wss://hendy-server-production.up.railway.app"

async def execute_automation(data):
    username = data.get("username")
    brand = data.get("brand")
    concurrence = data.get("concurrence")
    game_name = data.get("game_name")

    print(f"[{CLIENT_ID}] Nhận cấu hình cho User: {username}")

    yield {
        "client_id": CLIENT_ID,
        "status": "RUNNING",
        "log": f"[{username}] Đang chạy ngầm trên Cloud cho Brand {brand} | Game: {game_name}"
    }
    await asyncio.sleep(1)

    yield {
        "client_id": CLIENT_ID,
        "status": "SUCCESS",
        "log": f"[{username}] Đã xử lý thành công trên mây (Đồng thuận: {concurrence})"
    }

async def client_listener():
    while True:
        try:
            print(f"[{CLIENT_ID}] Đang kết nối tới Cloud Server...")
            async with websockets.connect(SERVER_URI) as websocket:
                print(f"[{CLIENT_ID}] Đã kết nối thành công tới WebSocket Cloud!")

                await websocket.send(json.dumps({
                    "client_id": CLIENT_ID,
                    "status": "READY",
                    "log": f"{CLIENT_ID} đã sẵn sàng chạy 24/7 trên mây."
                }))

                async for message in websocket:
                    try:
                        data = json.loads(message)
                        if data.get("action") == "APPLY_CONFIG":
                            async for log_update in execute_automation(data):
                                await websocket.send(json.dumps(log_update))
                    except json.JSONDecodeError:
                        pass

        except Exception as e:
            print(f"[{CLIENT_ID}] Mất kết nối ({e}), thử kết nối lại sau 5 giây...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(client_listener())
