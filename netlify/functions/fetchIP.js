exports.handler = async function(event, context) {
     // Het IP-adres is beschikbaar in de 'client-ip' header die Netlify toevoegt
    const ipAddress = event.headers['client-ip'];

    // Controleer of het IP-adres beschikbaar is
    if (!ipAddress) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "IP-adres kon niet worden opgehaald" })
        };
    }

    // Stuur het IP-adres terug in de response
    return {
        statusCode: 200,
        body: JSON.stringify({ ipAddress: ipAddress })
    };
};
