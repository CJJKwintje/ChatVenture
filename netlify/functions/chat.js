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
    const { messages } = JSON.parse(event.body);

    // Prepare the payload to send to OpenAI's API
    const data = {
      model: "gpt-4o-mini", // Make sure to use the correct model for your use case
      messages: messages, // 'messages' should be an array of message objects
    };

    // Make the POST request to OpenAI's API
    const response = await fetch('https://api.openai.com/v1/chat/completions', { // Ensure you're using the correct endpoint for chat
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
