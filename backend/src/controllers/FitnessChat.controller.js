import Groq from "groq-sdk";
import { asyncHandler } from "../asyncHandler.js";
import { ApiSuccess } from "../utils/ApiSuccess.js";
import { ApiError } from "../utils/ApiError.js";

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fitnessChatController = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    throw new ApiError(400, "Message is required");
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional fitness and nutrition expert assistant. Your role is to provide helpful, accurate, and safe fitness advice. 

Key guidelines:
- Provide evidence-based fitness and nutrition advice
- Be encouraging and motivational
- Always emphasize safety and proper form
- Recommend consulting healthcare professionals for medical conditions
- Suggest modifications for different fitness levels
- Include practical tips and actionable advice
- Be concise but informative`
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024
    });

    const text = completion.choices[0]?.message?.content || "";

    return res
      .status(200)
      .json(new ApiSuccess(200, { response: text }, "Response generated successfully"));
  } catch (error) {
    console.error("Groq API Error:", error);
    throw new ApiError(500, "Failed to generate response. Please try again.");
  }
});

export { fitnessChatController };
