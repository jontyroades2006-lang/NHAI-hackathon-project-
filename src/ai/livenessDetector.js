import { EAR_BLINK_THRESHOLD, HEAD_TURN_THRESHOLD } from '../utils/constants';
 
// Eye landmark indices (MediaPipe Face Mesh)
const LEFT_EYE  = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const NOSE_TIP  = 1;
const FACE_OVAL = [10, 338, 297, 332, 284];
 
// Euclidean distance between two landmarks
const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
 
// Eye Aspect Ratio — detects blink when < threshold
const calcEAR = (landmarks, indices) => {
  const p = indices.map(i => landmarks[i]);
  const v1 = dist(p[1], p[5]);
  const v2 = dist(p[2], p[4]);
  const h  = dist(p[0], p[3]);
  return (v1 + v2) / (2.0 * h);
};
 
class LivenessDetector {
  constructor() {
    this.reset();
  }
 
  reset() {
    this.blinkVerified = false;
    this.headVerified  = false;
    this.blinkDetected = false;
    this.lastEAR       = 0.3;
    this.frameCount    = 0;
  }
 
  // Process a set of face landmarks from MediaPipe
  // Returns { blinkVerified, headVerified, lastEAR, verified }
  processLandmarks(landmarks) {
    if (!landmarks || landmarks.length === 0) {
      return {
        blinkVerified: this.blinkVerified,
        headVerified:  this.headVerified,
        lastEAR:       this.lastEAR,
        faceDetected:  false,
        verified:      false,
      };
    }
 
    this.frameCount++;
 
    // ── Blink Detection ──────────────────────────────────────────────────────
    const leftEAR  = calcEAR(landmarks, LEFT_EYE);
    const rightEAR = calcEAR(landmarks, RIGHT_EYE);
    const ear      = (leftEAR + rightEAR) / 2.0;
    this.lastEAR   = ear;
 
    if (ear < EAR_BLINK_THRESHOLD) {
      if (!this.blinkDetected) {
        this.blinkDetected = true;
        this.blinkVerified = true;
      }
    } else {
      this.blinkDetected = false;
    }
 
    // ── Head Turn Detection ──────────────────────────────────────────────────
    const nose    = landmarks[NOSE_TIP];
    const noseX   = nose.x; // normalised 0-1
 
    // If nose moves significantly left or right from centre
    if (noseX < (0.5 - HEAD_TURN_THRESHOLD) || noseX > (0.5 + HEAD_TURN_THRESHOLD)) {
      this.headVerified = true;
    }
 
    const verified = this.blinkVerified && this.headVerified;
 
    return {
      blinkVerified: this.blinkVerified,
      headVerified:  this.headVerified,
      lastEAR:       ear,
      faceDetected:  true,
      verified,
    };
  }
}
 
export default new LivenessDetector();