import cv2

from liveness_verifier import (
    verify_liveness
)

cap = cv2.VideoCapture(0)

while True:

    success, frame = cap.read()

    if not success:
        break

    live = verify_liveness(
        frame
    )

    if live:

        print(
            "Liveness Verified"
        )

    cv2.imshow(
        "Liveness Test",
        frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()