import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client (can use mock if API key not provided)
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey !== 'your-openai-api-key-here') {
    return new OpenAI({ apiKey });
  }
  return null;
};

// AI Assistant chat endpoint
router.post('/chat',
  authenticate,
  [
    body('message').trim().notEmpty()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { message } = req.body;
      const openai = getOpenAIClient();

      // System prompt for campus assistant
      const systemPrompt = `You are a helpful AI assistant for a sustainable campus management system. 
You help users with:
- Booking campus resources (rooms, equipment, facilities)
- Finding and managing events
- Submitting maintenance requests
- General campus information and sustainability tips
- Navigation and campus services

Be friendly, concise, and helpful. If you don't know something, suggest contacting campus administration.`;

      if (openai) {
        // Real OpenAI API call
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
            ],
            max_tokens: 500,
            temperature: 0.7
          });

          const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
          res.json({ response, source: 'openai' });
        } catch (error: any) {
          console.error('OpenAI API error:', error);
          // Fallback to mock response
          res.json({
            response: generateMockResponse(message),
            source: 'mock'
          });
        }
      } else {
        // Mock response when OpenAI API key is not configured
        res.json({
          response: generateMockResponse(message),
          source: 'mock'
        });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Mock response generator for when OpenAI is not available
function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('book') || lowerMessage.includes('booking') || lowerMessage.includes('reserve')) {
    return 'To book a resource, go to the Booking section and select the resource type, name, and time slot. You can book rooms, equipment, or facilities. Make sure to check availability first!';
  }

  if (lowerMessage.includes('event') || lowerMessage.includes('schedule')) {
    return 'You can view all campus events in the Events section. To create a new event, click "Create Event" and fill in the details including title, date, time, and location.';
  }

  if (lowerMessage.includes('maintenance') || lowerMessage.includes('repair') || lowerMessage.includes('broken')) {
    return 'To submit a maintenance request, go to the Maintenance section and click "New Request". Provide details about the issue, location, and priority level. Our maintenance team will review it promptly.';
  }

  if (lowerMessage.includes('sustainability') || lowerMessage.includes('green') || lowerMessage.includes('eco')) {
    return 'Our campus is committed to sustainability! We have recycling programs, energy-efficient buildings, and green spaces. You can contribute by using resources responsibly and participating in campus sustainability events.';
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('how')) {
    return 'I can help you with bookings, events, maintenance requests, and general campus information. What would you like to know more about?';
  }

  return 'I understand you\'re asking about: "' + message + '". For specific help with bookings, events, or maintenance requests, please use the respective sections of the application. For other questions, feel free to contact campus administration.';
}

export default router;


