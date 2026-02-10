import { calculateCompatibilityScore } from "../compatibility";
import { getSajuData, SajuData } from "../../saju/saju";

describe("Compatibility Domain Logic", () => {
  let testSaju1: SajuData;
  let testSaju2: SajuData;

  beforeEach(() => {
    // Create test saju data
    testSaju1 = getSajuData("1990-05-15", "14:30", true);
    testSaju2 = getSajuData("1992-08-20", "10:00", true);
  });

  describe("calculateCompatibilityScore", () => {
    it("should return a score between 0 and 100", () => {
      const result = calculateCompatibilityScore(testSaju1, testSaju2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should return a comment string", () => {
      const result = calculateCompatibilityScore(testSaju1, testSaju2);

      expect(result.comment).toBeTruthy();
      expect(typeof result.comment).toBe("string");
      expect(result.comment.length).toBeGreaterThan(0);
    });

    it("should have appropriate comments for different score ranges", () => {
      // Run multiple times to test different score ranges
      const results = Array.from({ length: 20 }, () =>
        calculateCompatibilityScore(testSaju1, testSaju2)
      );

      // At least some results should exist
      expect(results.length).toBeGreaterThan(0);

      results.forEach((result) => {
        if (result.score >= 90) {
          expect(result.comment).toContain("천생연분");
        } else if (result.score >= 80) {
          expect(result.comment).toContain("긍정적");
        } else if (result.score < 60) {
          expect(result.comment).toContain("배려");
        }
      });
    });

    it("should handle same person compatibility", () => {
      const result = calculateCompatibilityScore(testSaju1, testSaju1);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should be consistent with saju data structure", () => {
      expect(testSaju1.pillars.day.gan).toBeTruthy();
      expect(testSaju2.pillars.day.gan).toBeTruthy();

      const result = calculateCompatibilityScore(testSaju1, testSaju2);
      expect(result).toBeDefined();
    });

    it("should handle different element distributions", () => {
      // Create saju with different dates to get varied element distributions
      const saju1 = getSajuData("1985-01-01", "00:00", true);
      const saju2 = getSajuData("1995-12-31", "23:59", true);

      const result = calculateCompatibilityScore(saju1, saju2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.comment).toBeTruthy();
    });

    it("should work with lunar calendar saju data", () => {
      const lunarSaju1 = getSajuData("1990-05-15", "14:30", false);
      const lunarSaju2 = getSajuData("1992-08-20", "10:00", false);

      const result = calculateCompatibilityScore(lunarSaju1, lunarSaju2);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe("Edge Cases", () => {
    it("should handle early morning times", () => {
      const earlyMorning1 = getSajuData("1990-01-01", "00:30", true);
      const earlyMorning2 = getSajuData("1992-01-01", "01:30", true);

      const result = calculateCompatibilityScore(earlyMorning1, earlyMorning2);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("should handle late night times", () => {
      const lateNight1 = getSajuData("1990-01-01", "23:30", true);
      const lateNight2 = getSajuData("1992-01-01", "23:45", true);

      const result = calculateCompatibilityScore(lateNight1, lateNight2);

      expect(result).toBeDefined();
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should handle leap year dates", () => {
      const leapYear1 = getSajuData("1992-02-29", "12:00", true);
      const leapYear2 = getSajuData("2000-02-29", "12:00", true);

      const result = calculateCompatibilityScore(leapYear1, leapYear2);

      expect(result).toBeDefined();
    });
  });
});
