import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware";
import OpenAI from "openai";

const router = express.Router();

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY in environment variables");
    return null;
  }
  return new OpenAI({ apiKey });
};

// AI Assistant chat endpoint
router.post(
  "/chat",
  authenticate,
  [body("message").trim().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { message } = req.body;
      const openai = getOpenAIClient();

      const systemPrompt = `You are a helpful AI assistant for a sustainable campus management system. 
You help users with:
- Booking campus resources (rooms, equipment, facilities)
- Finding and managing events
- Submitting maintenance requests
- General campus information and sustainability tips
- Navigation and campus services

Be friendly, concise, and helpful. If you don't know something, suggest contacting campus administration.`;

      if (openai) {
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          });

          const responseText =
            completion.choices[0]?.message?.content ||
            "Sorry, I could not generate a response.";

          res.json({ response: responseText, source: "openai" });
        } catch (error: any) {
          console.error("OpenAI API error:", error);
          res.json({
            response: generateMockResponse(message),
            source: "mock",
          });
        }
      } else {
        res.json({
          response: generateMockResponse(message),
          source: "mock",
        });
      }
    } catch (error: any) {
      console.error("Chat endpoint error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/test-openai", async (req: Request, res: Response) => {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say hello from GPT" }],
    });
    res.send(completion.choices[0].message.content);
  } catch (err: any) {
    console.error("OpenAI test error:", err.message);
    res.status(500).send("OpenAI test failed: " + err.message);
  }
});


function generateMockResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("book") || lower.includes("reserve")) {
    return "To book a resource, go to the Booking section and select the resource type, name, and time slot.";
  }

  if (lower.includes("event") || lower.includes("schedule")) {
    return "You can view all campus events in the Events section or create one under 'Create Event'.";
  }

  if (lower.includes("maintenance") || lower.includes("repair")) {
    return "To submit a maintenance request, go to the Maintenance section and click 'New Request'.";
  }

  if (lower.includes("sustainability") || lower.includes("green")) {
    return "Our campus promotes sustainability. Join recycling and energy-saving initiatives.";
  }

  return `I understand you're asking about "${message}". Please specify if it’s about bookings, events, or maintenance.`;
}

export default router;