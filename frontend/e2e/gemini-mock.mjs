/**
 * A stand-in for the Gemini API, for the e2e suite only.
 *
 * The extractor used to have a fixed-reading implementation inside the application so tests could
 * run offline. That put a class capable of inventing figures into production code. This replaces it
 * at the HTTP boundary instead: the real extractor runs, builds the real prompt and schema, parses a
 * real response — only the model is fake. Point the backend at it with
 * GEMINI_BASE_URL=http://localhost:8099 (see `make backend-e2e`).
 *
 * The reply is the same 1,240 kWh reading the old in-process stand-in produced, against the two
 * targets every tenant is seeded with, so one upload still exercises both destinations.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8099);

/** What the extractor's response schema asks for. */
const PROPOSALS = {
  records: [
    {
      targetType: 'EMISSION_ACTIVITY',
      targetId: 'GRID_ELECTRICITY_MY',
      value: 1240,
      unitAsRead: 'kWh',
      fiscalYear: new Date().getFullYear(),
      confidence: 0.9,
      sourceSnippet: 'Total consumption: 1,240 kWh',
    },
    {
      targetType: 'INDICATOR_VALUE',
      targetId: 'IND-ENG-01',
      value: 1240,
      unitAsRead: 'kWh',
      fiscalYear: new Date().getFullYear(),
      confidence: 0.9,
      sourceSnippet: 'Total consumption: 1,240 kWh',
    },
  ],
};

/** The shape google-genai parses: the JSON body arrives as the first part's text. */
const RESPONSE = {
  candidates: [
    {
      content: { role: 'model', parts: [{ text: JSON.stringify(PROPOSALS) }] },
      finishReason: 'STOP',
      index: 0,
    },
  ],
  usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
  modelVersion: 'mock',
};

const server = createServer((req, res) => {
  // Playwright polls this to know the server is up before starting the suite.
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }

  // The SDK posts to {baseUrl}/{apiVersion}/models/{model}:generateContent. Matching on the
  // suffix keeps this working if the model id or api version changes.
  if (req.method === 'POST' && req.url?.endsWith(':generateContent')) {
    // Drained rather than ignored: leaving the request body unread can stall the client.
    req.resume();
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(RESPONSE));
    });
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: { message: `gemini-mock has no route for ${req.method} ${req.url}` } }));
});

server.listen(PORT, () => console.log(`gemini-mock listening on ${PORT}`));
