import cv2
import mediapipe as mp
from scipy.spatial import distance
 
mp_face_mesh = mp.solutions.face_mesh
 
face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True
)
 
LEFT_EYE = [33, 160, 158, 133, 153, 144]
NOSE_TIP = 1
 
blink_verified = False
head_verified  = False
blink_detected = False
_last_ear      = 0.3   # ← exposed so WebSocket endpoint can send it to browser
 
 
def EAR(eye_points):
    vertical1 = distance.euclidean(eye_points[1], eye_points[5])
    vertical2 = distance.euclidean(eye_points[2], eye_points[4])
    horizontal = distance.euclidean(eye_points[0], eye_points[3])
    return (vertical1 + vertical2) / (2 * horizontal)
 
 
def verify_liveness(frame):
 
    global blink_verified, head_verified, blink_detected, _last_ear
 
    h, w, _ = frame.shape
 
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)
 
    status = False
 
    if results.multi_face_landmarks:
 
        for face_landmarks in results.multi_face_landmarks:
 
            eye_coordinates = []
            for idx in LEFT_EYE:
                landmark = face_landmarks.landmark[idx]
                x = int(landmark.x * w)
                y = int(landmark.y * h)
                eye_coordinates.append((x, y))
 
            ear = EAR(eye_coordinates)
            _last_ear = ear   # ← save for WebSocket to read
 
            if ear < 0.20:
                if not blink_detected:
                    blink_detected = True
                    blink_verified = True
            else:
                blink_detected = False
 
            nose   = face_landmarks.landmark[NOSE_TIP]
            nose_x = int(nose.x * w)
 
            if nose_x < w * 0.40 or nose_x > w * 0.60:
                head_verified = True
 
            if blink_verified and head_verified:
                status = True
 
    return status