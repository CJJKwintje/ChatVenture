let loaderAnimation;
let chatGPTResponseReceived = false;
let googleSheetsDataReceived = false;
let geselecteerdReisaanbod = []; // Toegevoegd om het geselecteerde reisaanbod op te slaan
let aantalReisaanbod = 0; // Toegevoegd om het aantal reisaanbod bij te houden
let selectedCountry = '';
let lastIndexShown = 0;
let itemsPerPage = 5; // Stel hier het gewenste aantal items per 'pagina' in
let laatsteGebruikersinvoer = null;
let isRegenereerKnopGebruikt = false;
let keuzeGemaakt = false;
let laatsteExtraVoorkeuren = "";
let originalChatGPTResponse = '';
let ipAddress = '';

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

function updateDropdownStyle(dropdown) {
  if (dropdown.value === "") {
    dropdown.classList.add('placeholder');
  } else {
    dropdown.classList.remove('placeholder');
  }
}

// Initieel de dropdown instellen met de placeholder stijl
document.getElementById('type-vakantie-select').classList.add('placeholder');


// Functie om de lengte van de beschrijving te beperken
function beperkTekstLengte(tekst, maxLengte) {
  return tekst.length > maxLengte ? tekst.substring(0, maxLengte) + '...' : tekst;
}

function sendToAirtable(userPreferences, originalChatGPTResponse, newChatGPTResponse, selectedOffer, numberOfOffers, selectedCountry, ipAddress, additionalPreferences, isRegenerated) {
    const data = {
        userPreferences: userPreferences,
        originalChatGPTResponse: originalChatGPTResponse,
        newChatGPTResponse: newChatGPTResponse,
        selectedOffer: selectedOffer,
        numberOfOffers: numberOfOffers,
        selectedCountry: selectedCountry,
        ipAddress: ipAddress,
        additionalPreferences: additionalPreferences,
        isRegenerated: isRegenerated
    };

    fetch('/.netlify/functions/airtable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success: Data sent to Airtable', data);
    })
    .catch(error => {
        console.error('Error sending data to Airtable:', error);
    });
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

function updateOfferCount(offerCount) {
  const reizenText = offerCount === 1 ? 'bijpassende reis' : 'bijpassende reizen';
  document.getElementById('offerCount').innerText = offerCount + ' ' + reizenText;
}

async function fetchUserIP() {
  try {
    const response = await fetchWithTimeout('/.netlify/functions/fetchIP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ipAddress)
    }, 20000);
   // const response = await fetch('/.netlify/functions/fetchIP');
    console.log(response) 
    if (!response.ok) {
      throw new Error('Netwerkfout bij het ophalen van het IP-adres');
    }
    const data = await response.json();
    return data.ipAddress;
  } catch (error) {
    console.error('Fout bij het ophalen van het IP-adres:', error);
  }
}

