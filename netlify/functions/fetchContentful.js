const contentful = require('contentful');

exports.handler = async (event, context) => {
    const space = process.env.CONTENTFUL_SPACE_ID;
    const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;
  
  const client = contentful.createClient({
    space,
    accessToken
  });

  const entryId = event.queryStringParameters.entryId;

  try {
    const entry = await client.getEntry(entryId);
    return {
      statusCode: 200,
      body: JSON.stringify(entry),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};