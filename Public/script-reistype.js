let loaderAnimation;
let chatGPTResponseReceived = false;
let googleSheetsDataReceived = false;

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

let reisaanbodBeschikbaar = false;

async function queryGoogleSheetsWithCountry(country, reistype) {
  const url = `/.netlify/functions/fetchSheetData?country=${encodeURIComponent(country)}&reistype=${encodeURIComponent(reistype)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Fout bij het ophalen van gegevens van Google Sheets');
    }

    const data = await response.json();
    googleSheetsDataReceived = true;
    if (data && data.length > 0) { // Controleer of er data is
    reisaanbodBeschikbaar = true; // Update de variabele als er reisaanbod is
    // ... code om het reisaanbod te verwerken en te tonen ...
  } else {
    reisaanbodBeschikbaar = false; // Geen reisaanbod beschikbaar
  }
    checkLoaderAndDisplayStatus();

    const reisaanbodDisplay = document.getElementById('reisaanbodDisplay');
    const template = document.getElementById('reisaanbodTemplate').content;

    reisaanbodDisplay.innerHTML = '';

    data.forEach((row) => {
      const clone = document.importNode(template, true);

      clone.querySelector('.reisaanbod-logo').src = row[7];
      clone.querySelector('.reisaanbod-image').src = row[6];
      clone.querySelector('.reisaanbod-naam').textContent = row[2];
      clone.querySelector('.reisaanbod-beschrijving').textContent = beperkTekstLengte(row[3], 350);

      const prijsElement = clone.querySelector('.reisaanbod-prijs');
      if (prijsElement) {
        prijsElement.textContent = `Vanaf € ${row[4]}`;
      }

      let button = clone.querySelector('.reisaanbod-link');
      button.onclick = function() {
        window.open(row[5], '_blank');
      };

      reisaanbodDisplay.appendChild(clone);
    });
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

  const postData = {
    messages: [
      {
        role: "system",
 content: `Gedraag je als een enthousiaste travelagent. De gebruiker geeft 4 voorkeuren door voor een nieuwe vakantie, namelijk vertreklocatie, reistype, type vervoer en extra wensen.  Geef een waardevolle reisinspiratie. Beperk je tot de volgende combinaties: Fly-drive: Canada, Faeröer Eilanden, Noord-Ierland, Ierland, Stedentrip: de Verenigde Staten, Faroer, IJsland, Noorwegen, Zweden, Canada, Noord-Ierland, Ierland, Winteravontuur: IJsland, Zweden, Finland, Wintersportvakantie: Canada, IJsland, Noorwegen, Zweden, Rondreis: Frankrijk, Groot Brittannië, Scandinavië, Kroatië, de Verenigde Staten, Thailand, Nieuw-Zeeland, Myanmar, Japan, Italië, Indonesië, Griekenland, Frankrijk, Brazillië, Borneo, Australië, Costa Rica, Argentinië, Albanië, Treinreis: Zwitserland, Duitsland, Noorwegen, Italië`      },      {
        role: "user",
        content: `Vertreklocatie: ${vertreklocatie}, Reistype: ${typeVakantie}, Overige wensen: ${extraVoorkeuren}`
      }
    ]
  };

  try {
    const chatResponse = await fetchWithTimeout('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    }, 20000);

    if (!chatResponse.ok) {
      throw new Error(`Network response was not ok: ${chatResponse.statusText}`);
    }

    const contentType = chatResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new TypeError("Oops, we haven't got JSON!");
    }

    const data = await chatResponse.json();
    chatGPTResponseReceived = true;

    if (data.choices && data.choices.length > 0) {
      const responseText = data.choices[0].message.content;
      document.getElementById('response-output').textContent = responseText;
      document.getElementById('response-output').classList.remove('hidden');

   try {
  const extractResponse = await fetch('/.netlify/functions/extractinfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tekst: responseText })
  });

  if (!extractResponse.ok) {
    console.log("Response status:", extractResponse.status);
    console.log("Response text:", await extractResponse.text());
    throw new Error('Fout bij het ophalen van extractiegegevens');
  }

  const extractedData = await extractResponse.json();

  let reistype = extractedData.reistypes.length > 0 ? extractedData.reistypes[0] : null;
  let country = extractedData.landen.length > 0 ? extractedData.landen[0] : null;

  if (country && reistype) {
    await queryGoogleSheetsWithCountry(country, reistype);
  } else {
    console.log("Geen land of reistype gevonden in de respons");
    googleSheetsDataReceived = true;
  }
} catch (extractError) {
  console.error('Fout bij het verwerken van extractiegegevens:', extractError);
  // Extra logica hier indien nodig, zoals het tonen van een foutmelding aan de gebruiker
}
    } else {  
      chatGPTResponseReceived = true;
      googleSheetsDataReceived = true;
    }

    checkLoaderAndDisplayStatus();

  } catch (error) {
    document.getElementById('response-output').textContent = error.message;
    chatGPTResponseReceived = true;
    googleSheetsDataReceived = true;
    checkLoaderAndDisplayStatus();
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
