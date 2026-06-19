/**
 * Helper tarikh untuk kuliah (week/day code).
 * Rule: week = ceil(day_of_month / 7); day 0-6 = Ahad-Sabtu.
 */

/**
 * Get week code (w1-w4) from date
 * @param {Date} date
 * @returns {string} w1, w2, w3, w4
 */
function getWeekCode(date) {
  const day = date.getDate();
  const week = Math.ceil(day / 7);
  return `w${week}`;
}

/**
 * Get day code (h0-h6) from date. 0=Ahad, 6=Sabtu.
 * @param {Date} date
 * @returns {string} h0-h6
 */
function getDayCode(date) {
  const dayIndex = date.getDay();
  return `h${dayIndex}`;
}

/**
 * Calculate date from week code and day code within a given year/month.
 * Week ranges: w1=1-7, w2=8-14, w3=15-21, w4=22-28
 * @param {string} weekCode - w1, w2, w3, w4
 * @param {string} dayCode - h0-h6
 * @param {number} year
 * @param {number} month - 0-based (0=Jan, 11=Dec)
 * @returns {Date}
 */
function calculateDateFromCodes(weekCode, dayCode, year, month) {
  const weekNum = parseInt(weekCode.replace('w', ''), 10);
  const dayOfWeek = parseInt(dayCode.replace('h', ''), 10);
  const weekStartDay = (weekNum - 1) * 7 + 1;
  const weekEndDay = Math.min(weekNum * 7, new Date(year, month + 1, 0).getDate());
  for (let day = weekStartDay; day <= weekEndDay; day++) {
    const testDate = new Date(year, month, day);
    if (testDate.getDay() === dayOfWeek) {
      return testDate;
    }
  }
  return new Date(year, month, weekStartDay);
}

module.exports = {
  getWeekCode,
  getDayCode,
  calculateDateFromCodes
};
