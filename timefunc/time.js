const fs = require("fs");
const LAST_DATE_PATH = 'lastDate.json';

const readLastDate = () => {
    if (fs.existsSync(LAST_DATE_PATH)) {
        const dateStr = JSON.parse(fs.readFileSync(LAST_DATE_PATH));
        if (!dateStr) return ['', '']; // If dateStr is empty or null, return an array with empty strings
        
        const [datePart, timePart] = dateStr.split(' '); // Split the date string into date and time parts
        console.log([datePart, timePart]);
        return [datePart, timePart];
    } else {
        console.log(`Last date file (${LAST_DATE_PATH}) not found. Using default date.`);
        return ['', '']; // Default date
    }
    
}

module.exports = { readLastDate };
