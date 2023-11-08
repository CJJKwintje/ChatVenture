const fetch = require('node-fetch');

// Replace 'YOUR_OPENAI_API_KEY' with your actual OpenAI API key in the Netlify environment variable settings.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

exports.handler = async function(event) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the body to get the prompt
    const { prompt } = JSON.parse(event.body);

    // Prepare the payload to send to OpenAI's API
    const data = {
      model: "gpt-4-1106-preview", // Replace with your desired model
      prompt: prompt,
      max_tokens: 150,
      // Add other parameters as needed
    };

    // Make the POST request to OpenAI's API
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    // Parse the response from OpenAI's API
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
    // Handle any errors that occur during the API request
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
