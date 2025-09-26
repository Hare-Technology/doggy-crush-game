import { config } from 'dotenv';
config();

// Import flows to ensure they are registered with Genkit.
import './flows/adapt-level-flow';
