'use server';

/**
 * @fileOverview An AI agent that suggests the number of moves and the target score for the next level.
 *
 * - suggestNextLevelParams - A function that handles the suggestion of next level parameters.
 * - SuggestNextLevelParamsInput - The input type for the suggestNextLevelParams function.
 * - SuggestNextLevelParamsOutput - The return type for the suggestNextLevelParams function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextLevelParamsInputSchema = z.object({
  currentLevel: z
    .number()
    .describe('The current level the player is on, starting from 1.'),
  currentScore: z.number().describe('The player current score.'),
  movesRemaining: z.number().describe('The number of moves the player had remaining at the end of the last level.'),
});
export type SuggestNextLevelParamsInput = z.infer<typeof SuggestNextLevelParamsInputSchema>;

const SuggestNextLevelParamsOutputSchema = z.object({
  suggestedMoves: z
    .number()
    .describe('The suggested number of moves for the next level.'),
  suggestedTargetScore: z
    .number()
    .describe('The suggested target score for the next level.'),
});
export type SuggestNextLevelParamsOutput = z.infer<typeof SuggestNextLevelParamsOutputSchema>;

export async function suggestNextLevelParams(
  input: SuggestNextLevelParamsInput
): Promise<SuggestNextLevelParamsOutput> {
  return suggestNextLevelParamsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextLevelParamsPrompt',
  input: {schema: SuggestNextLevelParamsInputSchema},
  output: {schema: SuggestNextLevelParamsOutputSchema},
  prompt: `You are an expert game designer, specializing in level design and difficulty curve.

You are designing the next level for a match 3 game. The game is called DoggyCrush Saga and it has dog-themed tiles.

Based on the player's performance on the current level, suggest the number of moves and the target score for the next level to make it appropriately challenging.

Here's the player's performance on the current level:
- Current level: {{{currentLevel}}}
- Current score: {{{currentScore}}}
- Moves remaining: {{{movesRemaining}}}

Consider the following when suggesting the number of moves and the target score:
- The number of moves should be enough to allow the player to reach the target score, but not too many that it becomes too easy.
- The target score should be high enough to be challenging, but not so high that it becomes frustrating.
- The higher the level is, the more difficult it should be. But consider how well the player did on the previous level, and don't increase difficulty too sharply.

Suggested number of moves: {{suggestedMoves}}
Suggested target score: {{suggestedTargetScore}}`,
});

const suggestNextLevelParamsFlow = ai.defineFlow(
  {
    name: 'suggestNextLevelParamsFlow',
    inputSchema: SuggestNextLevelParamsInputSchema,
    outputSchema: SuggestNextLevelParamsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
