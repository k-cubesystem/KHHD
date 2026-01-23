const { Solar } = require('lunar-javascript');

const solar = Solar.fromYmdHms(2024, 1, 1, 0, 0, 0);
const lunar = solar.getLunar();
const eightChar = lunar.getEightChar();

console.log("YearGan:", eightChar.getYearGan());
console.log("YearZhi:", eightChar.getYearZhi());
