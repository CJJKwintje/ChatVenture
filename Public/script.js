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

// Bestaande functie die de data ophaalt en verwerkt
function queryGoogleSheetsWithCountry(country) {
  const url = `/.netlify/functions/fetchSheetData?country=${encodeURIComponent(country)}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      googleSheetsDataReceived = true;
      checkLoaderAndDisplayStatus();
      const reisaanbodDisplay = document.getElementById('reisaanbodDisplay');
      const template = document.getElementById('reisaanbodTemplate').content;

      reisaanbodDisplay.innerHTML = ''; // Leegmaken van vorige resultaten

      data.forEach((row) => {
        const clone = document.importNode(template, true);

        clone.querySelector('.reisaanbod-logo').src = row[5];
        clone.querySelector('.reisaanbod-image').src = row[4];
        clone.querySelector('.reisaanbod-naam').textContent = row[1];
        clone.querySelector('.reisaanbod-beschrijving').textContent = beperkTekstLengte(row[2], 350); // Limiet van 350 tekens

        // Toevoegen van de vanaf prijs
        const prijsElement = clone.querySelector('.reisaanbod-prijs');
        if (prijsElement) {
          prijsElement.textContent = `Vanaf € ${row[6]}`; // Aanname dat de prijs in kolom 7 staat (index 6)
        }

        let button = clone.querySelector('.reisaanbod-link');
        button.onclick = function() {
          window.location.href = row[3];
        };

        reisaanbodDisplay.appendChild(clone);
      });
    })
    .catch(error => {
      console.error('Fout bij het ophalen van gegevens:', error);
      reisaanbodDisplay.innerText = 'Er is een fout opgetreden bij het ophalen van de gegevens.';
      googleSheetsDataReceived = true;
      checkLoaderAndDisplayStatus();
    });
}

// De rest van je code blijft ongewijzigd


async function submitPrompt() {
  chatGPTResponseReceived = false;
  googleSheetsDataReceived = false;

  document.querySelector('h1').style.display = 'none';
  document.getElementById('content-container').style.display = 'none';
  document.getElementById('loader').classList.remove('hidden');
  loaderAnimation.goToAndPlay(0, true);

  const vertreklocatie = document.getElementById('vertreklocatie').value;
  const typeVakantie = document.getElementById('type-vakantie-select').value;
  const selectedRadio = document.querySelector('input[name="transport-select"]:checked');
  if (!selectedRadio) {
    console.error('Geen transport geselecteerd');
    return;
  }
  const transport = selectedRadio.value;
  const extraVoorkeuren = document.getElementById('textarea-voorkeuren').value;

  const postData = {
    messages: [
      {
        role: "system",
        content: `Gedraag je als een enthousiaste travelagent. De gebruiker geeft 3 voorkeuren door voor een nieuwe vakantie, namelijk vertreklocatie, type vakantie en type vervoer. Geef een waardevol en kort vakantie advies op basis van deze 3 voorkeuren. Begin je zin altijd met “We raden een reis naar [land] aan” en zet de response altijd tussen “”.`
      },
      {
        role: "user",
        content: `Vertreklocatie: ${vertreklocatie}, Type vakantie: ${typeVakantie}, Gebied: ${transport}, Belangrijk: ${extraVoorkeuren}`
      }
    ]
  };

  try {
    const response = await fetchWithTimeout('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    }, 20000);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new TypeError("Oops, we haven't got JSON!");
    }

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      chatGPTResponseReceived = true;
      checkLoaderAndDisplayStatus();

      document.getElementById('response-title').classList.remove('hidden');
      document.getElementById('response-title').classList.remove('hidden');
      document.getElementById('reisaanbod-title').classList.remove('hidden');
      document.getElementById('response-output').classList.remove('hidden');
      document.getElementById('response-output').textContent = data.choices[0].message.content;
      const responseText = data.choices[0].message.content;
      const countryRegex = /een reis naar (\w+)/;  // Eenvoudige regex voor demonstratie
      const match = responseText.match(countryRegex);

      if (match && match.length > 1) {
        let country = match[1];
        console.log("Gevonden land: " + country);
        // Hier kun je de landennaam opslaan voor verdere verwerking
        // Bijvoorbeeld, door een functie aan te roepen die de Google Sheets API query maakt
        queryGoogleSheetsWithCountry(country);
      } else {
        console.log("Geen land gevonden in de respons");
        // Behandel het geval waarin geen landennaam werd gevonden
      }

      // Verberg de input velden en de 'inspireer me' knop
      document.getElementById('input-fields').style.display = 'none';
      document.getElementById('inspire-me-btn').style.display = 'none';
    } else {
      chatGPTResponseReceived = true;
      checkLoaderAndDisplayStatus();
      document.getElementById('response-output').textContent = 'No response from API.';
    }
  } catch (error) {
    document.getElementById('response-output').textContent = error.message;
    chatGPTResponseReceived = true;
    checkLoaderAndDisplayStatus();
  }
}

function checkLoaderAndDisplayStatus() {
  if (chatGPTResponseReceived && googleSheetsDataReceived) {
    // Beide responses zijn ontvangen, stop de loader en toon de inhoud
    loaderAnimation.stop();
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('content-container').style.display = 'block';
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
