import cv2
import face_recognition
import pickle
import numpy as np

with open(
    "models/embeddings.pkl",
    "rb"
) as file:

    data = pickle.load(file)

known_encodings = data["encodings"]
known_names = data["names"]

print("Encodings Loaded:", len(known_encodings))
print("Names Loaded:", len(known_names))


def recognize_face(frame):

    rgb = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )

    face_locations = face_recognition.face_locations(
        rgb
    )

    face_encodings = face_recognition.face_encodings(
        rgb,
        face_locations
    )

    recognized_name = None

    for face_encoding, face_location in zip(
        face_encodings,
        face_locations
    ):

        matches = face_recognition.compare_faces(
            known_encodings,
            face_encoding
        )

        name = "Unknown"

        face_distances = face_recognition.face_distance(
            known_encodings,
            face_encoding
        )

        best_match_index = np.argmin(
            face_distances
        )

        if matches[best_match_index]:

            name = known_names[
                best_match_index
            ]

            recognized_name = name

        top, right, bottom, left = face_location

        cv2.rectangle(
            frame,
            (left, top),
            (right, bottom),
            (0,255,0),
            2
        )

        cv2.putText(
            frame,
            name,
            (left, top-10),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0,255,0),
            2
        )

    return recognized_name