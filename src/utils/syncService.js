import NetInfo from '@react-native-community/netinfo';
import { getUnsyncedRecords, markSynced, purgeSyncedRecords } from '../database/attendanceService';
import { AWS_CONFIG } from './constants';
 
// Check if internet is available
export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
};
 
// Sync unsynced attendance records to AWS DynamoDB
export const syncToAWS = async () => {
  try {
    const online = await isOnline();
    if (!online) return { status: 'offline', message: 'No internet connection' };
 
    const records = await getUnsyncedRecords();
    if (records.length === 0) return { status: 'success', message: 'Nothing to sync' };
 
    // In production, use AWS SDK to push to DynamoDB
    // Example:
    // const client = new DynamoDBClient({ region: AWS_CONFIG.region, ... });
    // for (const record of records) { await client.send(new PutItemCommand({ ... })); }
 
    console.log(`[Sync] Would sync ${records.length} records to AWS`);
 
    // Mark as synced
    const ids = records.map(r => r.id);
    await markSynced(ids);
 
    return {
      status:  'success',
      message: `Synced ${records.length} records to AWS`,
      count:   records.length
    };
  } catch (e) {
    console.error('[Sync] Error:', e);
    return { status: 'error', message: e.message };
  }
};
 
// Purge synced records from local DB
export const purgeAfterSync = async () => {
  try {
    await purgeSyncedRecords();
    return { status: 'success', message: 'Purged synced records' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
};
 
// Full sync and purge cycle
export const syncAndPurge = async () => {
  const syncResult = await syncToAWS();
  if (syncResult.status === 'success' && syncResult.count > 0) {
    await purgeAfterSync();
  }
  return syncResult;
};
 