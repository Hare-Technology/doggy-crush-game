import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {googleCloud} from '@genkit-ai/google-cloud';

export const ai = genkit({
  plugins: [
    // The googleCloud plugin must be initialized before googleAI
    // to provide credentials in a production environment.
    googleCloud,
    googleAI(),
  ],
});
