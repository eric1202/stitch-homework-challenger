import Dexie from 'dexie';

export const db = new Dexie('HomeworkHeroDB');

// Version 6: Back to simple local DB without cloud sync
// Using numeric auto-increment IDs for simplicity
db.version(6).stores({
    tasks: '++id, title, subject, completed, date, points, userName, [userName+date]',
    settings: 'key, value',
    rewards: '++id, title, icon, points, expiryDate, stock, userName',
    redemptionLogs: '++id, rewardTitle, spentPoints, timestamp, userName'
});

// Handle version changes (upgrades) gracefully
db.on('versionchange', () => {
    db.close();
    window.location.reload();
});



