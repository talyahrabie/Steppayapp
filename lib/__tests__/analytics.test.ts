import { supabase } from '../supabase';
import {
  ANALYTICS_FLUSH_THRESHOLD,
  QueuedEvent,
  buildEventRows,
  flushAnalytics,
  getAnalyticsQueueSnapshot,
  resetAnalyticsState,
  sanitizeProps,
  setAnalyticsUserId,
  trackEvent,
} from '../analytics';

jest.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { from: jest.fn() },
}));

const mockInsert = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  resetAnalyticsState();
  (supabase.from as jest.Mock).mockReturnValue({ insert: mockInsert });
  mockInsert.mockResolvedValue({ error: null });
});

/** Let fire-and-forget flushes triggered by trackEvent settle. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('sanitizeProps', () => {
  it('keeps flat primitive props', () => {
    expect(
      sanitizeProps({ steps: 12000, category: 'quran', first: true, note: null })
    ).toEqual({ steps: 12000, category: 'quran', first: true, note: null });
  });

  it('drops PII keys case-insensitively', () => {
    expect(
      sanitizeProps({ email: 'a@b.c', Name: 'Ahmed', PHONE: '123', steps: 5 })
    ).toEqual({ steps: 5 });
  });

  it('drops nested objects and arrays', () => {
    expect(sanitizeProps({ meta: { a: 1 }, list: [1, 2], steps: 5 })).toEqual({ steps: 5 });
  });

  it('tolerates missing props', () => {
    expect(sanitizeProps(undefined)).toEqual({});
    expect(sanitizeProps(null)).toEqual({});
  });
});

describe('buildEventRows', () => {
  it('attaches the user id (or null for anonymous events)', () => {
    const events: QueuedEvent[] = [
      { event: 'app_open', props: {} },
      { event: 'media_played', props: { category: 'quran' } },
    ];
    expect(buildEventRows(events, 'user-1')).toEqual([
      { user_id: 'user-1', event: 'app_open', props: {} },
      { user_id: 'user-1', event: 'media_played', props: { category: 'quran' } },
    ]);
    expect(buildEventRows(events, null)[0].user_id).toBeNull();
  });
});

describe('queueing and flushing', () => {
  it('queues events without inserting below the threshold', async () => {
    trackEvent('app_open');
    trackEvent('session_start');
    expect(getAnalyticsQueueSnapshot()).toHaveLength(2);
    await settle();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('flush inserts the whole batch once and drains the queue', async () => {
    setAnalyticsUserId('user-9');
    trackEvent('app_open');
    trackEvent('steps_goal_reached', { steps: 10000 });
    const inserted = await flushAnalytics();
    expect(inserted).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith('analytics_events');
    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: 'user-9', event: 'app_open', props: {} },
      { user_id: 'user-9', event: 'steps_goal_reached', props: { steps: 10000 } },
    ]);
    expect(getAnalyticsQueueSnapshot()).toHaveLength(0);
  });

  it('auto-flushes when the queue reaches the threshold', async () => {
    for (let i = 0; i < ANALYTICS_FLUSH_THRESHOLD; i++) {
      trackEvent('app_open');
    }
    await settle();
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toHaveLength(ANALYTICS_FLUSH_THRESHOLD);
    expect(getAnalyticsQueueSnapshot()).toHaveLength(0);
  });

  it('drops the batch silently when the insert fails', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'table missing' } });
    trackEvent('app_open');
    trackEvent('session_start');
    await expect(flushAnalytics()).resolves.toBe(0);
    // Dropped, not retried forever: the queue is empty afterwards.
    expect(getAnalyticsQueueSnapshot()).toHaveLength(0);
  });

  it('flush on an empty queue is a no-op', async () => {
    await expect(flushAnalytics()).resolves.toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('sanitizes props at track time', async () => {
    trackEvent('reward_redeemed', { reward_id: 'r1', email: 'a@b.c' });
    await flushAnalytics();
    expect(mockInsert).toHaveBeenCalledWith([
      { user_id: null, event: 'reward_redeemed', props: { reward_id: 'r1' } },
    ]);
  });
});
