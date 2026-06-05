import cv2
import mediapipe as mp

cap = cv2.VideoCapture(0)

mp_face_mesh = mp.solutions.face_mesh

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)

NOSE_TIP = 1

while True:

    success, frame = cap.read()

    if not success:
        break

    frame = cv2.flip(frame, 1)

    h, w, _ = frame.shape

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    result = face_mesh.process(
        rgb_frame
    )

    direction = "Center"

    if result.multi_face_landmarks:

        for face_landmarks in result.multi_face_landmarks:

            nose = face_landmarks.landmark[
                NOSE_TIP
            ]

            nose_x = int(nose.x * w)
            nose_y = int(nose.y * h)

            cv2.circle(
                frame,
                (nose_x, nose_y),
                5,
                (0,255,0),
                -1
            )

            if nose_x < w * 0.40:

                direction = "Looking Left"

            elif nose_x > w * 0.60:

                direction = "Looking Right"

            else:

                direction = "Looking Center"

    cv2.putText(
        frame,
        direction,
        (20,50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0,0,255),
        2
    )

    cv2.imshow(
        "Head Movement Detection",
        frame
    )

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()