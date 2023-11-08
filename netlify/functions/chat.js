const fetch = require('node-fetch');

// Make sure to replace 'YOUR_OPENAI_API_KEY' with your actual key.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the body to get the prompt
    const { prompt } = JSON.parse(event.body);

    // Prepare the payload to send to OpenAI API
    const data = {
      prompt: prompt,
      max_tokens: 150, // Adjust as necessary
      // Add other parameters as needed
    };

    // Make the request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/engines/davinci-codex/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    // Wait for the response from OpenAI API
    const responseData = await response.json();

    // Return the response to the client
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(responseData)
    };
  } catch (error) {
    // Handle any errors that occur during the request to OpenAI
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
