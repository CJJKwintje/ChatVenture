const { GoogleSpreadsheet } = require('google-spreadsheet');

exports.handler = async (event, context) => {
  const country = event.queryStringParameters.country;
  try {
    const doc = new GoogleSpreadsheet('1S6yIEUt4vTbb66-gcUXKJB9V1OjhCrLvU6HSPFj_FYg');
    const creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    await doc.useServiceAccountAuth(creds);

    await doc.loadInfo(); 
    const sheet = doc.sheetsByTitle['Reisaanbod']; // Gebruik de exacte naam van het tabblad
    const rows = await sheet.getRows();

    // Filter de rijen op basis van het land in kolom A
    const filteredRows = rows.filter(row => row._rawData[0] === country);

    return {
      statusCode: 200,
      body: JSON.stringify(filteredRows)
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};
