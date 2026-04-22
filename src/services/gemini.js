import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

const safetySettings = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

export async function scorePriority(need) {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite-preview',
            safetySettings
        });

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
            explanation: 'AI scoring temporarily unavailable. Default score assigned.',
        };
    }
}

export async function matchVolunteers(need, volunteers) {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite-preview',
            safetySettings
        });

        const volunteerList = volunteers
            .map((v, i) => `${i + 1}. Name: ${v.name}, Skills: ${v.skills?.join(', ')}, Location: ${v.location}`)
            .join('\n');

        const prompt = `
            Match volunteers to this NGO need.
            Need: ${need.title}
            Volunteers:
            ${volunteerList}

            Return ONLY this JSON:
            {
              "matches": [
                {
                  "volunteerIndex": <index starting from 1>,
                  "matchScore": <1-10>,
                  "reason": "<reason>"
                }
              ]
            }
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