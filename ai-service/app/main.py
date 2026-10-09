import io
import time
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import JSONResponse
from ultralytics import YOLO

app = FastAPI(
    title="AFV Target Detection AI Service",
    description="Real YOLOv8 inference service for automated military vehicle and asset detection",
    version="2.0.0"
)

# Load real Ultralytics YOLOv8 nano model (cached in memory for high-throughput inference)
model = YOLO("yolov8n.pt")

# Tactical asset classification mapping (COCO class -> AFV Tactical category)
TACTICAL_CLASS_MAP = {
    "car": "APC / Recon Vehicle",
    "truck": "Military Truck",
    "bus": "Armored Transport",
    "train": "Heavy Rail Asset",
    "airplane": "Aerial Drone / Aircraft",
    "boat": "Naval Patrol Craft",
    "person": "Infantry Target",
    "motorcycle": "Light Recon Scout",
}

@app.get("/")
def read_root():
    return {
        "status": "UP",
        "service": "AFV Target Detection Inference Engine (Real YOLOv8)",
        "model_version": "yolov8n.pt",
        "engine": "Ultralytics YOLOv8"
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
        
        # Open image from in-memory bytes
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Failed to read image: {str(e)}"})
    
    try:
        # Run real YOLOv8 deep learning computer vision inference!
        results = model(image, verbose=False)
        detections = []
        
        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                raw_class_name = model.names.get(cls_id, f"Class_{cls_id}")
                confidence = round(float(boxes.conf[i].item()), 4)
                
                # Extract normalized bounding box coordinates [x_min, y_min, x_max, y_max] in [0, 1]
                xyxyn = boxes.xyxyn[i].tolist()
                x_min = round(float(xyxyn[0]), 4)
                y_min = round(float(xyxyn[1]), 4)
                x_max = round(float(xyxyn[2]), 4)
                y_max = round(float(xyxyn[3]), 4)
                
                # Map to tactical asset naming if applicable, otherwise keep detected class
                tactical_name = TACTICAL_CLASS_MAP.get(raw_class_name.lower(), raw_class_name.capitalize())
                
                detections.append({
                    "class_name": tactical_name,
                    "confidence": confidence,
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
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Inference execution failed: {str(e)}"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
