import * as chrono from 'chrono-node';

export interface DateParseResult {
  originalInput: string;
  parsedDate: string; // YYYY-MM-DD format
  isValid: boolean;
  error?: string;
}

export class DateUtils {
  private static readonly CURRENT_DATE = new Date('2025-06-24'); // Current date for the system

  /**
   * Parse natural language date input into YYYY-MM-DD format
   * @param input - Natural language date (e.g., "tomorrow", "next Wednesday")
   * @param currentDate - Current date for reference (defaults to system current date)
   * @returns Parsed date result
   */
  static parseNaturalDate(input: string, currentDate: Date = DateUtils.CURRENT_DATE): DateParseResult {
    try {
      const trimmedInput = input.trim();
      
      // If it's already in YYYY-MM-DD format, validate and return
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedInput)) {
        const date = new Date(trimmedInput);
        if (!isNaN(date.getTime()) && DateUtils.isValidFutureDate(trimmedInput, currentDate)) {
          return {
            originalInput: input,
            parsedDate: trimmedInput,
            isValid: true
          };
        } else {
          return {
            originalInput: input,
            parsedDate: trimmedInput,
            isValid: false,
            error: 'Date is in the past or invalid'
          };
        }
      }

      // Use chrono-node to parse natural language dates
      const parsed = chrono.parseDate(trimmedInput, currentDate);
      
      if (parsed && parsed > currentDate) {
        const formattedDate = parsed.toISOString().split('T')[0];
        return {
          originalInput: input,
          parsedDate: formattedDate,
          isValid: true
        };
      }

      // If parsing failed or date is not in future, try specific patterns
      const fallbackDate = DateUtils.handleSpecificPatterns(trimmedInput, currentDate);
      if (fallbackDate) {
        return {
          originalInput: input,
          parsedDate: fallbackDate,
          isValid: true
        };
      }

      // Last resort: return tomorrow
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(currentDate.getDate() + 1);
      const tomorrowFormatted = tomorrow.toISOString().split('T')[0];

      return {
        originalInput: input,
        parsedDate: tomorrowFormatted,
        isValid: true,
        error: 'Could not parse date, defaulted to tomorrow'
      };

    } catch (error) {
      // Fallback to tomorrow on any error
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(currentDate.getDate() + 1);
      const tomorrowFormatted = tomorrow.toISOString().split('T')[0];

      return {
        originalInput: input,
        parsedDate: tomorrowFormatted,
        isValid: false,
        error: `Date parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle specific date patterns that chrono-node might miss
   */
  private static handleSpecificPatterns(input: string, currentDate: Date): string | null {
    const inputLower = input.toLowerCase();
    
    // Handle "today" (not recommended for restaurant bookings)
    if (inputLower === 'today') {
      return currentDate.toISOString().split('T')[0];
    }

    // Handle "tomorrow"
    if (inputLower === 'tomorrow') {
      const tomorrow = new Date(currentDate);
      tomorrow.setDate(currentDate.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Handle day names without "next" prefix
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < dayNames.length; i++) {
      if (inputLower === dayNames[i]) {
        const targetDate = DateUtils.getNextWeekday(currentDate, i);
        return targetDate.toISOString().split('T')[0];
      }
    }

    return null;
  }

  /**
   * Get the next occurrence of a specific weekday
   */
  private static getNextWeekday(currentDate: Date, targetDay: number): Date {
    const currentDay = currentDate.getDay();
    let daysToAdd = targetDay - currentDay;
    
    // If the target day is today or in the past this week, get next week's occurrence
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    const targetDate = new Date(currentDate);
    targetDate.setDate(currentDate.getDate() + daysToAdd);
    return targetDate;
  }

  /**
   * Check if a date string represents a valid future date
   */
  static isValidFutureDate(dateString: string, currentDate: Date = DateUtils.CURRENT_DATE): boolean {
    try {
      const inputDate = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(inputDate.getTime())) {
        return false;
      }
      
      // Set current date to start of day for comparison
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);
      
      // Set input date to start of day for comparison
      const inputDateNormalized = new Date(inputDate);
      inputDateNormalized.setHours(0, 0, 0, 0);
      
      return inputDateNormalized >= today;
    } catch {
      return false;
    }
  }

  /**
   * Format a date for user-friendly display
   */
  static formatDateForDisplay(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Check if two dates are the same day
   */
  static isSameDay(date1: string, date2: string): boolean {
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    } catch {
      return false;
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  static getCurrentDate(): string {
    return DateUtils.CURRENT_DATE.toISOString().split('T')[0];
  }

  /**
   * Get tomorrow's date in YYYY-MM-DD format
   */
  static getTomorrowDate(): string {
    const tomorrow = new Date(DateUtils.CURRENT_DATE);
    tomorrow.setDate(DateUtils.CURRENT_DATE.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
}