import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    // The googleAI plugin automatically uses Google Cloud credentials in production
    // when the @genkit-ai/google-cloud package is installed.
    googleAI(),
  ],
});
