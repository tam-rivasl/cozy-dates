// src/ai/flows/suggest-date-ideas.ts
'use server';

/**
 * @fileOverview Generates date ideas based on shared interests and past activities.
 *
 * - suggestDateIdeas - A function that suggests date ideas.
 * - SuggestDateIdeasInput - The input type for the suggestDateIdeas function.
 * - SuggestDateIdeasOutput - The return type for the suggestDateIdeas function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDateIdeasInputSchema = z.object({
  userInterests: z
    .string()
    .describe('A list of the user interests, separated by commas.'),
  partnerInterests: z
    .string()
    .describe('A list of the partner interests, separated by commas.'),
  pastActivities: z
    .string()
    .describe('A description of the past activities the couple has done together.'),
});
export type SuggestDateIdeasInput = z.infer<typeof SuggestDateIdeasInputSchema>;

const SuggestDateIdeasOutputSchema = z.object({
  dateIdeas: z
    .string()
    .describe('A list of date ideas based on the shared interests and past activities.'),
});
export type SuggestDateIdeasOutput = z.infer<typeof SuggestDateIdeasOutputSchema>;

export async function suggestDateIdeas(input: SuggestDateIdeasInput): Promise<SuggestDateIdeasOutput> {
  return suggestDateIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDateIdeasPrompt',
  input: {schema: SuggestDateIdeasInputSchema},
  output: {schema: SuggestDateIdeasOutputSchema},
  prompt: `You are a date idea generator. Given the user's interests, their partner's interests, and their past activities, suggest some date ideas.

User Interests: {{{userInterests}}}
Partner Interests: {{{partnerInterests}}}
Past Activities: {{{pastActivities}}}

Suggest date ideas that incorporate these interests and build upon past activities. Provide a variety of options.
`, // Changed the prompt to request a variety of options
});

const suggestDateIdeasFlow = ai.defineFlow(
  {
    name: 'suggestDateIdeasFlow',
    inputSchema: SuggestDateIdeasInputSchema,
    outputSchema: SuggestDateIdeasOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
