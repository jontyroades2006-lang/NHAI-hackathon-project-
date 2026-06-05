import face_recognition
import os

known_encodings = []
known_names = []


def load_dataset():

    dataset_path = "dataset"

    for person_name in os.listdir(dataset_path):

        person_folder = os.path.join(
            dataset_path,
            person_name
        )

        for image_name in os.listdir(person_folder):

            image_path = os.path.join(
                person_folder,
                image_name
            )

            image = face_recognition.load_image_file(
                image_path
            )

            encodings = face_recognition.face_encodings(
                image
            )

            if len(encodings) > 0:

                known_encodings.append(
                    encodings[0]
                )

                known_names.append(
                    person_name
                )

    print("Dataset Loaded")

    if not os.path.exists(dataset_path):

        print(
        "Dataset folder not found"
    )

    return

def recognize_face(image_path):

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

    if True in matches:

        index = matches.index(True)

        return known_names[index]

    return None