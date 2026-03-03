from ultralytics import YOLO
import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "runs",
    "food_detection",
    "v5_9class",
    "weights",
    "best.pt"
)

model = YOLO(MODEL_PATH)

image_path = sys.argv[1]

# 🔇 Disable verbose logs
results = model(image_path, verbose=False)

detections = []

for r in results:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        label = model.names[cls_id]
        confidence = float(box.conf[0])
        detections.append({
            "label": label,
            "confidence": round(confidence, 2)
        })

#  PRINT ONLY JSON (VERY IMPORTANT)
print(json.dumps(detections))
