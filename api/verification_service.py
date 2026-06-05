from recognition.recognize import recognize_face
from liveness.liveness_verifier import verify_liveness
from database.attendance_services import mark_attendance


def verify_user():

    user_name = recognize_face()

    if user_name is None:

        return {
            "status": "Failed",
            "message": "Unknown User"
        }

    live = verify_liveness()

    if not live:

        return {
            "status": "Failed",
            "message": "Liveness Verification Failed"
        }

    mark_attendance(user_name)

    return {

        "status": "Success",

        "name": user_name,

        "liveness": "Verified",

        "attendance": "Marked"
    }