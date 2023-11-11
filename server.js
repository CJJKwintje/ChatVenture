const express = require('express');
const { google } = require('googleapis');
const cors = require('cors'); // Importeer CORS
const app = express();
const port = 3000;

const serviceAccount = require('./chatventure-0649fca57c85.json'); // Pas het pad aan naar je service account JSON

app.use(cors()); // Activeer CORS voor alle routes
app.use(express.static('public')); // 'public' is de map waar je client-side bestanden staan

app.get('/getSheetData', async (req, res) => {
    const jwtClient = new google.auth.JWT(
        serviceAccount.client_email,
        null,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    try {
        await jwtClient.authorize();
        const sheets = google.sheets({ version: 'v4', auth: jwtClient });

        const spreadsheetId = '1S6yIEUt4vTbb66-gcUXKJB9V1OjhCrLvU6HSPFj_FYg'; // Je Spreadsheet ID
        const range = 'Blad1!A1:D10'; // Het gewenste bereik

        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        res.send(response.data.values); // Stuur de opgehaalde gegevens terug naar de client
    } catch (err) {
        console.error('Fout bij het aanroepen van de Google Sheets API:', err);
        res.status(500).send('Er is een fout opgetreden');
    }
});

app.listen(port, () => {
  console.log(`Server luistert op http://localhost:${port}`);
});
