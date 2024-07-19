const Airtable = require('airtable');

exports.handler = async (event) => {
const { userPreferences, originalChatGPTResponse, newChatGPTResponse, selectedOffer, numberOfOffers, selectedCountry, ipAddress } = JSON.parse(event.body);
const base = new Airtable({ apiKey: process.env.AIRTABLE_PAT }).base('appqZjV7d8qBftQ1x');

try {
    await base('User_input').create([
      {
        fields: {
          'Vertreklocatie': userPreferences.vertreklocatie,
          'TypeVakantie': userPreferences.typeVakantie,
          'Transport': userPreferences.transport,
          'ExtraVoorkeuren': userPreferences.extraVoorkeuren,
          'ChatGPTResponse': originalChatGPTResponse,
          'AantalReisaanbod': numberOfOffers,
          'GekozenLand': selectedCountry,
          'AanvullendeVoorkeuren': additionalPreferences, // Nieuw veld
          'NieuweChatGPTResponse': newChatGPTResponse, // Nieuw veld
          'IsRegenerated': isRegenerated // Nieuw veld om te markeren of de response opnieuw is gegenereerd
          'IPAdres': ipAddress
        }
      }
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data successfully saved to Airtable' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error saving the data to Airtable' })
    };
  }
};