import { HandlerEvent } from "@netlify/functions";

exports.handler = async (event: HandlerEvent) => {
  const { prompt } = JSON.parse(event.body || '{}');

  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Prompt obrigatório.' }),
    };
  }

  const HF_TOKEN = process.env['IMAGE_GENERATOR_KEY'];

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: errorText,
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache',
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};
