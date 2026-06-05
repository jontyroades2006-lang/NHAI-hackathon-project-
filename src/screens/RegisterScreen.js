import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Dimensions
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import { COLORS, CAPTURE_TARGET } from '../utils/constants';
import { generateEmbedding, averageEmbeddings } from '../ai/faceRecognition';
import { registerEmployee, saveFaceImage } from '../database/employeeService';
import StatusCard from '../components/StatusCard';
 
const { width } = Dimensions.get('window');
const THUMB_SIZE = (width - 32 - 9 * 4) / 10;
 
export default function RegisterScreen() {
  const cameraRef = useRef(null);
  const intervalRef = useRef(null);
 
  const [hasPermission, setHasPermission] = useState(null);
  const [name, setName]                   = useState('');
  const [empId, setEmpId]                 = useState('');
  const [cameraActive, setCameraActive]   = useState(false);
  const [capturing, setCapturing]         = useState(false);
  const [captureCount, setCaptureCount]   = useState(0);
  const [done, setDone]                   = useState(false);
  const [statusMsg, setStatusMsg]         = useState('Fill details then press START');
  const [statusType, setStatusType]       = useState('');
  const [result, setResult]               = useState(null);
  const [thumbs, setThumbs]               = useState(Array(CAPTURE_TARGET).fill(null));
  const embeddingsRef = useRef([]);
  const countRef      = useRef(0);
 
  const requestCamera = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };
 
  const startRegistration = async () => {
    if (!name.trim() || !empId.trim()) {
      Alert.alert('Missing Info', 'Please enter both Name and Employee ID');
      return;
    }
    const granted = hasPermission ?? await requestCamera();
    if (!granted) { Alert.alert('Camera required', 'Please allow camera access'); return; }
 
    embeddingsRef.current = [];
    countRef.current      = 0;
    setCaptureCount(0);
    setThumbs(Array(CAPTURE_TARGET).fill(null));
    setDone(false);
    setResult(null);
    setCameraActive(true);
    setCapturing(true);
    setStatusMsg('📷 Look at camera — capturing face...');
    setStatusType('active');
 
    intervalRef.current = setInterval(captureFrame, 200);
  };
 
  const captureFrame = async () => {
    if (!cameraRef.current || countRef.current >= CAPTURE_TARGET) return;
 
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6, base64: false, skipProcessing: true,
      });
 
      // Save to app directory
      const dir  = FileSystem.documentDirectory + `faces/${empId}/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = dir + `${countRef.current + 1}.jpg`;
      await FileSystem.moveAsync({ from: photo.uri, to: dest });
 
      // Generate embedding
      const emb = await generateEmbedding(dest);
      if (emb) embeddingsRef.current.push(emb);
 
      countRef.current += 1;
      const count = countRef.current;
      setCaptureCount(count);
 
      // Update thumbnail
      setThumbs(prev => {
        const next = [...prev];
        next[count - 1] = dest;
        return next;
      });
 
      setStatusMsg(`📷 Capturing — ${count}/${CAPTURE_TARGET}`);
 
      if (count >= CAPTURE_TARGET) {
        clearInterval(intervalRef.current);
        await finishRegistration();
      }
    } catch (e) {
      console.warn('Capture error:', e);
    }
  };
 
  const finishRegistration = async () => {
    setCapturing(false);
    setStatusMsg('💾 Saving to database...');
 
    try {
      const avgEmbedding = averageEmbeddings(embeddingsRef.current);
      await registerEmployee(empId.trim(), name.trim(), avgEmbedding);
 
      setDone(true);
      setCameraActive(false);
      setResult({
        status: 'success',
        title:  'REGISTERED',
        name:   name.toUpperCase(),
        meta:   `${empId} · ${CAPTURE_TARGET} face images captured`
      });
      setStatusMsg('✓ Registration complete!');
      setStatusType('success');
    } catch (e) {
      setResult({
        status: 'failed',
        title:  'FAILED',
        name:   'ERROR',
        meta:   e.message
      });
      setStatusMsg(e.message);
      setStatusType('danger');
      setCameraActive(false);
    }
  };
 
  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCameraActive(false);
    setCapturing(false);
    setDone(false);
    setCaptureCount(0);
    setThumbs(Array(CAPTURE_TARGET).fill(null));
    setResult(null);
    setName('');
    setEmpId('');
    setStatusMsg('Fill details then press START');
    setStatusType('');
    embeddingsRef.current = [];
    countRef.current      = 0;
  };
 
  const progress = (captureCount / CAPTURE_TARGET) * 100;
 
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
 
      {/* Camera */}
      <View style={styles.cameraWrap}>
        {cameraActive ? (
          <Camera ref={cameraRef} style={styles.camera} type={CameraType.front} ratio="4:3" />
        ) : (
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.cameraHint}>Camera opens when you start</Text>
          </View>
        )}
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
        {done && (
          <View style={styles.doneOverlay}>
            <Text style={styles.doneText}>✓ REGISTERED</Text>
          </View>
        )}
      </View>
 
      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>FACE CAPTURE PROGRESS</Text>
          <Text style={styles.progressCount}>{captureCount} / {CAPTURE_TARGET}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
 
      {/* Thumbnail Grid */}
      <View style={styles.thumbGrid}>
        {thumbs.map((uri, i) => (
          <View key={i} style={[styles.thumb, uri && styles.thumbCaptured]} />
        ))}
      </View>
 
      {/* Form */}
      <View style={styles.formCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.dot, { backgroundColor: COLORS.accent2 }]} />
          <Text style={styles.cardHeaderText}>EMPLOYEE DETAILS</Text>
        </View>
        <View style={styles.formBody}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Employee full name"
            placeholderTextColor={COLORS.dim}
            editable={!capturing}
          />
          <Text style={styles.label}>EMPLOYEE ID</Text>
          <TextInput
            style={styles.input}
            value={empId}
            onChangeText={setEmpId}
            placeholder="e.g. EMP-00123"
            placeholderTextColor={COLORS.dim}
            editable={!capturing}
          />
        </View>
      </View>
 
      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={[styles.statusText,
          statusType === 'success' && { color: COLORS.accent2 },
          statusType === 'danger'  && { color: COLORS.danger },
          statusType === 'active'  && { color: COLORS.accent },
        ]}>
          {statusMsg}
        </Text>
      </View>
 
      {result && <StatusCard status={result.status} title={result.title} name={result.name} meta={result.meta} />}
 
      {!capturing && !done && (
        <TouchableOpacity style={styles.btnPrimary} onPress={startRegistration}>
          <Text style={styles.btnText}>▶  START REGISTRATION</Text>
        </TouchableOpacity>
      )}
      {done && (
        <TouchableOpacity style={styles.btnGreen} onPress={reset}>
          <Text style={styles.btnText}>➕  REGISTER ANOTHER</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
 
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 16, paddingBottom: 32 },
  cameraWrap: { width: '100%', aspectRatio: 4/3, backgroundColor: '#000', borderRadius: 4, overflow: 'hidden', marginBottom: 8, position: 'relative' },
  camera:     { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050810' },
  cameraIcon: { fontSize: 40, marginBottom: 10 },
  cameraHint: { color: COLORS.dim, fontFamily: 'monospace', fontSize: 11 },
  corner:     { position: 'absolute', width: 18, height: 18, borderColor: COLORS.accent, borderStyle: 'solid' },
  tl: { top: 8,    left: 8,  borderTopWidth: 2,    borderLeftWidth: 2 },
  tr: { top: 8,    right: 8, borderTopWidth: 2,    borderRightWidth: 2 },
  bl: { bottom: 8, left: 8,  borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 },
  doneOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,255,157,0.1)', alignItems: 'center', justifyContent: 'center' },
  doneText:    { color: COLORS.accent2, fontSize: 24, fontWeight: '700', letterSpacing: 4 },
  progressRow: { marginBottom: 10 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel:  { fontFamily: 'monospace', fontSize: 10, color: COLORS.dim, letterSpacing: 1 },
  progressCount:  { fontFamily: 'monospace', fontSize: 10, color: COLORS.accent },
  progressTrack:  { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: COLORS.accent2, borderRadius: 4 },
  thumbGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 14 },
  thumb:      { width: THUMB_SIZE, height: THUMB_SIZE, backgroundColor: COLORS.border, borderRadius: 2, borderWidth: 1, borderColor: COLORS.border },
  thumbCaptured: { borderColor: COLORS.accent2, backgroundColor: 'rgba(0,255,157,0.15)' },
  formCard:   { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: 'rgba(0,0,0,0.2)' },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  cardHeaderText: { fontFamily: 'monospace', fontSize: 11, color: COLORS.dim, letterSpacing: 2 },
  formBody:   { padding: 16 },
  label:      { fontFamily: 'monospace', fontSize: 10, color: COLORS.dim, letterSpacing: 2, marginBottom: 5 },
  input:      { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, padding: 11, color: COLORS.white, fontSize: 15, letterSpacing: 1, marginBottom: 14 },
  statusCard: { backgroundColor: COLORS.panel, borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 14, marginBottom: 14, alignItems: 'center' },
  statusText: { fontFamily: 'monospace', fontSize: 12, color: COLORS.dim, letterSpacing: 1, textAlign: 'center' },
  btnPrimary: { backgroundColor: COLORS.accent, padding: 14, borderRadius: 3, alignItems: 'center', marginBottom: 12 },
  btnGreen:   { backgroundColor: COLORS.accent2, padding: 14, borderRadius: 3, alignItems: 'center', marginBottom: 12 },
  btnText:    { color: COLORS.bg, fontWeight: '700', fontSize: 14, letterSpacing: 3 },
});