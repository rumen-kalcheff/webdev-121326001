// The only file that names the model provider (Gemini, Google AI Studio free tier).
// Everything else asks for `client.generate(prompt)` and never learns who answers.

class ProviderTimeoutError extends Error {}
class ProviderRateLimitError extends Error {}
class ProviderError extends Error {}

const TIMEOUT_MS = 10000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

function createGeminiClient({ apiKey, model = DEFAULT_MODEL, timeoutMs = TIMEOUT_MS, fetchImpl = fetch }) {
  return {
    async generate(prompt) {
      let res;
      try {
        res = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            // The key goes in a header so it can never end up in a logged URL.
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0 }
            }),
            // Every call has a timeout: a provider that never answers must not hang the request.
            signal: AbortSignal.timeout(timeoutMs)
          }
        );
      } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          throw new ProviderTimeoutError('The provider did not answer in time');
        }
        throw new ProviderError('The provider could not be reached');
      }

      if (res.status === 429) {
        throw new ProviderRateLimitError('The provider is rate-limited');
      }
      if (!res.ok) {
        throw new ProviderError(`The provider answered with status ${res.status}`);
      }

      const body = await res.json();
      return body?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }
  };
}

// undefined: build the real client from the environment; null: no assistant; otherwise a fake.
let override;

function useClient(client) {
  override = client;
}

// Fallback: with no key there is no client, and the service answers "not answering"
// while the booking form keeps working.
function getClient() {
  if (override !== undefined) return override;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return createGeminiClient({ apiKey, model: process.env.MODEL_NAME || DEFAULT_MODEL });
}

module.exports = {
  createGeminiClient,
  getClient,
  useClient,
  ProviderTimeoutError,
  ProviderRateLimitError,
  ProviderError
};
