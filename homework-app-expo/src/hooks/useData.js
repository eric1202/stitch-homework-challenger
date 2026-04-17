import { useState, useEffect } from 'react';
import { db, liveQuery } from '../services/db';

export function useData() {
  const [totalPoints, setTotalPoints] = useState(0);
  const [userName, setUserName] = useState('Hero');

  useEffect(() => {
    const sub = liveQuery(async () => {
      try {
        const allTasks = await db.tasks.toArray();
        let spent = 0;
        try {
          const spentPointsLogs = await db.redemptionLogs.toArray();
          spent = spentPointsLogs.reduce((sum, log) => sum + (log.spentPoints || log.spent_points || 0), 0);
        } catch (e) {}
        
        const earned = allTasks
          .filter(task => task.completed)
          .reduce((sum, task) => sum + (Number(task.points) || 0), 0);
        return earned - spent;
      } catch (err) {
        return 0;
      }
    }).subscribe(value => {
      setTotalPoints(value);
    });

    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = liveQuery(() => db.settings.toArray())
      .subscribe(results => {
        const nameSetting = results.find(s => s.key === 'userName');
        if (nameSetting) setUserName(nameSetting.value);
      });
    return () => sub.unsubscribe();
  }, []);

  return { totalPoints, userName };
}
