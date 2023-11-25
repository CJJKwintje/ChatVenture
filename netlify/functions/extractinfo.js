const { parse } = require('querystring');

// Voorbeeldlijsten met reistypes en landen
const reistypes = ["fly-drive", "stedentrip", "wintersport", "winteravontuur", "Rondreis", "treinreis", "camperreis"];
const landen = ["Nederland", "Spanje", "Italië", "Frankrijk", "Zwitserland", "Duitsland", "België", "Jordanië", "Bulgarije", "Estland", "Hongarije", "Litouwen", "Oostenrijk", "Polen", "Portugal", "Servië", "Tjechië", "Verenigd Koninkrijk", "Zweden", "Noorwegen", "Zweden", "IJsland", "Finland", "Scandinavië", "Canada", "Noord-Ierland", "Ierland", "Faeröer Eilanden", "de Verenigde Staten", "Schotland", "Groot Brittannië", "Kroatië", "Albanië", "Argentinië", "Australië", "Borneo", "Costa Rica", "Griekenland", "Indonesië", "Japan", "Myanmar", "Nieuw-Zeeland", "Thailand", "Zuid-Afrika"];

// Functie om informatie te extraheren
function extractInfo(tekst) {
  const reistypeRegex = new RegExp(reistypes.join("|"), "i");
  const landenRegex = new RegExp(landen.join("|"), "i");

  const gevondenReistypes = tekst.match(reistypeRegex) || [];
  const gevondenLanden = tekst.match(landenRegex) || [];

  return { reistypes: gevondenReistypes, landen: gevondenLanden };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const tekst = data.tekst;

    if (tekst) {
      const resultaat = extractInfo(tekst);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultaat)
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Geen tekst meegegeven" })
      };
    }
  } catch (error) {
    return { statusCode: 500, body: `Server Error: ${error.message}` };
  }
};
