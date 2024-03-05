const fs = require('fs');
const LAST_DATE_PATH = 'lastDate.json';

const readLastDate = () => {
    if (fs.existsSync(LAST_DATE_PATH)) {
        return JSON.parse(fs.readFileSync(LAST_DATE_PATH));
    } else {
        console.log(`Last date file (${LAST_DATE_PATH}) not found. Using default date.`);
        return null; // Default date
    }
}

module.exports = {readLastDate};