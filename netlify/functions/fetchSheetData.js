const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  console.log("Function is running"); // Bevestigen dat de functie wordt aangeroepen

  const country = event.queryStringParameters.country;
  console.log("Country parameter:", country); // Log de ontvangen 'country' parameter

  try {
    const doc = new GoogleSpreadsheet('1S6yIEUt4vTbb66-gcUXKJB9V1OjhCrLvU6HSPFj_FYg');
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log("Credentials loaded:", creds); // Controleer of de credentials correct geladen zijn

    await doc.useServiceAccountAuth(creds);
    console.log("Authenticated successfully"); // Controleer of de authenticatie slaagt

    await doc.loadInfo(); 
    const sheet = doc.sheetsByTitle['Reisaanbod'];
    const rows = await sheet.getRows();

    const filteredRows = rows.filter(row => row._rawData[0] === country);
    console.log("Filtered rows:", filteredRows); // Log de gefilterde rijen

    return {
      statusCode: 200,
      body: JSON.stringify(filteredRows)
    };
  } catch (error) {
    console.error("Error in function:", error); // Log eventuele fouten
    return { statusCode: 500, body: error.toString() };
  }
};

