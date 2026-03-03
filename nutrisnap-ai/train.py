from ultralytics import YOLO

# Load YOLOv8 nano pretrained model
model = YOLO("yolov8n.pt")

# Train on your expanded dataset
model.train(
    data="dataset/food_v5_9class/data.yaml",
    epochs=90,
    imgsz=640,
    batch=16,
    patience=15,
    project="runs/food_detection",
    name="v5_9class"
)