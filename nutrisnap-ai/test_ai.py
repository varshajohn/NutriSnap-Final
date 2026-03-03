from ultralytics import YOLO

model = YOLO("runs/food_detection/v5_9class/weights/best.pt")

model(
    source="test_images",
    conf=0.25,
    iou=0.6,
    save=True
)


