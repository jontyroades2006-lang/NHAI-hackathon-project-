import cv2

from recognition.recognize_embeddings import (
    recognize_face
)

cap = cv2.VideoCapture(0)

while True:

    success, frame = cap.read()

    if not success:
        break

    user = recognize_face(frame)

    if user:

        print(
            f"Recognized: {user}"
        )

    cv2.imshow(
        "Recognition Test",
        frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()