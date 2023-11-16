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

function queryGoogleSheetsWithCountry(country, reistype) {
  const url = `/.netlify/functions/fetchSheetData?country=${encodeURIComponent(country)}&reistype=${encodeURIComponent(reistype)}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      googleSheetsDataReceived = true;
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
 content: `Gedraag je als een enthousiaste travelagent. De gebruiker geeft 3 voorkeuren door voor een nieuwe vakantie, namelijk vertreklocatie, reistype en type vervoer.  Geef een waardevolle reisinspiratie en begin de inspiratie met “We raden een [reistype] in [land] aan” zet de response tussen “”. Beperk je tot de volgende landen: Canada, Faroer Eilanden, Finland, Noord-Ierland, Ierland, de Verenigde Staten, IJsland, Noorwegen, Zweden. Beperk je tot de volgende reistypes: Stedentrip, Fly Drive, Wintersportvakantie, Winteravontuur`      },      {
        role: "user",
        content: `Vertreklocatie: ${vertreklocatie}, Reistype: ${typeVakantie}, Gebied: ${transport}, Belangrijk: ${extraVoorkeuren}`
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
      const pattern = /We raden een ([\p{L}\s]+) in ([\p{L}\s]+) aan/u; 
      const match = responseText.match(pattern);

      let reistype = match && match.length > 1 ? match[1] : null;
      let country = match && match.length > 2 ? match[2] : null;

    if (country && reistype) {
      console.log("Gevonden land: " + country + ", Reistype: " + reistype);
      queryGoogleSheetsWithCountry(country, reistype);
    } else {
      console.log("Geen land of reistype gevonden in de respons");
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
