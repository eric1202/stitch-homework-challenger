import Dexie from 'dexie';
import dexieCloud from "dexie-cloud-addon";

export const db = new Dexie('HomeworkHeroDB', { addons: [dexieCloud] });

db.version(4).stores({
    tasks: '++id, title, subject, completed, date, points, userName, [userName+date]',
    settings: 'key, value',
    rewards: '++id, title, icon, points, expiryDate, stock, userName',
    redemptionLogs: '++id, rewardTitle, spentPoints, timestamp, userName'
});

db.cloud.configure({
    databaseUrl: "https://z5dx273tz.dexie.cloud",
    requireAuth: false
});

// Handle version changes (upgrades) gracefully
db.on('versionchange', () => {
    db.close();
    window.location.reload();
});


