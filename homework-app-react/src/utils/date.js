import { format, parseISO } from 'date-fns';

export const getTodayDateString = () => format(new Date(), 'yyyy-MM-dd');
export const formatDateDisplay = (dateStr) => format(parseISO(dateStr), 'MMM d, yyyy');
