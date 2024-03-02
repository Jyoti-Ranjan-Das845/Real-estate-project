import express from "express";
import dotenv from "dotenv";
import {google} from "googleapis";
import { OAuth2Client } from "google-auth-library";

dotenv.config();


const app = express();
const oauth2Client = new OAuth2Client(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, process.env.GMAIL_REDIRECT_URL);

app.get('/auth', (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    });
    res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const messages = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
      });

      const data = messages.data.messages.map(async (message) => {
        const messageDetails = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        const senderEmail = messageDetails.data.payload.headers.find(header => header.name === 'From').value;
        const senderName = senderEmail.split('<')[0].trim(); // Extract sender name from 'From' field
        const messageId = messageDetails.data.id;
        const messageSnippet = messageDetails.data.snippet;
        const messageBody = messageDetails.data.payload.parts && messageDetails.data.payload.parts[0]
        ? Buffer.from(messageDetails.data.payload.parts[0].body.data, 'base64').toString('utf-8')
        : 'No body data';  
        return {
          senderEmail,
          senderName,
          messageId,
          messageSnippet,
          messageBody,
        };
      });

      const jsonData = await Promise.all(data);
      console.log(jsonData);
      res.send(jsonData);
    }catch (error) {
        console.error('Error:', error.message);
        res.status(500).send(`Error decoding token: ${error.message}`);
    }
});

app.post('/notifications', async (req, res) => {
    // Handle push notification payload here
    console.log('Received push notification:', req.body);
    res.status(200).end();
});

app.listen(process.env.PORT, () => {
    console.log(`Server running at port :- ${process.env.PORT}`);
});