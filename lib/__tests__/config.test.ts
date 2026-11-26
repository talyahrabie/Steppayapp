import { STEPS_PER_POINT, stepsToPoints } from '../config';

describe('stepsToPoints — the single conversion rate', () => {
  it('uses exactly 100 steps per point', () => {
    expect(STEPS_PER_POINT).toBe(100);
  });

  it('converts at the single rate with floor semantics', () => {
    expect(stepsToPoints(0)).toBe(0);
    expect(stepsToPoints(99)).toBe(0);
    expect(stepsToPoints(100)).toBe(1);
    expect(stepsToPoints(199)).toBe(1);
    expect(stepsToPoints(250)).toBe(2);
    expect(stepsToPoints(10000)).toBe(100);
    expect(stepsToPoints(123456)).toBe(1234);
  });

  it('clamps negative input to zero', () => {
    expect(stepsToPoints(-500)).toBe(0);
  });

  it('points earned between two lifetime totals is the threshold difference', () => {
    // This is exactly how AppContext.addSteps computes earnedDelta.
    const earned = (from: number, to: number) => stepsToPoints(to) - stepsToPoints(from);
    expect(earned(0, 99)).toBe(0);
    expect(earned(99, 100)).toBe(1);
    expect(earned(100, 350)).toBe(2);
    expect(earned(9950, 10050)).toBe(1);
  });
});
