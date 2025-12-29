import Dexie from 'dexie';

export const db = new Dexie('HomeworkHeroDB');

db.version(2).stores({
    tasks: '++id, title, subject, completed, date, points',
    settings: 'key, value',
    rewards: '++id, title, icon, points, expiryDate, stock',
    redemptionLogs: '++id, rewardTitle, spentPoints, timestamp'
});

// Handle version changes (upgrades) gracefully
db.on('versionchange', () => {
    db.close();
    window.location.reload();
});
