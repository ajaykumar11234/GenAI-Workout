import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run(prompt) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 4096
        });
        
        const text = completion.choices[0]?.message?.content || "";
        return text;
    } catch (error) {
        console.error("Error generating content:", error);
        throw error;
    }
}
export { run };