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


def recognize_image(image_path):

    image = face_recognition.load_image_file(
        image_path
    )

    encodings = face_recognition.face_encodings(
        image
    )

    if len(encodings) == 0:

        return None

    face_encoding = encodings[0]

    matches = face_recognition.compare_faces(
        known_encodings,
        face_encoding
    )

    face_distances = face_recognition.face_distance(
        known_encodings,
        face_encoding
    )

    best_match_index = np.argmin(
        face_distances
    )

    if matches[best_match_index]:

        return known_names[
            best_match_index
        ]

    return None