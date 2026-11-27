import {
  REMINDER_HOUR,
  decideReminderAction,
  isFirstGoalCrossingToday,
  nextReminderDate,
  shouldDeliverGoalNotification,
} from '../notificationLogic';

describe('nextReminderDate', () => {
  it('returns today at the reminder hour when it is still ahead', () => {
    const now = new Date(2026, 10, 27, 9, 30, 0);
    const next = nextReminderDate(now);
    expect(next.getDate()).toBe(27);
    expect(next.getHours()).toBe(REMINDER_HOUR);
    expect(next.getMinutes()).toBe(0);
  });

  it('rolls to tomorrow once the reminder time has passed', () => {
    const now = new Date(2026, 10, 27, 21, 5, 0);
    const next = nextReminderDate(now);
    expect(next.getDate()).toBe(28);
    expect(next.getHours()).toBe(REMINDER_HOUR);
  });

  it('rolls to tomorrow at exactly the reminder time', () => {
    const now = new Date(2026, 10, 27, REMINDER_HOUR, 0, 0);
    const next = nextReminderDate(now);
    expect(next.getDate()).toBe(28);
  });

  it('honours a custom hour/minute', () => {
    const now = new Date(2026, 0, 1, 6, 0, 0);
    const next = nextReminderDate(now, 7, 45);
    expect(next.getHours()).toBe(7);
    expect(next.getMinutes()).toBe(45);
    expect(next.getDate()).toBe(1);
  });
});

describe('decideReminderAction', () => {
  it('cancels when the setting is off, whatever the permission', () => {
    expect(decideReminderAction({ enabled: false, permissionGranted: true })).toBe('cancel');
    expect(decideReminderAction({ enabled: false, permissionGranted: false })).toBe('cancel');
  });

  it('schedules when enabled and granted', () => {
    expect(decideReminderAction({ enabled: true, permissionGranted: true })).toBe('schedule');
  });

  it('does nothing when enabled but permission is missing', () => {
    expect(decideReminderAction({ enabled: true, permissionGranted: false })).toBe('none');
  });
});

describe('isFirstGoalCrossingToday', () => {
  const base = { goal: 10000, lastFiredDateKey: null as string | null, today: '2026-11-27' };

  it('is false below the goal', () => {
    expect(isFirstGoalCrossingToday({ ...base, todaySteps: 9999 })).toBe(false);
  });

  it('is true the first time the goal is reached today', () => {
    expect(isFirstGoalCrossingToday({ ...base, todaySteps: 10000 })).toBe(true);
    expect(isFirstGoalCrossingToday({ ...base, todaySteps: 12500 })).toBe(true);
  });

  it('is false when it already fired today (no spam on later updates)', () => {
    expect(
      isFirstGoalCrossingToday({ ...base, todaySteps: 15000, lastFiredDateKey: '2026-11-27' })
    ).toBe(false);
  });

  it('is true again on a new day even if it fired yesterday', () => {
    expect(
      isFirstGoalCrossingToday({ ...base, todaySteps: 10000, lastFiredDateKey: '2026-11-26' })
    ).toBe(true);
  });

  it('is false for a non-positive goal', () => {
    expect(isFirstGoalCrossingToday({ ...base, goal: 0, todaySteps: 5000 })).toBe(false);
  });
});

describe('shouldDeliverGoalNotification', () => {
  it('requires crossing + setting + permission together', () => {
    expect(
      shouldDeliverGoalNotification({ isCrossing: true, enabled: true, permissionGranted: true })
    ).toBe(true);
    expect(
      shouldDeliverGoalNotification({ isCrossing: true, enabled: false, permissionGranted: true })
    ).toBe(false);
    expect(
      shouldDeliverGoalNotification({ isCrossing: true, enabled: true, permissionGranted: false })
    ).toBe(false);
    expect(
      shouldDeliverGoalNotification({ isCrossing: false, enabled: true, permissionGranted: true })
    ).toBe(false);
  });
});
