import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';
 
const StatusCard = ({ status, title, name, meta }) => {
  const isSuccess = status === 'success';
  const isFailed  = status === 'failed';
  const isWarn    = status === 'warn';
 
  const borderColor = isSuccess ? COLORS.accent2 : isFailed ? COLORS.danger : isWarn ? COLORS.warn : COLORS.border;
  const headerBg    = isSuccess ? 'rgba(0,255,157,0.08)' : isFailed ? 'rgba(255,61,90,0.08)' : isWarn ? 'rgba(255,179,0,0.08)' : 'transparent';
  const headerColor = isSuccess ? COLORS.accent2 : isFailed ? COLORS.danger : isWarn ? COLORS.warn : COLORS.dim;
  const icon        = isSuccess ? '✓' : isFailed ? '✗' : '●';
 
  return (
    <View style={[styles.card, { borderColor }]}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: borderColor }]}>
        <Text style={[styles.icon, { color: headerColor }]}>{icon}</Text>
        <Text style={[styles.title, { color: headerColor }]}>{title}</Text>
      </View>
      <View style={styles.body}>
        {name ? <Text style={styles.name}>{name}</Text> : null}
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>
    </View>
  );
};
 
const styles = StyleSheet.create({
  card: {
    borderWidth:   1,
    borderRadius:  4,
    overflow:      'hidden',
    marginBottom:  14,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            8,
    padding:        10,
    borderBottomWidth: 1,
  },
  icon:  { fontSize: 14, fontWeight: '700' },
  title: { fontSize: 12, letterSpacing: 2, fontFamily: 'monospace' },
  body:  { padding: 14 },
  name:  { fontSize: 20, fontWeight: '700', color: COLORS.white, letterSpacing: 2, marginBottom: 4 },
  meta:  { fontSize: 11, color: COLORS.dim, fontFamily: 'monospace', letterSpacing: 1 },
});
 
export default StatusCard;
