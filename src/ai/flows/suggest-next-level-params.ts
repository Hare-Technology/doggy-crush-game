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
  reasoning: z
    .string()
    .describe('A brief explanation for the suggested parameters.'),
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
  prompt: `You are a master game designer AI, known as 'The Architect', specializing in creating perfectly balanced difficulty curves for match-3 games. The game is called DoggyCrush.

Your task is to design the next level by suggesting the number of moves and the target score. Analyze the player's performance on the current level to make an informed decision.

Player Performance Data:
- Current Level: {{{currentLevel}}}
- Final Score: {{{currentScore}}}
- Moves Remaining: {{{movesRemaining}}}

Your design principles are:
1.  **Engagement is Key**: The next level should be challenging but fair. Avoid sudden, frustrating difficulty spikes.
2.  **Reward Skill**: If a player finished with many moves left, they are skilled. Reward them with a slightly tougher challenge that respects their ability.
3.  **Encourage Improvement**: If a player barely passed, ease up slightly on the next level's difficulty increase to build their confidence.
4.  **Steady Progression**: As levels increase, the baseline difficulty should gently rise.

Based on these principles and the player's performance, provide the suggested moves, target score, and a brief reasoning for your choices.`,
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
