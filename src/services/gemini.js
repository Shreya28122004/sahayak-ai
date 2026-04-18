import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

export async function scorePriority(need) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
You are an AI assistant helping NGOs prioritize community needs.
Analyze this community need and return a JSON response only.

Need Title: ${need.title}
Description: ${need.description}
Category: ${need.category}
Location: ${need.location}
People Affected: ${need.peopleAffected}

Return ONLY this JSON (no extra text):
{
  "score": <number from 1-10>,
  "urgency": "<Critical|High|Medium|Low>",
  "explanation": "<2-3 sentences explaining why this need has this priority score>"
}
    `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch (error) {
        console.error('Gemini scoring error:', error);
        return {
            score: 5,
            urgency: 'Medium',
            explanation: 'Automated scoring unavailable. Manual review needed.',
        };
    }
}

export async function matchVolunteers(need, volunteers) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const volunteerList = volunteers
            .map(
                (v, i) =>
                    `${i + 1}. Name: ${v.name}, Skills: ${v.skills?.join(', ')}, Location: ${v.location}, Availability: ${v.availability}`
            )
            .join('\n');

        const prompt = `
You are an AI assistant helping match volunteers to community needs.

Community Need:
Title: ${need.title}
Description: ${need.description}
Category: ${need.category}
Location: ${need.location}

Available Volunteers:
${volunteerList}

Return ONLY this JSON (no extra text):
{
  "matches": [
    {
      "volunteerIndex": <0-based index>,
      "matchScore": <1-10>,
      "reason": "<1-2 sentences why this volunteer is a good match>"
    }
  ]
}
Return top 3 matches only, sorted by matchScore descending.
    `;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch (error) {
        console.error('Gemini matching error:', error);
        return { matches: [] };
    }
}