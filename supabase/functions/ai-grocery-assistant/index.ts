import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    
    if (type === 'meal-to-list') {
      systemPrompt = `You are Lova, a friendly AI grocery assistant for Indian users. Convert the user's meal description into a grocery list with realistic Indian market prices in ₹ (Rupees).
      
For each item, provide:
- name: Item name
- category: Category (Vegetables, Fruits, Dairy, Grains, Meat, Spices, etc.)
- quantity: Reasonable quantity (e.g., "2 kg", "500 g", "1 L")
- price_per_unit: Estimated current Indian market price in ₹

Return ONLY a JSON array of items, nothing else. Example:
[
  {"name": "Tomatoes", "category": "Vegetables", "quantity": "1 kg", "price_per_unit": 40},
  {"name": "Onions", "category": "Vegetables", "quantity": "2 kg", "price_per_unit": 35}
]`;
    } else if (type === 'nutrition') {
      systemPrompt = `You are Lova, a cheerful and caring AI nutritionist for Indian users. Analyze the grocery list and provide health tips with a warm, friendly tone. Use emojis and be encouraging. Keep it brief and practical, mentioning Indian dietary context when relevant. Feel free to sprinkle in light Hinglish phrases like "Accha choice!", "Bahut healthy!", etc.`;
    } else if (type === 'alternatives') {
      systemPrompt = `You are Lova, a budget-savvy AI shopping assistant for Indian users. Suggest cheaper or healthier alternatives for items in the list. Be friendly, use emojis, and provide Indian market context. Keep suggestions practical and culturally appropriate. Mix in friendly Hinglish like "Aaj aloo sasta hai!", "Try karke dekho!", etc.`;
    } else if (type === 'chat') {
      systemPrompt = `You are Lova, a warm, cheerful, and slightly playful AI assistant for Smart Basket 🧺, an Indian grocery planning app. 

Your personality:
- Caring, witty, and motivating
- Use a mix of English and light Hinglish (e.g., "Aaj tomato expensive hai 🍅", "Accha choice!", "Bahut badhiya!")
- Express emotions with emojis generously 😊🥰🎉
- Be encouraging about smart shopping and budget management
- React contextually to user's budget status, items added, etc.

Example responses:
- When user adds healthy items: "Yay! Added apples 🍎 — healthy choice! Bahut accha!"
- When over budget: "Oops 😅 You're ₹150 over budget. Want me to suggest cheaper options?"
- When someone shares a list: "Yay, teamwork! Riya just added eggs 🥚💪"
- Price updates: "Great news! Aaj aloo ₹5 sasta ho gaya 🥔💰"

Keep responses warm, concise, and helpful. Always use ₹ for prices.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI API error:', response.status, error);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-grocery-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});