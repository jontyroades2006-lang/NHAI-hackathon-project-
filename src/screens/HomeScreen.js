import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Dimensions
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { COLORS, CAPTURE_TARGET } from '../utils/constants';
import livenessDetector from '../ai/livenessDetector';
import { generateEmbedding, findMatch } from '../ai/faceRecognition';
import { getEmployeeEmbeddings } from '../database/employeeService';
import { markAttendance } from '../database/attendanceService';
import StatusCard from '../components/StatusCard';
 
const { width } = Dimensions.get('window');
 
const STEPS = [
  { id: 'blink',   icon: '👁',  label: 'BLINK',       sub: 'Close both eyes briefly' },
  { id: 'head',    icon: '↔',   label: 'HEAD TURN',   sub: 'Turn left or right' },
  { id: 'recog',   icon: '🧠',  label: 'RECOGNITION', sub: 'Face matching' },
  { id: 'attend',  icon: '✅',  label: 'ATTENDANCE',  sub: 'Record saved' },
];
 
export default function HomeScreen() {
  const cameraRef  = useRef(null);
  const intervalRef = useRef(null);
 
  const [hasPermission, setHasPermission]   = useState(null);
  const [cameraActive, setCameraActive]     = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [completed, setCompleted]           = useState(false);
  const [stepsDone, setStepsDone]           = useState({});
  const [statusMsg, setStatusMsg]           = useState('Press START to begin');
  const [statusType, setStatusType]         = useState('');
  const [result, setResult]                 = useState(null);
  const [earValue, setEarValue]             = useState(0.3);
 
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);
 
  const startCheck = () => {
    livenessDetector.reset();
    setStepsDone({});
    setResult(null);
    setCompleted(false);
    setCameraActive(true);
    setStatusMsg('👁 Blink your eyes  ↔ Turn your head');
    setStatusType('active');
 
    // Process frames every 100ms
    intervalRef.current = setInterval(processFrame, 100);
  };
 
  const processFrame = async () => {
    if (!cameraRef.current || processing || completed) return;
    setProcessing(true);
 
    try {
      // Capture a frame
      const photo = await cameraRef.current.takePictureAsync({
        quality:          0.5,
        base64:           false,
        skipProcessing:   true,
      });
 
      // For liveness: use simplified landmark detection
      // In production integrate react-native-vision-camera + TFLite
      const mockLandmarks = generateMockLandmarks(earValue);
      const livenessResult = livenessDetector.processLandmarks(mockLandmarks);
 
      setEarValue(livenessResult.lastEAR);
 
      if (livenessResult.blinkVerified) {
        setStepsDone(prev => ({ ...prev, blink: true }));
      }
      if (livenessResult.headVerified) {
        setStepsDone(prev => ({ ...prev, head: true }));
      }
 
      // Update status
      if (!livenessResult.blinkVerified) {
        setStatusMsg('👁 Please blink your eyes');
      } else if (!livenessResult.headVerified) {
        setStatusMsg('↔ Turn your head left or right');
      }
 
      // Both liveness checks passed → run face recognition
      if (livenessResult.verified && !completed) {
        clearInterval(intervalRef.current);
        setStepsDone(prev => ({ ...prev, blink: true, head: true }));
        setStatusMsg('🧠 Recognising face...');
 
        await runFaceRecognition(photo.uri);
      }
    } catch (e) {
      console.warn('Frame error:', e);
    }
 
    setProcessing(false);
  };
 
  const runFaceRecognition = async (imageUri) => {
    try {
      setStepsDone(prev => ({ ...prev, recog: true }));
      const employees = await getEmployeeEmbeddings();
 
      if (employees.length === 0) {
        setResult({ status: 'failed', title: 'NO EMPLOYEES', name: 'NOT REGISTERED', meta: 'Register employees first' });
        setStatusMsg('No employees registered', 'danger');
        setCompleted(true);
        setCameraActive(false);
        return;
      }
 
      const embedding = await generateEmbedding(imageUri);
      const match     = findMatch(embedding, employees);
 
      if (match) {
        const attendResult = await markAttendance(match.employee_id, match.name);
        setStepsDone(prev => ({ ...prev, recog: true, attend: true }));
        setCompleted(true);
        setCameraActive(false);
 
        if (attendResult.status === 'already_marked') {
          setResult({
            status: 'warn',
            title:  'ALREADY MARKED',
            name:   match.name.toUpperCase(),
            meta:   `Attendance already marked today · ${match.confidence}% match`
          });
          setStatusMsg('Already marked today');
          setStatusType('warn');
        } else {
          setResult({
            status: 'success',
            title:  'ATTENDANCE MARKED',
            name:   match.name.toUpperCase(),
            meta:   `VERIFIED · ${new Date().toLocaleTimeString()} · ${match.confidence}% match`
          });
          setStatusMsg('✓ Attendance Marked!');
          setStatusType('success');
        }
      } else {
        setCompleted(true);
        setCameraActive(false);
        setResult({
          status: 'failed',
          title:  'NOT RECOGNISED',
          name:   'UNKNOWN',
          meta:   'Face not found in database — register first'
        });
        setStatusMsg('Face not recognised');
        setStatusType('danger');
      }
    } catch (e) {
      console.error('Recognition error:', e);
      setStatusMsg('Recognition error');
      setStatusType('danger');
    }
  };
 
  // Mock landmarks for demo — replace with real MediaPipe in production
  const frameCountRef = useRef(0);
  const generateMockLandmarks = (currentEAR) => {
    frameCountRef.current++;
    const f = frameCountRef.current;
    const landmarks = Array(468).fill(null).map((_, i) => ({ x: 0.5, y: 0.5, z: 0 }));
 
    // Simulate blink after 15 frames
    const ear = f > 15 && f < 20 ? 0.15 : 0.3;
 
    // Simulate head turn after 30 frames
    const noseX = f > 30 ? 0.3 : 0.5;
 
    // Set eye landmarks for EAR calculation
    [33, 160, 158, 133, 153, 144].forEach((idx, i) => {
      landmarks[idx] = { x: 0.3 + i * 0.02, y: 0.4 + (i % 2 === 0 ? 0 : ear * 0.1), z: 0 };
    });
    [362, 385, 387, 263, 373, 380].forEach((idx, i) => {
      landmarks[idx] = { x: 0.6 + i * 0.02, y: 0.4 + (i % 2 === 0 ? 0 : ear * 0.1), z: 0 };
    });
 
    landmarks[1] = { x: noseX, y: 0.5, z: 0 };
    return landmarks;
  };
 
  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    livenessDetector.reset();
    frameCountRef.current = 0;
    setCameraActive(false);
    setCompleted(false);
    setStepsDone({});
    setResult(null);
    setStatusMsg('Press START to begin');
    setStatusType('');
    setEarValue(0.3);
  };
 
  if (hasPermission === null) return <View style={styles.container}><Text style={styles.msg}>Requesting camera...</Text></View>;
  if (hasPermission === false) return <View style={styles.container}><Text style={styles.msg}>Camera permission denied</Text></View>;
 
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
 
      {/* Camera */}
      <View style={styles.cameraWrap}>
        {cameraActive ? (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={CameraType.front}
            ratio="4:3"
          />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.cameraHint}>Camera will open when you start</Text>
          </View>
        )}
        {/* Corner decorations */}
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
 
      {/* EAR Meter */}
      <View style={styles.earRow}>
        <Text style={styles.earLabel}>EAR</Text>
        <View style={styles.earTrack}>
          <View style={[styles.earFill, {
            width: `${Math.min(100, (earValue / 0.4) * 100)}%`,
            backgroundColor: earValue < 0.22 ? COLORS.warn : COLORS.accent
          }]} />
        </View>
      </View>
 
      {/* Steps */}
      <View style={styles.stepsCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.dot, { backgroundColor: COLORS.accent2 }]} />
          <Text style={styles.cardHeaderText}>VERIFICATION STEPS</Text>
        </View>
        {STEPS.map(step => (
          <View key={step.id} style={[
            styles.stepItem,
            stepsDone[step.id] && styles.stepDone
          ]}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <View style={styles.stepText}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepSub}>{step.sub}</Text>
            </View>
            {stepsDone[step.id] && <Text style={styles.checkmark}>✓</Text>}
          </View>
        ))}
      </View>
 
      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={[styles.statusText, statusType === 'success' && { color: COLORS.accent2 }, statusType === 'danger' && { color: COLORS.danger }, statusType === 'warn' && { color: COLORS.warn }, statusType === 'active' && { color: COLORS.accent }]}>
          {statusMsg}
        </Text>
      </View>
 
      {/* Result */}
      {result && <StatusCard status={result.status} title={result.title} name={result.name} meta={result.meta} />}
 
      {/* Buttons */}
      {!cameraActive && !completed && (
        <TouchableOpacity style={styles.btnPrimary} onPress={startCheck}>
          <Text style={styles.btnText}>▶  START CHECK</Text>
        </TouchableOpacity>
      )}
      {completed && (
        <TouchableOpacity style={styles.btnRed} onPress={reset}>
          <Text style={[styles.btnText, { color: COLORS.white }]}>↺  RETRY</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
 
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 16, paddingBottom: 32 },
  msg:        { color: COLORS.text, textAlign: 'center', marginTop: 40 },
  cameraWrap: { width: '100%', aspectRatio: 4/3, backgroundColor: '#000', borderRadius: 4, overflow: 'hidden', marginBottom: 8, position: 'relative' },
  camera:     { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050810' },
  cameraIcon: { fontSize: 48, marginBottom: 12 },
  cameraHint: { color: COLORS.dim, fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 },
  corner:     { position: 'absolute', width: 18, height: 18, borderColor: COLORS.accent, borderStyle: 'solid' },
  tl:         { top: 8,  left: 8,  borderTopWidth: 2, borderLeftWidth: 2 },
  tr:         { top: 8,  right: 8, borderTopWidth: 2, borderRightWidth: 2 },
  bl:         { bottom: 8, left: 8,  borderBottomWidth: 2, borderLeftWidth: 2 },
  br:         { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  earRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  earLabel:   { color: COLORS.dim, fontFamily: 'monospace', fontSize: 10, width: 28 },
  earTrack:   { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  earFill:    { height: '100%', borderRadius: 2 },
  stepsCard:  { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(0,0,0,0.2)' },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  cardHeaderText: { fontFamily: 'monospace', fontSize: 11, color: COLORS.dim, letterSpacing: 2 },
  stepItem:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(30,45,80,0.4)' },
  stepDone:   { backgroundColor: 'rgba(0,255,157,0.05)' },
  stepIcon:   { fontSize: 20, width: 28, textAlign: 'center' },
  stepText:   { flex: 1 },
  stepLabel:  { color: COLORS.white, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  stepSub:    { color: COLORS.dim, fontSize: 10, fontFamily: 'monospace' },
  checkmark:  { color: COLORS.accent2, fontSize: 16, fontWeight: '700' },
  statusCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 14, alignItems: 'center' },
  statusText: { fontFamily: 'monospace', fontSize: 12, color: COLORS.dim, letterSpacing: 1, textAlign: 'center' },
  btnPrimary: { backgroundColor: COLORS.accent, padding: 14, borderRadius: 3, alignItems: 'center', marginBottom: 12 },
  btnRed:     { backgroundColor: COLORS.danger, padding: 14, borderRadius: 3, alignItems: 'center', marginBottom: 12 },
  btnText:    { color: COLORS.bg, fontWeight: '700', fontSize: 14, letterSpacing: 3 },
});