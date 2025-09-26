import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {googleCloud} from '@genkit-ai/google-cloud';

// This is the correct initialization for Genkit in a Next.js app.
// It uses the googleAI plugin, which automatically uses the credentials
// provided by the googleCloud plugin in a production environment.
export const ai = genkit({
  plugins: [
    // The googleCloud plugin must be initialized before googleAI
    // to provide credentials in a production environment.
    process.env.GEMINI_API_KEY ? googleAI() : googleCloud(),
  ],
});
