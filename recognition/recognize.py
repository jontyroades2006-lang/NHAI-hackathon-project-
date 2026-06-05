import cv2
import face_recognition
import os
import numpy as np

dataset_path = "dataset"

known_encodings = []
known_names = []

for person_name in os.listdir(dataset_path):

    person_folder = os.path.join(dataset_path,person_name)

    for image_name in os.listdir(person_folder):

        image_path = os.path.join(person_folder,image_name)

        image = face_recognition.load_image_file(image_path)

        encodings = face_recognition.face_encodings(image)

        if len(encodings) > 0:
            known_encodings.append(encodings[0])

            known_names.append(person_name)

print("Dataset Loaded Successfully")

cap = cv2.VideoCapture(0)

while True:

    success, frame = cap.read()

    if not success:
        break

    small_frame = cv2.resize(frame,(0,0),fx=0.25,fy=0.25)
    rgb_small = cv2.cvtColor(small_frame,cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_small)

    face_encodings = face_recognition.face_encodings(rgb_small,face_locations)

    for face_encoding, face_location in zip(face_encodings,face_locations):

        matches = face_recognition.compare_faces(known_encodings,face_encoding)

        name = "Unknown"

        face_distances = face_recognition.face_distance(known_encodings,face_encoding)

        best_match_index = np.argmin(face_distances)

        if matches[best_match_index]:

            name = known_names[best_match_index]

        top,right,bottom,left = face_location

        top *=4
        right *=4
        bottom *=4
        left *=4

        cv2.rectangle(frame,(left,top),(right,bottom),(0,255,0),2)

        cv2.putText(frame,name,(left, top-10),cv2.FONT_HERSHEY_SIMPLEX,1,(0,255,0),2)

    cv2.imshow("Face Recognition System",frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()