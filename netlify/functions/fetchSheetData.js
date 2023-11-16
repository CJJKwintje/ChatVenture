require('dotenv').config();
const { google } = require('googleapis');

exports.handler = async (event, context) => {
    console.log("Function start: Fetching data based on country and reistype");
    const country = event.queryStringParameters.country;
    const reistype = event.queryStringParameters.reistype; // Nieuwe parameter voor reistype
    console.log("Received country parameter:", country, " and reistype parameter:", reistype);

    try {
        const sheets = google.sheets({
            version: 'v4',
            auth: process.env.GOOGLE_API_KEY // Zorg ervoor dat je API-sleutel hier wordt geladen
        });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: '1S6yIEUt4vTbb66-gcUXKJB9V1OjhCrLvU6HSPFj_FYg', // Vervang met jouw Spreadsheet ID
            range: 'Reisaanbod', // Vervang met jouw specifieke range/tabbladnaam in de Spreadsheet
        });

        const rows = response.data.values;
        // Aanname dat het land in de eerste kolom en reistype in de tweede kolom staat
        const filteredRows = rows.filter(row => row[0] === country && row[1] === reistype); 
        console.log(`Filtered rows count: ${filteredRows.length}`);

        return {
            statusCode: 200,
            body: JSON.stringify(filteredRows)
        };
    } catch (error) {
        console.error("Error in function:", error);
        return { statusCode: 500, body: error.toString() };
    }
};
