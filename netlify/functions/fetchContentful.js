const contentful = require('contentful');

exports.handler = async (event, context) => {
  const space = process.env.mojawqr86alx;
  const accessToken = process.env.wOjSMrxnQnOEjY3CQpXQX7p_dCCGUYY2GDubsgrgCis;
  
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