// Suggests time limits for each question in an exam based on the total duration and question details.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuestionInfoSchema = z.object({
  text: z.string().describe('The text of the question.'),
  type: z.string().describe('The type of question (e.g., descriptive, fill-in-the-blank).'),
  points: z.number().describe('The points allocated to the question.'),
});

const SuggestTimeLimitsInputSchema = z.object({
  totalDurationInMinutes: z.number().describe('The total duration of the exam in minutes.'),
  questions: z.array(QuestionInfoSchema).describe('An array of questions in the exam.'),
});
export type SuggestTimeLimitsInput = z.infer<typeof SuggestTimeLimitsInputSchema>;

const SuggestTimeLimitsOutputSchema = z.object({
  suggestedTimesInSeconds: z.array(z.number()).describe('An array of suggested time limits in seconds for each question.'),
});
export type SuggestTimeLimitsOutput = z.infer<typeof SuggestTimeLimitsOutputSchema>;


export async function suggestTimeLimits(
  input: SuggestTimeLimitsInput
): Promise<SuggestTimeLimitsOutput> {
  return suggestTimeLimitsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'suggestTimeLimitsPrompt',
  input: {schema: SuggestTimeLimitsInputSchema},
  output: {schema: SuggestTimeLimitsOutputSchema},
  prompt: `あなたは教育設計の専門家です。試験全体の所要時間と問題リストを基に、各問題の理想的な制限時間を提案してください。

試験全体の所要時間: {{totalDurationInMinutes}}分

問題リスト:
{{#each questions}}
- 問題{{@index}}:
  - タイプ: {{this.type}}
  - 配点: {{this.points}}
  - 問題文: "{{this.text}}"
{{/each}}

提案のルール:
1. 各問題の複雑さ、タイプ（記述式は時間がかかる）、配点を考慮して時間を配分してください。
2. 提案された各問題の時間の合計は、試験全体の所要時間を超えないようにしてください。
3. 各問題の提案時間は秒単位の整数でなければなりません。
4. 出力は、問題の順序に対応した秒数の配列（suggestedTimesInSeconds）のみを含むJSONオブジェクトでなければなりません。`,
});

const suggestTimeLimitsFlow = ai.defineFlow(
  {
    name: 'suggestTimeLimitsFlow',
    inputSchema: SuggestTimeLimitsInputSchema,
    outputSchema: SuggestTimeLimitsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
