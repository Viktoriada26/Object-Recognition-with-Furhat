import cv2

# Open the camera (0 is usually the default camera)
cap = cv2.VideoCapture(1)

# Check if the camera is opened successfully
if not cap.isOpened():
    print("Error: Could not open camera.")
    exit()

while True:
    # Capture frame-by-frame
    ret, frame = cap.read()

    # If the frame is read correctly, ret will be True
    if ret:
        # Display the captured frame
        cv2.imshow('Camera', frame)

        # Break the loop when the 'q' key is pressed
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    else:
        print("Error: Could not read frame.")
        break

# Release the camera and close the window
cap.release()
cv2.destroyAllWindows()
