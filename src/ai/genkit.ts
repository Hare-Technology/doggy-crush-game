import {genkit, getFirebaseApp} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase as firebasePlugin} from '@genkit-ai/firebase';
import {defineAuth, firebaseAuth} from '@genkit-ai/firebase/auth';
import {googleCloud} from '@genkit-ai/google-cloud';

export const ai = genkit({
  plugins: [
    firebasePlugin(),
    googleAI({
      // The API key is configured in a .env file.
      // You can create a new key in Google AI Studio:
      // https://aistudio.google.com/app/apikey
    }),
    // The googleCloud plugin is used to provide credentials in
    // a production environment.
    googleCloud(),
  ],
  // Log events to the console.
  logLevel: 'debug',
  // Use a more capable model for the main flow.
  model: 'googleai/gemini-2.5-flash',
});
