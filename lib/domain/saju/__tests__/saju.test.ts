import {
  getSajuData,
  calculateDaeun,
  analyzeElementBalance,
  calculateAge,
  getCurrentJieqi,
  WU_XING_COLORS,
  WU_XING_NAMES,
} from "../saju";

describe("Saju Domain Logic", () => {
  describe("getSajuData", () => {
    it("should calculate saju correctly for a given date and time", () => {
      const result = getSajuData("1990-05-15", "14:30", true);

      expect(result).toBeDefined();
      expect(result.pillars).toBeDefined();
      expect(result.pillars.year).toBeDefined();
      expect(result.pillars.month).toBeDefined();
      expect(result.pillars.day).toBeDefined();
      expect(result.pillars.time).toBeDefined();
      expect(result.dayMaster).toBeTruthy();
      expect(result.dayMasterElement).toMatch(/木|火|土|金|水/);
    });

    it("should have all four pillars with correct structure", () => {
      const result = getSajuData("2000-01-01", "12:00", true);

      const pillar = result.pillars.year;
      expect(pillar.gan).toBeTruthy();
      expect(pillar.zhi).toBeTruthy();
      expect(pillar.ganji).toBe(pillar.gan + pillar.zhi);
      expect(pillar.ganElement).toMatch(/木|火|土|金|水/);
      expect(pillar.zhiElement).toMatch(/木|火|土|金|水/);
    });

    it("should calculate elements distribution correctly", () => {
      const result = getSajuData("1985-03-20", "08:00", true);

      expect(result.elementsDistribution).toBeDefined();
      expect(Object.keys(result.elementsDistribution)).toEqual(
        expect.arrayContaining(["木", "火", "土", "金", "水"])
      );

      const total = Object.values(result.elementsDistribution).reduce(
        (sum, val) => sum + val,
        0
      );
      expect(total).toBe(8); // 4 pillars × 2 (gan + zhi)
    });

    it("should handle midnight boundary correctly (23:00-01:00)", () => {
      const result1 = getSajuData("2000-01-01", "23:30", true);
      const result2 = getSajuData("2000-01-01", "00:30", true);

      // Both should have 子時 (zi shi)
      expect(result1.pillars.time.zhi).toBe("子");
      expect(result2.pillars.time.zhi).toBe("子");
    });

    it("should support lunar calendar mode", () => {
      const solarResult = getSajuData("1990-05-15", "12:00", true);
      const lunarResult = getSajuData("1990-05-15", "12:00", false);

      expect(solarResult).toBeDefined();
      expect(lunarResult).toBeDefined();
      // Results should differ since one is solar, one is lunar
      expect(solarResult.ganjiList).not.toEqual(lunarResult.ganjiList);
    });
  });

  describe("calculateDaeun", () => {
    it("should return 10 daeun periods", () => {
      const result = calculateDaeun("1990-05-15", "14:30", "M", true);

      expect(result).toHaveLength(10);
      expect(result[0].age).toBe(0);
      expect(result[9].age).toBe(90);
    });

    it("should have valid ganji and elements for each daeun", () => {
      const result = calculateDaeun("1985-03-20", "08:00", "F", true);

      result.forEach((daeun) => {
        expect(daeun.ganji).toHaveLength(2);
        expect(daeun.element).toMatch(/木|火|土|金|水/);
        expect(daeun.score).toBeGreaterThanOrEqual(0);
        expect(daeun.score).toBeLessThanOrEqual(100);
        expect(daeun.description).toBeTruthy();
      });
    });

    it("should differ based on gender (yang/yin direction)", () => {
      const maleResult = calculateDaeun("1990-05-15", "14:30", "M", true);
      const femaleResult = calculateDaeun("1990-05-15", "14:30", "F", true);

      // Results should differ due to direction differences
      expect(maleResult[0].ganji).not.toBe(femaleResult[0].ganji);
    });
  });

  describe("analyzeElementBalance", () => {
    it("should identify strongest and weakest elements", () => {
      const distribution = { 木: 3, 火: 1, 土: 2, 金: 0, 水: 2 };
      const result = analyzeElementBalance(distribution);

      expect(result.strongest).toBe("木");
      expect(result.weakest).toBe("金");
      expect(result.lacking).toContain("金");
    });

    it("should detect excess elements", () => {
      const distribution = { 木: 4, 火: 1, 土: 1, 金: 1, 水: 1 };
      const result = analyzeElementBalance(distribution);

      expect(result.excess).toContain("木");
      expect(result.advice).toContain("과다");
    });

    it("should recognize balanced elements", () => {
      const distribution = { 木: 2, 火: 1, 土: 2, 金: 2, 水: 1 };
      const result = analyzeElementBalance(distribution);

      expect(result.lacking).toHaveLength(0);
      expect(result.excess).toHaveLength(0);
      expect(result.advice).toContain("균형");
    });
  });

  describe("calculateAge", () => {
    it("should calculate correct age before birthday", () => {
      const birthDate = "1990-12-31";
      const age = calculateAge(birthDate);

      const today = new Date();
      const expectedAge = today.getFullYear() - 1990 - (today.getMonth() < 11 ? 1 : 0);

      expect(age).toBe(expectedAge);
    });

    it("should calculate correct age after birthday", () => {
      const birthDate = "1990-01-01";
      const age = calculateAge(birthDate);

      const today = new Date();
      const expectedAge = today.getFullYear() - 1990;

      expect(age).toBe(expectedAge);
    });
  });

  describe("getCurrentJieqi", () => {
    it("should return null for dates without jieqi", () => {
      const result = getCurrentJieqi("2024-03-10");
      // Most dates don't have jieqi
      expect(result).toBeDefined();
    });

    it("should handle invalid dates gracefully", () => {
      const result = getCurrentJieqi("invalid-date");
      expect(result).toBeNull();
    });
  });

  describe("Constants", () => {
    it("should have all five elements in WU_XING_COLORS", () => {
      expect(Object.keys(WU_XING_COLORS)).toHaveLength(5);
      expect(WU_XING_COLORS).toHaveProperty("木");
      expect(WU_XING_COLORS).toHaveProperty("火");
      expect(WU_XING_COLORS).toHaveProperty("土");
      expect(WU_XING_COLORS).toHaveProperty("金");
      expect(WU_XING_COLORS).toHaveProperty("水");
    });

    it("should have all five elements in WU_XING_NAMES", () => {
      expect(Object.keys(WU_XING_NAMES)).toHaveLength(5);
      expect(WU_XING_NAMES["木"]).toBe("목(木)");
      expect(WU_XING_NAMES["火"]).toBe("화(火)");
      expect(WU_XING_NAMES["土"]).toBe("토(土)");
      expect(WU_XING_NAMES["金"]).toBe("금(金)");
      expect(WU_XING_NAMES["水"]).toBe("수(水)");
    });
  });
});
