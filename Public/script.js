let loaderAnimation;

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

  async function submitPrompt() {
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
          content: `Gedraag je als een enthousiaste travelagent, maar spreek niet uit de ik-vorm en stel geen vragen. De gebruiker geeft 3 voorkeuren door voor een nieuwe vakantie, namelijk vertreklocatie, type vakantie en type vervoer.Geef een waardevol en kort vakantie advies op basis van deze 3 voorkeuren`
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
        document.getElementById('response-title').classList.remove('hidden');
        document.getElementById('response-output').classList.remove('hidden');
        document.getElementById('response-output').textContent = data.choices[0].message.content;
    // Verberg de input velden en de 'inspireer me' knop
        document.getElementById('input-fields').style.display = 'none';
        document.getElementById('inspire-me-btn').style.display = 'none';
      } else {
        document.getElementById('response-output').textContent = 'No response from API.';
      }
    } catch (error) {
      document.getElementById('response-output').textContent = error.message;
    } finally {
      loaderAnimation.stop();
      document.getElementById('loader').classList.add('hidden');
      document.getElementById('content-container').style.display = 'block';
    }
  }

document.addEventListener('DOMContentLoaded', () => {
    setupLoaderAnimation();
   // document.querySelector('h1').style.display = 'none';
    
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
