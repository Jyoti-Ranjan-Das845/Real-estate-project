import { promises as fs } from 'fs';

export const updateFetchTime = async () => {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Adding 1 because getMonth() returns 0-based index
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const formatTime = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

    try {
        await fs.appendFile('./last_fetch_time.txt', formatTime + '\n');
        console.log(`Time appended to file successfully - ${formatTime}`);
    } catch (error) {
        console.error('Error appending time to file:', error);
    }

}

export const getLastTime = async () => {
    try {
        const data = await fs.readFile('./last_fetch_time.txt', 'utf-8');
        const lines = data.trim().split('\n');
        const lastLine = lines[lines.length - 1];
    
        return lastLine;
    } catch (error) {
        console.error('Error reading last fetch time:', error);
        return null;
    }
};

// getLastTime();
