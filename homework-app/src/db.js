import Dexie from 'dexie';
import dexieCloud from "dexie-cloud-addon";
import { nanoid } from 'nanoid';

export const db = new Dexie('HomeworkHeroDB', { addons: [dexieCloud] });

// Version 5: Use string-based IDs for Dexie Cloud compatibility
db.version(5).stores({
    tasks: 'id, title, subject, completed, date, points, userName, [userName+date]',
    settings: 'key, value',
    rewards: 'id, title, icon, points, expiryDate, stock, userName',
    redemptionLogs: 'id, rewardTitle, spentPoints, timestamp, userName'
});

db.cloud.configure({
    databaseUrl: "https://z5dx273tz.dexie.cloud",
    requireAuth: false
});

// Auto-generate string IDs for new records
db.tasks.hook('creating', (primKey, obj) => {
    if (!obj.id) obj.id = nanoid();
});

db.rewards.hook('creating', (primKey, obj) => {
    if (!obj.id) obj.id = nanoid();
});

db.redemptionLogs.hook('creating', (primKey, obj) => {
    if (!obj.id) obj.id = nanoid();
});

// Handle version changes (upgrades) gracefully
db.on('versionchange', () => {
    db.close();
    window.location.reload();
});


