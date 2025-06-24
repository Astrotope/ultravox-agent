import { DateUtils, DateParseResult } from '../../../src/utils/dateUtils';

describe('DateUtils', () => {
  const testCurrentDate = new Date('2025-06-24'); // Tuesday

  describe('parseNaturalDate', () => {
    it('should parse "tomorrow" correctly', () => {
      const result = DateUtils.parseNaturalDate('tomorrow', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-25');
      expect(result.originalInput).toBe('tomorrow');
    });

    it('should parse "today" correctly', () => {
      const result = DateUtils.parseNaturalDate('today', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-24');
      expect(result.originalInput).toBe('today');
    });

    it('should parse day names correctly (Wednesday)', () => {
      const result = DateUtils.parseNaturalDate('Wednesday', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-25'); // Next Wednesday
    });

    it('should parse day names correctly (Friday)', () => {
      const result = DateUtils.parseNaturalDate('Friday', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-27');
    });

    it('should parse "next Friday" correctly', () => {
      const result = DateUtils.parseNaturalDate('next Friday', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      // "next Friday" means the Friday after this coming Friday
      expect(result.parsedDate).toBe('2025-07-04');
    });

    it('should parse "in 3 days" correctly', () => {
      const result = DateUtils.parseNaturalDate('in 3 days', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-27');
    });

    it('should handle already formatted dates (YYYY-MM-DD)', () => {
      const result = DateUtils.parseNaturalDate('2025-06-30', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-30');
    });

    it('should reject past dates', () => {
      const result = DateUtils.parseNaturalDate('2025-06-20', testCurrentDate); // Past date
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Date is in the past');
    });

    it('should handle invalid input gracefully', () => {
      const result = DateUtils.parseNaturalDate('invalid date string', testCurrentDate);
      
      expect(result.isValid).toBe(true); // Should fallback to tomorrow
      expect(result.parsedDate).toBe('2025-06-25'); // Tomorrow
      expect(result.error).toContain('Could not parse date');
    });

    it('should handle empty input', () => {
      const result = DateUtils.parseNaturalDate('', testCurrentDate);
      
      expect(result.isValid).toBe(true); // Should fallback to tomorrow
      expect(result.parsedDate).toBe('2025-06-25');
    });

    it('should handle whitespace input', () => {
      const result = DateUtils.parseNaturalDate('   tomorrow   ', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-25');
    });

    it('should parse "two weeks from now" correctly', () => {
      const result = DateUtils.parseNaturalDate('two weeks from now', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-07-08');
    });

    it('should parse "June 30th" correctly', () => {
      const result = DateUtils.parseNaturalDate('June 30th', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-30');
    });

    it('should handle case-insensitive input', () => {
      const result = DateUtils.parseNaturalDate('TOMORROW', testCurrentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.parsedDate).toBe('2025-06-25');
    });
  });

  describe('isValidFutureDate', () => {
    it('should return true for future dates', () => {
      expect(DateUtils.isValidFutureDate('2025-06-25', testCurrentDate)).toBe(true);
      expect(DateUtils.isValidFutureDate('2025-12-31', testCurrentDate)).toBe(true);
    });

    it('should return true for today', () => {
      expect(DateUtils.isValidFutureDate('2025-06-24', testCurrentDate)).toBe(true);
    });

    it('should return false for past dates', () => {
      expect(DateUtils.isValidFutureDate('2025-06-23', testCurrentDate)).toBe(false);
      expect(DateUtils.isValidFutureDate('2024-12-31', testCurrentDate)).toBe(false);
    });

    it('should return false for invalid dates', () => {
      expect(DateUtils.isValidFutureDate('invalid-date', testCurrentDate)).toBe(false);
      expect(DateUtils.isValidFutureDate('2025-13-45', testCurrentDate)).toBe(false);
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format dates for user-friendly display', () => {
      const formatted = DateUtils.formatDateForDisplay('2025-06-25');
      expect(formatted).toBe('Wednesday, June 25, 2025');
    });

    it('should handle invalid dates gracefully', () => {
      const formatted = DateUtils.formatDateForDisplay('invalid-date');
      expect(formatted).toBe('invalid-date');
    });
  });

  describe('isSameDay', () => {
    it('should return true for same dates', () => {
      expect(DateUtils.isSameDay('2025-06-24', '2025-06-24')).toBe(true);
    });

    it('should return false for different dates', () => {
      expect(DateUtils.isSameDay('2025-06-24', '2025-06-25')).toBe(false);
    });

    it('should handle invalid dates gracefully', () => {
      expect(DateUtils.isSameDay('invalid', '2025-06-24')).toBe(false);
    });
  });

  describe('getCurrentDate', () => {
    it('should return current date in YYYY-MM-DD format', () => {
      const currentDate = DateUtils.getCurrentDate();
      expect(currentDate).toBe('2025-06-24');
      expect(currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getTomorrowDate', () => {
    it('should return tomorrow date in YYYY-MM-DD format', () => {
      const tomorrowDate = DateUtils.getTomorrowDate();
      expect(tomorrowDate).toBe('2025-06-25');
      expect(tomorrowDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('edge cases', () => {
    it('should handle month boundaries correctly', () => {
      const endOfMonth = new Date('2025-06-30');
      const result = DateUtils.parseNaturalDate('tomorrow', endOfMonth);
      
      expect(result.parsedDate).toBe('2025-07-01');
    });

    it('should handle year boundaries correctly', () => {
      const endOfYear = new Date('2025-12-31');
      const result = DateUtils.parseNaturalDate('tomorrow', endOfYear);
      
      expect(result.parsedDate).toBe('2026-01-01');
    });

    it('should handle leap years correctly', () => {
      const leapYear = new Date('2024-02-28');
      const result = DateUtils.parseNaturalDate('tomorrow', leapYear);
      
      expect(result.parsedDate).toBe('2024-02-29');
    });
  });
});