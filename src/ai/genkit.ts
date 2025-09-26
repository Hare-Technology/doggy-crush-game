'use server';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {googleCloud} from '@genkit-ai/google-cloud';

export const ai = genkit({
  plugins: [
    // The googleCloud plugin must be initialized before googleAI
    // to provide credentials in a production environment.
    googleCloud(),
    googleAI({
      // The API key is configured in a .env file for local development.
      // In production, the googleCloud plugin provides authentication.
    }),
  ],
});
