document.addEventListener('DOMContentLoaded', function() {
    // Voeg hier event listeners toe voor je UI-elementen, zoals knoppen

    const loadDataButton = document.getElementById('loadData'); // Voorbeeld knop ID
    loadDataButton.addEventListener('click', loadSheetData);
});

function loadSheetData() {
    fetch('https://chatventure.ew.r.appspot.com//getSheetData')
 // Endpoint gedefinieerd in server.js
        .then(response => response.json())
        .then(data => {
            console.log('Sheet data:', data);
            // Voeg hier code toe om de data te verwerken en weer te geven in je webpagina
        })
        .catch(error => {
            console.error('Fout bij het ophalen van gegevens:', error);
        });
}
