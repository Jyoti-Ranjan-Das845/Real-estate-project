import express from "express";
import dotenv from "dotenv";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { PubSub } from "@google-cloud/pubsub";

dotenv.config();

const PORT = 3000;
const GMAIL_CLIENT_ID = "92499555227-bgav9kouetj259h41ghpofehno5gu272.apps.googleusercontent.com";
const GMAIL_CLIENT_SECRET = "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";
const GMAIL_REDIRECT_URL = "https://743d-2405-201-a007-cef6-14df-6efc-8822-135e.ngrok-free.app/auth/callback";

const app = express();
const pubSubClient = new PubSub();
const oauth2Client = new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URL);

// Body parser middleware
app.use(express.json());

async function createNotificationChannel() {
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const res = await gmail.users.watch({
        userId: 'me',
        requestBody: {
            topicName: 'projects/numeric-trilogy-416016/topics/real-estate-project',
            labelIds: ['INBOX']
        }
    });
    console.log(res.data);
}

app.get("/", (req, res) => {
    res.send("Hi you are in!");
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

        await createNotificationChannel();

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
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send(`Error decoding token: ${error.message}`);
    }
});

app.post("/notifications", async (req, res) => {
    try {
        // Parse the incoming notification
        const notification = req.body;

        // Process the notification (e.g., log it)
        console.log("Received notification:", notification);

        // Acknowledge the notification to Pub/Sub
        res.status(204).send();
    } catch (error) {
        console.error("Error handling notification:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server running at port: ${PORT}`);
});
