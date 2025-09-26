
'use server';
/**
 * @fileOverview An AI flow for dynamically adjusting game difficulty.
 *
 * - adaptLevel - A function that suggests new level parameters based on player performance.
 * - AdaptLevelInput - The input type for the adaptLevel function.
 * - AdaptLevelOutput - The return type for the adaptLevel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdaptLevelInputSchema = z.object({
  level: z.number().describe('The level the player just completed.'),
  score: z.number().describe('The final score achieved by the player.'),
  targetScore: z.number().describe('The target score for the completed level.'),
  movesLeft: z.number().describe('The number of moves the player had remaining.'),
  highestCombo: z.number().describe('The highest combo the player achieved.'),
  didWin: z.boolean().describe('Whether the player won or lost the level.'),
});
export type AdaptLevelInput = z.infer<typeof AdaptLevelInputSchema>;

const AdaptLevelOutputSchema = z.object({
    suggestedMoves: z.number().describe('The suggested number of moves for the next level.'),
    suggestedTargetScore: z.number().describe('The suggested target score for the next level.'),
    reasoning: z.string().describe('A brief, friendly explanation for the chosen difficulty adjustment. Address the player directly.'),
});
export type AdaptLevelOutput = z.infer<typeof AdaptLevelOutputSchema>;

const prompt = ai.definePrompt({
  name: 'adaptLevelPrompt',
  input: {schema: AdaptLevelInputSchema},
  output: {schema: AdaptLevelOutputSchema},
  prompt: `
    You are a Dynamic Game Difficulty Balancer for a match-3 game called DoggyCrush.
    Your job is to analyze a player's performance on a completed level and adjust the difficulty for the next one.
    
    Analyze the following player data:
    - Level Completed: {{level}}
    - Player Score: {{score}}
    - Target Score: {{targetScore}}
    - Moves Left: {{movesLeft}}
    - Highest Combo: {{highestCombo}}
    - Won Level: {{didWin}}

    Your goal is to keep the player engaged. If they are struggling, make it a bit easier. If they are breezing through, make it a bit harder.

    - If the player LOST (didWin: false), always make the next level EASIER. Give them more moves and/or a lower target score.
    - If the player WON (didWin: true):
      - If they won with very few moves left (e.g., 0-3) or barely met the score, keep the difficulty about the same or slightly easier.
      - If they won with many moves left (e.g., 10+) or crushed the target score, make the next level HARDER by reducing moves and increasing the target.
      - If it was a solid win but not a blowout, increase the difficulty moderately.

    Constraints for the next level (level + 1):
    - Moves must be between 10 and 35.
    - Target Score should increase with each level, generally between 500 and 2000 points more than the previous level's target, but can be adjusted based on difficulty.

    Based on your analysis, provide the suggested moves, target score, and a friendly reasoning message for the player.
  `,
});


export async function adaptLevel(input: AdaptLevelInput): Promise<AdaptLevelOutput> {
  const {output} = await prompt(input);
  if (!output) {
    throw new Error('The AI failed to suggest level parameters.');
  }
  return output;
}
