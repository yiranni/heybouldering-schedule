export const getDayOfWeek = (dateStr: string): number => {
  return new Date(dateStr).getDay(); // 0 = Sun, 1 = Mon, 2 = Tue...
};

export const formatDate = (date: Date): string => {
  // Use local time instead of UTC to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getWeekDays = (startDate: Date): string[] => {
  const days = [];
  // Create a new Date object to avoid mutating the input
  const date = new Date(startDate);

  // Get Monday of current week
  // JavaScript getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
  // We want to find Monday: if today is Sunday (0), go back 6 days; if Monday (1), go back 0 days
  const currentDay = date.getDay();
  const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;

  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);

  for (let i = 0; i < 7; i++) {
    days.push(formatDate(addDays(new Date(monday), i)));
  }

  return days;
};

export const getMonthDays = (date: Date): string[] => {
  const year = date.getFullYear();
  const month = date.getMonth();

  // Get first day and last day of the month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(formatDate(new Date(d)));
  }

  return days;
};
