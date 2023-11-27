let loaderAnimation;
let chatGPTResponseReceived = false;
let googleSheetsDataReceived = false;
let geselecteerdReisaanbod = []; // Toegevoegd om het geselecteerde reisaanbod op te slaan
let aantalReisaanbod = 0; // Toegevoegd om het aantal reisaanbod bij te houden
let selectedCountry = '';
let lastIndexShown = 0;
let itemsPerPage = 5; // Stel hier het gewenste aantal items per 'pagina' in

function setupLoaderAnimation() {
  loaderAnimation = lottie.loadAnimation({
    container: document.getElementById('loader'),
    renderer: 'svg',
    loop: true,
    autoplay: false,
    path: '/assets/loader.json'
  });
}

function fetchWithTimeout(resource, options, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(resource, {
    ...options,
    signal: controller.signal
  })
    .then(response => {
      clearTimeout(id);
      return response;
    })
    .catch(error => {
      clearTimeout(id);
      throw error;
    });
}

// Functie om de lengte van de beschrijving te beperken
function beperkTekstLengte(tekst, maxLengte) {
  return tekst.length > maxLengte ? tekst.substring(0, maxLengte) + '...' : tekst;
}


async function queryGoogleSheetsWithCountry(country, reistype) {
    const url = `/.netlify/functions/fetchSheetData?country=${encodeURIComponent(country)}&reistype=${encodeURIComponent(reistype)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Fout bij het ophalen van gegevens van Google Sheets');
        }

        const data = await response.json();
        googleSheetsDataReceived = true;
        if (data && data.length > 0) {
            reisaanbodBeschikbaar = true;
            geselecteerdReisaanbod = data;
            aantalReisaanbod = data.length;
            lastIndexShown = itemsPerPage; // Stel de beginindex voor het tonen van items in
            displayReisaanbod(); // Toon de eerste set items
            document.getElementById('loadMore').style.display = data.length > itemsPerPage ? 'block' : 'none';
        } else {
            reisaanbodBeschikbaar = false;
            geselecteerdReisaanbod = [];
            aantalReisaanbod = 0;
            document.getElementById('loadMore').style.display = 'none';
        }

        checkLoaderAndDisplayStatus();

    } catch (error) {
        console.error('Fout bij het ophalen van gegevens:', error);
        document.getElementById('reisaanbodDisplay').innerText = 'Er is een fout opgetreden bij het ophalen van de gegevens.';
        googleSheetsDataReceived = true;
        checkLoaderAndDisplayStatus();
    }
}

async function submitPrompt() {
  chatGPTResponseReceived = false;
  googleSheetsDataReceived = false;

  document.getElementById('content-container').style.display = 'none';
  document.getElementById('loader').classList.remove('hidden');
  loaderAnimation.goToAndPlay(0, true);

  const vertreklocatie = document.getElementById('vertreklocatie').value;
  const typeVakantie = document.getElementById('type-vakantie-select').value;
  const extraVoorkeuren = document.getElementById('textarea-voorkeuren').value;

// Nieuwe code om gebruikersvoorkeuren op te slaan in Google Sheets
  const gebruikersvoorkeuren = {
    vertreklocatie,
    typeVakantie,
    extraVoorkeuren
  };

  const userMessageContent = [
  `Vertreklocatie: ${vertreklocatie}`,
  `Reistype: ${typeVakantie}`,
  extraVoorkeuren ? `Belangrijk: ${extraVoorkeuren}` : ''
].filter(Boolean).join(', ');

  const postData = {
  messages: [
    {
      role: "system",
      content: `Geef alleen reisinspiratie op basis van reisaanbod in de volgende combinaties en verwerk het land en reistype in de inspiratietekst: fly-drive [Canada, Faeröer Eilanden, Noord-Ierland, Ierland], stedentrip [de Verenigde Staten, Faeröer Eilanden, IJsland, Noorwegen, Zweden, Canada, Noord-Ierland, Ierland, België, Duitsland, Frankrijk, Ierland, Italië, Jordanië, Kroatië, Litouwen, Nederland, Oostenrijk, Polen, Portugal, Servië, Spanje, Tjechië, Verenigd Koninkrijk, Zweden], winteravonturen [IJsland, Zweden, Finland], wintersportvakantie [Canada, IJsland, Noorwegen, Zweden], rondreis [Frankrijk, Groot-Brittannië, Scandinavië, Kroatië, de Verenigde Staten, Thailand, Nieuw-Zeeland, Myanmar, Japan, Italië, Indonesië, Griekenland, Brazilië, Borneo, Australië, Costa Rica, Argentinië, Albanië], treinreis [Zwitserland, Duitsland, Noorwegen, Italië], camperreis [de Verenigde Staten, Canada, Australië, Kroatië, IJsland, Zuid-Afrika, Nieuw-Zeeland]. Je bent strikt beperkt tot één land en één reistype per keer uit deze specifieke combinaties. Als er geen specifieke gebruikersvoorkeuren zijn, gebruik dan een willekeurige combinatie uit het bestaande aanbod zodat je alsnog waardevolle reisinspiratie geeft.`
    },
    {
      role: "user",
      content: userMessageContent.length > 0 
        ? `Ik wil graag een reis met: ${userMessageContent}.`
        : `Ik zoek reisinspiratie voor mijn volgende vakantie.`
    }
   ],
  temperature: 0.5,
  max_tokens: 426,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
};

  try {
    const chatResponse = await fetchWithTimeout('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
    }, 20000);

    if (!chatResponse.ok) throw new Error(`Network response was not ok: ${chatResponse.statusText}`);
    const contentType = chatResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) throw new TypeError("Oops, we haven't got JSON!");

    const data = await chatResponse.json();
    chatGPTResponseReceived = true;

    if (data.choices && data.choices.length > 0) {
        const responseText = data.choices[0].message.content;
        document.getElementById('response-output').textContent = responseText;
        document.getElementById('response-output').classList.remove('hidden');

        const extractResponse = await fetch('/.netlify/functions/extractinfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tekst: responseText })
        });

        if (!extractResponse.ok) throw new Error('Fout bij het ophalen van extractiegegevens');
        const extractedData = await extractResponse.json();

        let reistype = extractedData.reistypes.length > 0 ? extractedData.reistypes[0] : null;
        let country = extractedData.landen.length > 0 ? extractedData.landen[0] : null;

        if (country) {
        selectedCountry = country; // Sla het geëxtraheerde land op in de variabele
      }

        if (country && reistype) {
            await queryGoogleSheetsWithCountry(country, reistype);
        } else {
            console.log("Geen land of reistype gevonden in de respons");
            googleSheetsDataReceived = true;
        }
    } else {
        chatGPTResponseReceived = true;
        googleSheetsDataReceived = true;
    }

    if (chatGPTResponseReceived && googleSheetsDataReceived) {
        const airtableData = {
            userPreferences: gebruikersvoorkeuren,
            chatGPTResponse: data.choices ? data.choices[0].message.content : '',
            selectedOffer: geselecteerdReisaanbod,
            numberOfOffers: aantalReisaanbod,
            selectedCountry: selectedCountry
        };

        await fetch('/.netlify/functions/airtable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(airtableData)
        }).catch(error => console.error('Fout bij het opslaan van data in Airtable:', error));
    }

    checkLoaderAndDisplayStatus();
  } catch (error) {
    document.getElementById('response-output').textContent = error.message;
    chatGPTResponseReceived = true;
    googleSheetsDataReceived = true;
    checkLoaderAndDisplayStatus();
  }
}

function loadMore() {
    lastIndexShown += itemsPerPage;
    if (lastIndexShown >= geselecteerdReisaanbod.length) {
        document.getElementById('loadMore').style.display = 'none'; // Verberg de knop als alle items zijn getoond
    }
    displayReisaanbod();
}

function displayReisaanbod() {
    const reisaanbodDisplay = document.getElementById('reisaanbodDisplay');
    reisaanbodDisplay.innerHTML = ''; // Maak de container leeg voordat je nieuwe items toevoegt

    for (let i = 0; i < lastIndexShown && i < geselecteerdReisaanbod.length; i++) {
        const row = geselecteerdReisaanbod[i];
        const clone = document.importNode(document.getElementById('reisaanbodTemplate').content, true);

        clone.querySelector('.reisaanbod-logo').src = row[7];
        clone.querySelector('.reisaanbod-image').src = row[6];
        clone.querySelector('.reisaanbod-naam').textContent = row[2];
        clone.querySelector('.reisaanbod-beschrijving').textContent = beperkTekstLengte(row[3], 240);
        const prijsElement = clone.querySelector('.reisaanbod-prijs');
        if (prijsElement) {
            prijsElement.textContent = `Vanaf € ${row[4]}`;
        }

        let button = clone.querySelector('.reisaanbod-link');
        button.onclick = function() {
            window.open(row[5], '_blank');
        };

        reisaanbodDisplay.appendChild(clone);
    }
}


function checkLoaderAndDisplayStatus() {
  if (chatGPTResponseReceived && googleSheetsDataReceived) {
    loaderAnimation.stop();
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('content-container').style.display = 'none';
    document.getElementById('response-title').classList.remove('hidden');
    document.getElementById('response-output').classList.remove('hidden');
  if (reisaanbodBeschikbaar) { // Toon alleen als er reisaanbod is  
    document.getElementById('reisaanbod-container').classList.remove('hidden');
    document.getElementById('reisaanbod-title').classList.remove('hidden'); // Zorg dat deze regel correct is
    } else {
      document.getElementById('reisaanbod-container').classList.add('hidden');
      document.getElementById('reisaanbod-title').classList.add('hidden');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupLoaderAnimation();

  document.querySelectorAll('.image-selection input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', function() {
      // Verwijder de 'selected' klasse van alle labels
      document.querySelectorAll('.image-selection label').forEach(label => {
        label.classList.remove('selected');
      });

      // Voeg de 'selected' klasse toe aan het huidige label
      this.parentNode.classList.add('selected');
    });
  });

  const inspireMeButton = document.getElementById('inspire-me-btn');
  inspireMeButton.addEventListener('click', submitPrompt);
});
