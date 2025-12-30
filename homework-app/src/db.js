import Dexie from 'dexie';
import dexieCloud from "dexie-cloud-addon";

export const db = new Dexie('HomeworkHeroDB', { addons: [dexieCloud] });

db.version(2).stores({
    tasks: '@++id, title, subject, completed, date, points',
    settings: '@key, value',
    rewards: '@++id, title, icon, points, expiryDate, stock',
    redemptionLogs: '@++id, rewardTitle, spentPoints, timestamp'
});

db.cloud.configure({
    databaseUrl: "https://z5dx273tz.dexie.cloud",
    requireAuth: true
});

// Handle version changes (upgrades) gracefully
db.on('versionchange', () => {
    db.close();
    window.location.reload();
});


