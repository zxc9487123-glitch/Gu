export type CalendarCursor = {
  year: number;
  monthIndex: number;
};

export type CalendarDay = {
  date: string;
  day: number;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatCalendarDate(year: number, monthIndex: number, day: number) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

export function datePartsFromInput(value: string, fallback = new Date()): CalendarCursor {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const candidate = new Date(year, monthIndex, day);
    if (candidate.getFullYear() === year && candidate.getMonth() === monthIndex && candidate.getDate() === day) {
      return { year, monthIndex };
    }
  }

  return { year: fallback.getFullYear(), monthIndex: fallback.getMonth() };
}

export function shiftCalendarMonth(cursor: CalendarCursor, offset: number): CalendarCursor {
  const shifted = new Date(cursor.year, cursor.monthIndex + offset, 1);
  return { year: shifted.getFullYear(), monthIndex: shifted.getMonth() };
}

export function calendarMonthDays(cursor: CalendarCursor): Array<CalendarDay | null> {
  const firstWeekday = new Date(cursor.year, cursor.monthIndex, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.monthIndex + 1, 0).getDate();
  const cells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: cells }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth
      ? { day, date: formatCalendarDate(cursor.year, cursor.monthIndex, day) }
      : null;
  });
}