async function submitPrompt() {
  chatGPTResponseReceived = false;
  googleSheetsDataReceived = false;

  document.querySelector('h1').style.display = 'none';
  document.getElementById('content-container').style.display = 'none';
  document.getElementById('loader').classList.remove('hidden');
  // Verberg de oude reisinspiratie en reisaanbod direct
  document.getElementById('response-container').classList.add('hidden');
  document.getElementById('reisaanbod-container').classList.add('hidden');
  document.getElementById('reisaanbod-title').classList.add('hidden');
  document.getElementById('loadMore').classList.add('hidden');
  document.getElementById('reisaanbodDisplay').innerHTML = ''; // Leeg de reisaanbod container

  loaderAnimation.goToAndPlay(0, true);

  const regenereerKnop = document.getElementById('regenerate-inspiration');
  const modifyButton = document.getElementById('modify-inspiration');
  const additionalInputField = document.getElementById('additional-input');

    if (keuzeGemaakt) {
        verbergKnoppen();
    }

    if (regenereerKnop) {
        regenereerKnop.classList.add('hidden');
    }
    if (modifyButton) {
        modifyButton.classList.add('hidden');
    }
    if (additionalInputField) {
        additionalInputField.classList.add('hidden');
    }

  // Gebruikersinvoer ophalen
  const vertreklocatie = document.getElementById('vertreklocatie').value;
  const typeVakantie = document.getElementById('type-vakantie-select').value;
  const huidigeExtraVoorkeuren = document.getElementById('textarea-voorkeuren').value;

  // Update alleen als de velden gewijzigd zijn
  if (vertreklocatie && vertreklocatie !== laatsteGebruikersinvoer.vertreklocatie) {
      laatsteGebruikersinvoer.vertreklocatie = vertreklocatie;
  }
  if (typeVakantie && typeVakantie !== laatsteGebruikersinvoer.typeVakantie) {
      laatsteGebruikersinvoer.typeVakantie = typeVakantie;
  }
   // Hier is een belangrijke wijziging om te zorgen dat de aanvullende voorkeuren behouden blijven
  if (!keuzeGemaakt && huidigeExtraVoorkeuren) {
    laatsteGebruikersinvoer.extraVoorkeuren = huidigeExtraVoorkeuren;
  }

  const ipAddress = await fetchUserIP(); // Haal het IP-adres op

const userMessageContent = [
    `Vertreklocatie: ${laatsteGebruikersinvoer.vertreklocatie}`,
    `Reistype: ${laatsteGebruikersinvoer.typeVakantie}`,
    laatsteGebruikersinvoer.extraVoorkeuren ? `Belangrijk: ${laatsteGebruikersinvoer.extraVoorkeuren}` : ''
  ].filter(Boolean).join(', ');

  const postData = {
  messages: [
    {
      role: "system",
      content: `Geef alleen reisinspiratie op basis van reisaanbod in de volgende combinaties en verwerk het land en reistype in de inspiratietekst: fly-drive [Canada, Faeröer Eilanden, Noord-Ierland, Ierland], stedentrip [de Verenigde Staten, Faeröer Eilanden, IJsland, Noorwegen, Zweden, Canada, Noord-Ierland, Ierland, België, Duitsland, Frankrijk, Ierland, Italië, Jordanië, Kroatië, Litouwen, Nederland, Oostenrijk, Polen, Portugal, Servië, Spanje, Tjechië, Verenigd Koninkrijk, Zweden], winteravonturen [IJsland, Zweden], wintersportvakantie [Canada, IJsland, Noorwegen, Zweden], rondreis [Frankrijk, Groot-Brittannië, Scandinavië, Kroatië, de Verenigde Staten, Thailand, Nieuw-Zeeland, Myanmar, Japan, Italië, Indonesië, Griekenland, Brazilië, Borneo, Australië, Costa Rica, Argentinië, Albanië], treinreis [Zwitserland, Duitsland, Noorwegen, Italië], camperreis [de Verenigde Staten, Canada, Australië, Kroatië, IJsland, Zuid-Afrika, Nieuw-Zeeland]. Je bent strikt beperkt tot één land en één reistype per keer uit deze specifieke combinaties. Als er geen specifieke gebruikersvoorkeuren zijn, gebruik dan een willekeurige combinatie uit het bestaande aanbod zodat je alsnog waardevolle reisinspiratie geeft.`
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
        originalChatGPTResponse = responseText; // Sla de oorspronkelijke response op
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
         let newChatGPTResponse = null; // Deze variabele moet worden ingesteld op basis van gebruikersacties
         let isRegenerated = false; // Deze variabele moet worden ingesteld op basis van gebruikersacties
        const airtableData = {
            userPreferences: laatsteGebruikersinvoer,
            originalChatGPTResponse: originalChatGPTResponse,
            selectedOffer: geselecteerdReisaanbod,
            numberOfOffers: aantalReisaanbod,
            selectedCountry: selectedCountry,
            ipAddress: ipAddress
        };
        console.log(airtableData)
        sendToAirtable(laatsteGebruikersinvoer, originalChatGPTResponse, newChatGPTResponse, geselecteerdReisaanbod, aantalReisaanbod, selectedCountry, ipAddress, laatsteExtraVoorkeuren, isRegenerated);
        // Stel dat numberOfOffers ergens in je script wordt ingesteld...
        updateOfferCount(aantalReisaanbod);

    }

    checkLoaderAndDisplayStatus();
  } catch (error) {
    document.getElementById('response-output').textContent = error.message;
    chatGPTResponseReceived = true;
    googleSheetsDataReceived = true;
    checkLoaderAndDisplayStatus();
  }
}

function genereerOpnieuw() {
    if (laatsteGebruikersinvoer) {
        document.getElementById('vertreklocatie').value = laatsteGebruikersinvoer.vertreklocatie;
        document.getElementById('type-vakantie-select').value = laatsteGebruikersinvoer.typeVakantie;
        // Zet eventueel andere velden zoals transport en extraVoorkeuren
        submitPrompt();

        // Schakel de "Genereer opnieuw" knop uit na de eerste klik
        const regenereerKnop = document.getElementById('regenerate-inspiration');
        if (regenereerKnop) {
            regenereerKnop.disabled = true;
            regenereerKnop.classList.add('hidden');
            isRegenereerKnopGebruikt = true;
        }
                keuzeGemaakt = true; // Voeg deze regel toe
    } else {
        console.error('Geen vorige gebruikersinvoer opgeslagen');
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
    document.getElementById('response-container').classList.remove('hidden');
    document.getElementById('content-container').style.display = 'none';
    document.getElementById('response-title').classList.remove('hidden');
    document.getElementById('response-output').classList.remove('hidden');
    
     if (!keuzeGemaakt) {
      toonKnoppen(); // Toon de knoppen als de gebruiker nog geen keuze heeft gemaakt
    } else {
      verbergKnoppen(); // Verberg de knoppen als de gebruiker al een keuze heeft gemaakt
    }

    if (reisaanbodBeschikbaar) { 
      document.getElementById('reisaanbod-container').classList.remove('hidden');
      document.getElementById('reisaanbod-title').classList.remove('hidden');
    } else {
      document.getElementById('reisaanbod-container').classList.add('hidden');
      document.getElementById('reisaanbod-title').classList.add('hidden');
    }
  }
}

function toonKnoppen() {
  // Toon de knoppen als keuzeGemaakt false is
  if (!keuzeGemaakt) {
    document.getElementById('regenerate-inspiration').classList.remove('hidden');
    document.getElementById('modify-inspiration').classList.remove('hidden');
  }
}

function verbergKnoppen() {
   if (keuzeGemaakt) {
    const regenereerKnop = document.getElementById('regenerate-inspiration');
    const modifyButton = document.getElementById('modify-inspiration');
    const additionalInputField = document.getElementById('additional-input');

    if (regenereerKnop) regenereerKnop.classList.add('hidden');
    if (modifyButton) modifyButton.classList.add('hidden');
    if (additionalInputField) additionalInputField.classList.add('hidden');
}
}

document.addEventListener('DOMContentLoaded', () => {
  setupLoaderAnimation();

    laatsteGebruikersinvoer = {
    vertreklocatie: '',
    typeVakantie: '',
    extraVoorkeuren: ''
  };

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

  // Event listener voor de "Genereer opnieuw" knop
   const regenereerKnop = document.getElementById('regenerate-inspiration');
    if (regenereerKnop) {
        regenereerKnop.addEventListener('click', genereerOpnieuw);
  }

    const modifyButton = document.getElementById('modify-inspiration');
    if (modifyButton) {
  modifyButton.addEventListener('click', function() {
    document.getElementById('additional-input').classList.remove('hidden');
    document.getElementById('submit-modified-inspiration').classList.remove('hidden');
    modifyButton.classList.add('hidden');
    document.getElementById('regenerate-inspiration').classList.add('hidden');

    keuzeGemaakt = true; // Voeg deze regel toe
  });
}

  const submitModifiedButton = document.getElementById('submit-modified-inspiration');
    if (submitModifiedButton) {
        submitModifiedButton.addEventListener('click', function() {
            const additionalInput = document.getElementById('additional-input').value;
            // Combineer de aanvullende invoer met de oorspronkelijke invoer
            laatsteGebruikersinvoer.extraVoorkeuren += ` ${additionalInput}`;
            laatsteExtraVoorkeuren = laatsteGebruikersinvoer.extraVoorkeuren; // Nieuwe regel
            submitPrompt(); // Verzend de gecombineerde aanvraag
            // Verberg de knop nadat deze is gebruikt
        submitModifiedButton.classList.add('hidden');
            keuzeGemaakt = true; // Voeg deze regel toe
        });
    }
});

    document.getElementById('submit-modified-inspiration').addEventListener('click', async function() {
        const additionalInput = document.getElementById('additional-input').value;
        laatsteGebruikersinvoer.extraVoorkeuren = additionalInput;
        await submitPrompt();

        sendToAirtable(
            laatsteGebruikersinvoer, 
            originalChatGPTResponse, 
            null, // Geen nieuwe response voor aanvullende invoer
            geselecteerdReisaanbod, 
            aantalReisaanbod, 
            selectedCountry, 
            ipAddress, 
            additionalInput, 
            false
        );
   document.getElementById('submit-modified-inspiration').classList.add('hidden');
        keuzeGemaakt = true;
    });      

document.getElementById('regenerate-inspiration').addEventListener('click', async function() {
        isRegenereerKnopGebruikt = true;
        await submitPrompt();

        sendToAirtable(
            laatsteGebruikersinvoer, 
            originalChatGPTResponse, 
            null, // Geen nieuwe response voor regeneratie
            geselecteerdReisaanbod, 
            aantalReisaanbod, 
            selectedCountry, 
            ipAddress, 
            null, 
            true
        );

        document.getElementById('regenerate-inspiration').classList.add('hidden');
    });
