import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TextInput, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../utils/constants';
import { getAllEmployees } from '../database/employeeService';
 
export default function EmployeesScreen() {
  const [employees, setEmployees] = useState([]);
  const [filtered, setFiltered]   = useState([]);
  const [search, setSearch]       = useState('');
  const [refreshing, setRefreshing] = useState(false);
 
  const load = async () => {
    const data = await getAllEmployees();
    setEmployees(data);
    setFiltered(data);
  };
 
  useFocusEffect(useCallback(() => { load(); }, []));
 
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
 
  const onSearch = (text) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.employee_id.toLowerCase().includes(q)
    ));
  };
 
  const renderItem = ({ item, index }) => (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.empId}>{item.employee_id}</Text>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>#{item.id}</Text>
      </View>
    </View>
  );
 
  return (
    <View style={styles.container}>
 
      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} REGISTERED EMPLOYEE{filtered.length !== 1 ? 'S' : ''}
        </Text>
      </View>
 
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchBox}
          value={search}
          onChangeText={onSearch}
          placeholder="Search by name or ID..."
          placeholderTextColor={COLORS.dim}
        />
      </View>
 
      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: 44 }]}> </Text>
        <Text style={[styles.th, { flex: 1 }]}>NAME</Text>
        <Text style={[styles.th, { width: 90 }]}>EMP ID</Text>
      </View>
 
      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>NO EMPLOYEES REGISTERED</Text>
            <Text style={styles.emptyHint}>Go to Register tab to add employees</Text>
          </View>
        }
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  countRow:    { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  countText:   { fontFamily: 'monospace', fontSize: 11, color: COLORS.accent, letterSpacing: 2 },
  searchRow:   { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox:   { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 3, padding: 10, color: COLORS.white, fontSize: 13 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  th:          { fontFamily: 'monospace', fontSize: 10, color: COLORS.dim, letterSpacing: 2 },
  row:         { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(30,45,80,0.5)' },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,200,255,0.15)', borderWidth: 1, borderColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText:  { color: COLORS.accent, fontWeight: '700', fontSize: 16 },
  info:        { flex: 1 },
  name:        { color: COLORS.white, fontSize: 15, fontWeight: '600', letterSpacing: 1 },
  empId:       { color: COLORS.accent2, fontFamily: 'monospace', fontSize: 11, marginTop: 2 },
  badge:       { backgroundColor: 'rgba(0,200,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,200,255,0.15)', borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:   { fontFamily: 'monospace', fontSize: 11, color: COLORS.accent },
  empty:       { padding: 48, alignItems: 'center' },
  emptyText:   { color: COLORS.dim, fontFamily: 'monospace', fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  emptyHint:   { color: COLORS.dim, fontSize: 12 },
});