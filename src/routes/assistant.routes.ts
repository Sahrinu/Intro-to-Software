import express, { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { authenticate } from "../middleware/auth.middleware";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = express.Router();

// Store conversation history per user (in-memory storage, last 5 messages)
const conversationHistory = new Map<number, Array<{ role: string; content: string }>>();

// Initialize Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing GEMINI_API_KEY in environment variables");
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
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
      const userId = (req as any).user.id;
      const genAI = getGeminiClient();

      // Get or initialize conversation history for this user
      if (!conversationHistory.has(userId)) {
        conversationHistory.set(userId, []);
      }
      const history = conversationHistory.get(userId)!;

      const systemPrompt = `You are a helpful AI assistant for a sustainable campus management system. 

IMPORTANT: You provide information and guidance only. You CANNOT directly create bookings, events, or maintenance requests. Users must use the system's forms.

When users ask about creating something, tell them EXACTLY what fields to fill in:

FOR EVENTS (go to Events page, click "Create Event"):
Required fields:
- Title: Name of the event
- Location: Where the event will be held
- Start Time: When the event starts (date and time)
- End Time: When the event ends (date and time)
- category: type of event
- description: details about the event

That's it! Just these 6 required fields and no optional fields. Events created by regular users need admin approval.

FOR BOOKINGS (go to Bookings page):
Required fields:
- Resource Type: Type of resource needed
- Resource Name: Specific resource to book
- Start Time: When booking starts
- End Time: When booking ends
- Reason for booking


FOR MAINTENANCE (go to Maintenance page, click "New Request"):
Required fields:
- Title: Brief description
- Description: Details of the issue
- Location: Where the issue is
- Priority: low, medium, high, or urgent

Be concise (2-3 sentences max). Don't ask users for information - just guide them to the right page and list the required fields.`;

      if (genAI) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
          
          // Build conversation context with history
          let conversationContext = systemPrompt + "\n\n";
          
          // Add previous conversation history (last 5 exchanges)
          history.forEach((entry) => {
            if (entry.role === "user") {
              conversationContext += `User: ${entry.content}\n\n`;
            } else {
              conversationContext += `Assistant: ${entry.content}\n\n`;
            }
          });
          
          // Add current message
          conversationContext += `User: ${message}\n\nAssistant:`;
          
          const result = await model.generateContent(conversationContext);
          const response = await result.response;
          const responseText = response.text() || "Sorry, I could not generate a response.";

          // Store conversation in history (keep only last 5 exchanges = 10 messages)
          history.push({ role: "user", content: message });
          history.push({ role: "assistant", content: responseText });
          
          // Keep only last 5 exchanges (10 messages)
          if (history.length > 10) {
            history.splice(0, history.length - 10);
          }

          res.json({ response: responseText, source: "gemini" });
        } catch (error: any) {
          console.error("Gemini API error:", error);
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

router.get("/test-gemini", async (req: Request, res: Response) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Say hello from Gemini");
    const response = await result.response;
    res.send(response.text());
  } catch (err: any) {
    console.error("Gemini test error:", err.message);
    res.status(500).send("Gemini test failed: " + err.message);
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