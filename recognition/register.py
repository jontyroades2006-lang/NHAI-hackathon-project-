import cv2
import os

user_name = input("Enter the name of the user: ")

# Project root directory
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

dataset_path = os.path.join(base_dir,"dataset",user_name)

print(f"Saving images to: {dataset_path}")

os.makedirs(dataset_path, exist_ok=True)

face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

# Check if detector loaded
if face_detector.empty():
    print("Error: Face detector not loaded.")
    exit()

# Open webcam
cap = cv2.VideoCapture(0)

image_count = 0

while True:

    success, frame = cap.read()

    if not success:
        print("Could not read frame.")
        break

    # Convert to grayscale
    gray = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2GRAY
    )

    # Detect faces
    faces = face_detector.detectMultiScale(
        gray,
        scaleFactor=1.3,
        minNeighbors=5
    )

    for (x, y, w, h) in faces:

        # Draw rectangle
        cv2.rectangle(
            frame,
            (x, y),
            (x + w, y + h),
            (0, 255, 0),
            2
        )

        # Correct face crop
        face_crop = frame[
            y:y+h,
            x:x+w
        ]

        face_crop = cv2.resize(
        face_crop,
        (400, 400)
)

        image_count += 1

        image_path = os.path.join(
            dataset_path,
            f"{image_count}.jpg"
        )

        cv2.imwrite(
            image_path,
            face_crop
        )

        print(f"Saved: {image_path}")

    # Show count
    cv2.putText(
        frame,
        f"Saved: {image_count}",
        (20, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv2.imshow(
        "Face Registration",
        frame
    )

    # Stop after 20 images
    if image_count >= 20:
        print("20 images captured.")
        break

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

print("Face Registration Completed")