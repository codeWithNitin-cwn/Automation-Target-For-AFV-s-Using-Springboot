import time
import random
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse

app = FastAPI(
    title="AFV Target Detection AI Service",
    description="Mock inference service for YOLOv8 model targeting military assets",
    version="1.0.0"
)

TARGET_CLASSES = ["Tank", "APC", "Infantry", "Military Truck", "Artillery"]

@app.get("/")
def read_root():
    return {
        "status": "UP",
        "service": "AFV Target Detection Inference Engine",
        "model_version": "yolov8n-afv-v1.0"
    }

@app.post("/inference")
async def run_inference(
    file: UploadFile = File(...),
    model_version: str = Form("yolov8n-afv-v1.0")
):
    start_time = time.time()
    
    try:
        content = await file.read()
        if len(content) == 0:
            return JSONResponse(status_code=400, content={"error": "Empty file received"})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Failed to read image: {str(e)}"})
    
    simulated_delay = random.uniform(0.15, 0.45)
    time.sleep(simulated_delay)
    
    num_detections = random.randint(0, 3)
    detections = []
    
    for _ in range(num_detections):
        x_min = round(random.uniform(0.05, 0.45), 4)
        y_min = round(random.uniform(0.05, 0.45), 4)
        x_max = round(random.uniform(x_min + 0.1, 0.95), 4)
        y_max = round(random.uniform(y_min + 0.1, 0.95), 4)
        
        detections.append({
            "class_name": random.choice(TARGET_CLASSES),
            "confidence": round(random.uniform(0.65, 0.98), 4),
            "box": {
                "x_min": x_min,
                "y_min": y_min,
                "x_max": x_max,
                "y_max": y_max
            }
        })
        
    end_time = time.time()
    processing_time_ms = int((end_time - start_time) * 1000)
    
    return {
        "status": "success",
        "model_version": model_version,
        "processing_time_ms": processing_time_ms,
        "detections": detections
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
