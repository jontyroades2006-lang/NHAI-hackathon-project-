from fastapi import FastAPI, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
 
import sqlite3
import shutil
import os
import cv2
import numpy as np
 
from recognition.image_recognition import recognize_image
from database.attendance_services import mark_attendance
from database.employee_services import register_employee, get_all_employees
 
app = FastAPI()
 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
 
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
 
 
# ── Health ─────────────────────────────────────────────────────────────────────
 
@app.get("/")
def home():
    return {"message": "NHAI Authentication API Running"}
 
 
# ── Register Employee ──────────────────────────────────────────────────────────
 
@app.post("/register-user")
async def register_user(
    name:        str        = Form(...),
    employee_id: str        = Form(...),
    file:        UploadFile = None
):
    if not file:
        return {"status": "failed", "message": "No image uploaded"}
 
    file_path = os.path.join(UPLOAD_DIR, file.filename)
 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
 
    success, message = register_employee(name, employee_id, file_path)
 
    if success:
        return {"status": "success", "message": message}
 
    return {"status": "failed", "message": message}
 
 
# ── Get All Employees ──────────────────────────────────────────────────────────
 
@app.get("/employees")
def employees():
    return get_all_employees()
 
 
# ── Verify Image (identity only, no attendance) ────────────────────────────────
 
@app.post("/verify-image")
async def verify_image(file: UploadFile):
 
    file_path = os.path.join(UPLOAD_DIR, file.filename)
 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
 
    user = recognize_image(file_path)
 
    if user:
        return {"status": "success", "name": user}
 
    return {"status": "failed", "message": "Unknown User"}
 
 
# ── Mark Attendance (image upload) ────────────────────────────────────────────
 
@app.post("/mark-attendance")
async def mark_user_attendance(file: UploadFile):
 
    file_path = os.path.join(UPLOAD_DIR, file.filename)
 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
 
    user = recognize_image(file_path)
 
    if user:
        mark_attendance(user)
        return {
            "status": "success",
            "message": f"Attendance Marked For {user}"
        }
 
    return {"status": "failed", "message": "Unknown User"}
 
 
# ── Get Attendance ─────────────────────────────────────────────────────────────
 
@app.get("/attendance")
def get_attendance():
 
    conn   = sqlite3.connect("attendance.db")
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM attendance")
    rows = cursor.fetchall()
    conn.close()
 
    return rows
 
 
# ── WebSocket: Liveness → then auto mark attendance ───────────────────────────
 
@app.websocket("/ws/liveness")
async def liveness_websocket(websocket: WebSocket):
    await websocket.accept()
 
    from liveness.liveness_verifier import verify_liveness
    import liveness.liveness_verifier as lv
 
    # Reset state for this session
    lv.blink_verified = False
    lv.head_verified  = False
    lv.blink_detected = False
 
    try:
        while True:
            data  = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
 
            if frame is None:
                await websocket.send_json({"error": "Could not decode frame"})
                continue
 
            result = verify_liveness(frame)
 
            response = {
                "blink_verified": bool(lv.blink_verified),
                "head_verified":  bool(lv.head_verified),
                "ear":            float(getattr(lv, "_last_ear", 0.3)),
                "face_detected":  True,
                "status":         "verified" if result else "checking"
            }
 
            # Once liveness is verified, also run face recognition on this frame
            if result:
                # Save the frame as a temp file for recognize_image
                temp_path = os.path.join(UPLOAD_DIR, "liveness_capture.jpg")
                cv2.imwrite(temp_path, frame)
 
                user = recognize_image(temp_path)
 
                if user:
                    mark_attendance(user)
                    response["user"]            = user
                    response["attendance"]      = "marked"
                    response["attendance_msg"]  = f"Attendance Marked For {user}"
                else:
                    response["user"]            = None
                    response["attendance"]      = "unknown"
                    response["attendance_msg"]  = "Face not recognised — please register first"
 
            await websocket.send_json(response)
 
    except WebSocketDisconnect:
        print("Liveness WebSocket disconnected")
    except Exception as e:
        print(f"Liveness WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
 
 
# ── WebSocket: Live Face Registration ─────────────────────────────────────────
 
@app.websocket("/ws/register")
async def register_websocket(websocket: WebSocket):
    await websocket.accept()
 
    face_detector = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
 
    # Receive employee info first as JSON
    try:
        info        = await websocket.receive_json()
        name        = info.get("name", "").strip()
        employee_id = info.get("employee_id", "").strip()
 
        if not name or not employee_id:
            await websocket.send_json({"error": "Name and Employee ID are required"})
            await websocket.close()
            return
 
        # Check if already registered
        from database.employee_services import employee_exists, create_employee_table
        create_employee_table()
        if employee_exists(employee_id):
            await websocket.send_json({"error": f"Employee ID {employee_id} already registered"})
            await websocket.close()
            return
 
        # Create dataset folder
        base_dir     = os.path.dirname(os.path.abspath(__file__))
        dataset_path = os.path.join(base_dir, "..", "dataset", name)
        os.makedirs(dataset_path, exist_ok=True)
 
        image_count  = 0
        TARGET       = 20
 
        await websocket.send_json({
            "status":  "ready",
            "message": f"Starting capture for {name}",
            "count":   0,
            "target":  TARGET
        })
 
        # Stream frames and capture faces
        while image_count < TARGET:
            data  = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
 
            if frame is None:
                continue
 
            gray  = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_detector.detectMultiScale(
                gray, scaleFactor=1.3, minNeighbors=5
            )
 
            face_found = len(faces) > 0
 
            if face_found:
                for (x, y, w, h) in faces:
                    face_crop = frame[y:y+h, x:x+w]
                    face_crop = cv2.resize(face_crop, (400, 400))
                    image_count += 1
                    img_path = os.path.join(dataset_path, f"{image_count}.jpg")
                    cv2.imwrite(img_path, face_crop)
                    break  # one face per frame
 
            await websocket.send_json({
                "status":     "capturing",
                "face_found": face_found,
                "count":      image_count,
                "target":     TARGET
            })
 
        # All 20 images captured — save to DB
        import sqlite3 as _sql
        conn   = _sql.connect("attendance.db")
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO employees (employee_id, name) VALUES (?, ?)",
            (employee_id, name)
        )
        conn.commit()
        conn.close()
 
        await websocket.send_json({
            "status":  "done",
            "message": f"{name} registered successfully with {image_count} face images",
            "count":   image_count
        })
 
    except WebSocketDisconnect:
        print("Register WebSocket disconnected")
    except Exception as e:
        print(f"Register WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
 
 
# ── Legacy check-liveness (kept for compatibility) ────────────────────────────
 
@app.post("/check-liveness")
async def check_liveness(file: UploadFile):
 
    file_path = os.path.join(UPLOAD_DIR, file.filename)
 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
 
    frame = cv2.imread(file_path)
 
    if frame is None:
        return {"status": "failed", "message": "Could not read image"}
 
    from liveness.liveness_verifier import verify_liveness
    result = verify_liveness(frame)
 
    if result:
        return {"status": "success", "message": "Live Person Detected"}
 
    return {"status": "failed", "message": "Spoof Attack Detected"}