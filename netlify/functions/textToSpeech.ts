import { ElevenLabsClient } from 'elevenlabs';
import type { HandlerEvent } from '@netlify/functions';

const ErrorResponse = {
  statusCode: 500,
  body: JSON.stringify({ error: 'Failed to generate voice' }),
}

exports.handler = async function(event: HandlerEvent) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const { text } = JSON.parse(event.body || '');

  
    const client = new ElevenLabsClient();
    const audio = await client.textToSpeech.convert('j9jfwdrw7BRfcR43Qohk', {
      text: text,
      model_id: "eleven_multilingual_v2",
      output_format: "mp3_44100_128",
    });

    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64Audio = buffer.toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'audio/mp3',
        'Cache-Control': 'no-cache',
      },
      body: base64Audio,
      isBase64Encoded: true,
    };
  } catch (error) {
    return ErrorResponse;
  }
};