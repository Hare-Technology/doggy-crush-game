import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    // The googleCloud plugin, when installed, automatically provides
    // credentials for googleAI in a production environment.
    // It does not need to be explicitly listed in the plugins array.
    googleAI(),
  ],
});
