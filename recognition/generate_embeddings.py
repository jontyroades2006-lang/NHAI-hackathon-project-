import face_recognition
import os
import pickle

dataset_path = "dataset"

known_encodings = []
known_names = []

for person_name in os.listdir(dataset_path):

    person_folder = os.path.join(
        dataset_path,
        person_name
    )

    if not os.path.isdir(person_folder):
        continue

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

            print("Face Found:", image_path)

            known_encodings.append(
                encodings[0]
            )

            known_names.append(
                person_name
            )

data = {

    "encodings": known_encodings,

    "names": known_names
}

os.makedirs("models", exist_ok=True)

with open(
    "models/embeddings.pkl",
    "wb"
) as file:

    pickle.dump(
        data,
        file
    )

print(
    "Embeddings generated successfully"
)

print(
    "Total Encodings:",
    len(known_encodings)
)

print("Dataset Path:", dataset_path)