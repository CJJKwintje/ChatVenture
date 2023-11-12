document.addEventListener('DOMContentLoaded', function() {
    // Voeg hier event listeners toe voor je UI-elementen, zoals knoppen

    const loadDataButton = document.getElementById('loadData'); // Voorbeeld knop ID
    loadDataButton.addEventListener('click', loadSheetData);
});

fetch('https://script.google.com/macros/s/AKfycbwI5Pf0FuI3w5-PpF5LEBFuj1de0ddK87DyHyMu5aOFc5DkLuZL9Vpg21vsRaOXE3iH/exec')
        .then(response => response.json())
        .then(data => {
            console.log('Sheet data:', data);
            // Verwerk en toon de data in je webpagina
        })
        .catch(error => {
            console.error('Fout bij het ophalen van gegevens:', error);
        });

