require('dotenv').config();

const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  console.log("Function start: Fetching data based on country");

  const country = event.queryStringParameters.country;
  console.log("Received country parameter:", country);

  try {
    console.log("Initializing GoogleSpreadsheet");
    const doc = new GoogleSpreadsheet('1S6yIEUt4vTbb66-gcUXKJB9V1OjhCrLvU6HSPFj_FYg');

    console.log("Parsing credentials");
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log("Parsed credentials:", creds);
    console.log("google-spreadsheet module version:", require('google-spreadsheet/package.json').version);

    console.log("Attempting to authenticate with useServiceAccountAuth");
    await doc.useServiceAccountAuth(creds);
    console.log("Authenticated successfully");

    console.log("Loading document info");
    await doc.loadInfo();
    console.log("Document info loaded");

    console.log("Accessing sheet by title: 'Reisaanbod'");
    const sheet = doc.sheetsByTitle['Reisaanbod']; // Gebruik de exacte naam van het tabblad
    console.log("Sheet accessed:", sheet.title);

    console.log("Fetching rows");
    const rows = await sheet.getRows();
    console.log(`Fetched ${rows.length} rows`);

    console.log(`Filtering rows based on country: ${country}`);
    const filteredRows = rows.filter(row => row._rawData[0] === country);
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



