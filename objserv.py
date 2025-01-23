import cv2
import numpy as np
import json
from flask import Flask, jsonify, request

app = Flask(__name__)

# YOLO
net = cv2.dnn.readNet("yolov3.weights", "yolov3.cfg")
classes = []
with open("coco.names", "r") as f:
    classes = [line.strip() for line in f.readlines()]

layer_names = net.getLayerNames()
outputlayers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
colors = np.random.uniform(0, 255, size=(len(classes), 3))

# Detecting objects with Non-Maximum Suppression (NMS)
def detect(img, confidence_threshold):
    height, width, channels = img.shape
    blob = cv2.dnn.blobFromImage(img, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outs = net.forward(outputlayers)
    
    class_ids = []
    confidences = []
    boxes = []
    detected_objects = []
    
    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            if confidence > confidence_threshold:
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)
    
    indices = cv2.dnn.NMSBoxes(boxes, confidences, confidence_threshold, 0.4)
    
    if len(indices) > 0:
        for i in indices.flatten():
            x, y, w, h = boxes[i]
            detected_objects.append(classes[class_ids[i]])
            
            # BOX - different colors in each class
            color = colors[class_ids[i]]
            cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
            cv2.putText(img, classes[class_ids[i]], (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    return detected_objects, img

@app.route('/detect-objects', methods=['POST'])
def detect_objects():
    # REQUEST THE IMAGE FROM THE UPLOADED
    img = request.files['image'].read()
    np_arr = np.frombuffer(img, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    
    confidence_threshold = float(request.form.get('confidence_threshold', 0.8))
    
    detected_objects, img_with_boxes = detect(img, confidence_threshold)
    
    # SAVE THE IMAGE
    cv2.imwrite("detected_image.jpg", img_with_boxes)
    
    # DETECTED OBJECTS
    return jsonify(detected_objects)

if __name__ == "__main__":
    app.run(debug=True)
