import { config } from 'dotenv';
config();

import '@/ai/flows/grade-answer.ts';
import '@/ai/flows/summarize-answer-feedback.ts';
import '@/ai/flows/suggest-time-limits.ts';
