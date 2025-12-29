import Dexie from 'dexie';

export const db = new Dexie('HomeworkHeroDB');

db.version(1).stores({
    tasks: '++id, title, subject, completed, date, points', // Indexed by date for easy daily/weekly queries
    settings: 'key, value'
});
