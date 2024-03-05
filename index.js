const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const cron = require('node-cron');
const axios = require('axios');
const {readLastDate} = require("./timefunc/time.js");

const app = express();
const PORT = 3000;

const credentials = require('./credentials.json');
const TOKEN_PATH = 'token.json';
const LAST_DATE_PATH = 'lastDate.json';

let oauth2Client;

// Load or create the OAuth2 client
if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oauth2Client = new OAuth2Client(
        credentials.installed.client_id,
        credentials.installed.client_secret,
        credentials.installed.redirect_uris,
    );
    oauth2Client.setCredentials(tokens);
} else {
    console.error('OAuth2 token not found. Please authenticate using /auth endpoint.');
    process.exit(1);
}

app.get("/",(req,res)=>{
    res.send("Hello, you are welcome!");
});

app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'online',
        scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Store the refresh token and initialize the last date
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

        res.send('Authentication successful! You can now use the stored refresh token.');
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send(`Error decoding token: ${error.message}`);
    }
});

cron.schedule('15 23 * * *', () => {
    console.log('Running scheduled task at 6 am...');
    fetchData();
});

const endpointUrl = "http://localhost:3000/get-gmail-data";
async function fetchData() {
    try {
        const response = await axios.get(endpointUrl);
        console.log('Response from the endpoint:', response.data);
    } catch (error) {
        console.error('Error calling the endpoint:', error.message);
    }
}


// Load or create the last date
let lastStoredDateTime = readLastDate();


app.get('/get-gmail-data', async (req, res) => {
    try {
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Calculate the date range dynamically based on the lastDate

        let startDateInSeconds;

        if (lastStoredDateTime && lastStoredDateTime.length === 2) {
            const [datePart, timePart] = lastStoredDateTime;
            const [hours, minutes, seconds] = timePart.split(':').map(Number);

            console.log(new Date().getTimezoneOffset() * 60000);

            const secTimeZone = (new Date().getTimezoneOffset() * 60000)/1000;
            startDateInSeconds = Math.floor(new Date(lastStoredDateTime[0]).getTime() / 1000) + secTimeZone + (hours*60*60) + (minutes*60) + (seconds);
            console.log(startDateInSeconds);
        } else {
            // Handle the case when no last stored date is available
            startDateInSeconds = null;
        }
        console.log(startDateInSeconds);
        // console.log(`cH :- ${checkTime} , act :- ${startDateInSeconds}`);
        // const currentDateInSeconds = Math.floor(Date.now() / 1000);
        let msgParam = {
            userId: 'me',
        };

        if(!startDateInSeconds){
            msgParam.maxResults = 5;
            
        }else{
            msgParam.q = `after:${startDateInSeconds}`;
        }

        const messages = await gmail.users.messages.list(msgParam);
        const result=[];
        const messageList = messages.data.messages;

        if(!messageList){

            const currentDate = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000));
            lastStoredDateTime = currentDate.toISOString();
            const formattedLastDate = lastStoredDateTime.slice(0, 19).replace('T', ' ');
        
            // Now you can save the formatted date and time
            fs.writeFileSync(LAST_DATE_PATH, `"${formattedLastDate}"`);

            res.send("No new mails received!");
        }else{

        for (const message of messageList) {
            const messageDetails = await gmail.users.messages.get({
                userId: 'me',
                id: message.id,
            });
            const messageBody = messageDetails.data.payload.parts && messageDetails.data.payload.parts[0].body && messageDetails.data.payload.parts[0].body.data;
            const decodedMessageBody = messageBody ? 
    Buffer.from(messageDetails.data.payload.parts[0].body.data, 'base64').toString('utf-8').replace(/[\r\n]+/g, '') :
    '';

        
            const messageSnippet = messageDetails.data.snippet;
            
            // Extract sender's email address
            const senderEmail = messageDetails.data.payload.headers.find(header => header.name === 'From').value;
        
            // Extract sender's name (if available)
            const senderNameHeader = messageDetails.data.payload.headers.find(header => header.name === 'From');
            const senderName = senderNameHeader ? senderNameHeader.value.split('<')[0].trim() : '';
            const messageInfo = {
                messageId: message.id,
                senderEmail: senderEmail,
                senderName: senderName,
                snippet: messageSnippet,
                body: decodedMessageBody,
                
            };
            result.push(messageInfo);
        }
        
            const currentDate = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000));
            lastStoredDateTime = currentDate.toISOString();
            const formattedLastDate = lastStoredDateTime.slice(0, 19).replace('T', ' ');
        
            // Now you can save the formatted date and time
            fs.writeFileSync(LAST_DATE_PATH, `"${formattedLastDate}"`);


        res.json(result);
    }
    } catch (error) {
        console.error('Error fetching Gmail data:', error.message);
        res.status(500).send(`Error fetching Gmail data: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});