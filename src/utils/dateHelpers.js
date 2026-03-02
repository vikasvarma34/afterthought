/**
 * Date helper utilities for todo list
 */

export const formatDueDate = (dateStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if it's today
  if (isToday(dateStr)) {
    return '📌 Today';
  }
  
  // Check if it's overdue
  if (isOverdue(dateStr)) {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `🔴 ${formatter.format(date)}`;
  }
  
  // Format as "Month Day"
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return formatter.format(date);
};

export const isToday = (dateStr) => {
  if (!dateStr) return false;
  
  const date = new Date(dateStr + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateUTC = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayUTC = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  
  return dateUTC.getTime() === todayUTC.getTime();
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  
  const date = new Date(dateStr + 'T00:00:00Z');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateUTC = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayUTC = new Date(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  
  return dateUTC.getTime() < todayUTC.getTime();
};

export const getDayOfWeek = (dateStr) => {
  const date = new Date(dateStr + 'T00:00:00Z');
  return date.getUTCDay();
};
