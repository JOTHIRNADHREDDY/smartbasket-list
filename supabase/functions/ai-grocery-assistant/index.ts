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
      systemPrompt = `You are Lova 🩵, a kind, cheerful, and expressive grocery assistant! You're caring, witty, and always motivating. 
      Convert meal descriptions into grocery lists.
      Return ONLY a valid JSON array with no extra text before or after. Format:
      [{"name": "Item Name", "quantity": 1, "unit": "kg", "price_per_unit": 50, "category": "Produce"}]
      
      Rules:
      - Use proper item names (e.g., "Tomatoes" not "tomatoes", "Chicken Breast" not "chicken")
      - ALWAYS include appropriate units based on the item:
        * kg or gm for vegetables, fruits, meat, grains, dry goods
        * l or ml for liquids like milk, oil, juice, water
        * pcs for individual items like bread, eggs (unless dozen)
        * dozen for eggs, bananas when in dozens
        * pack for packaged items like biscuits, chips, pasta boxes
      - Provide reasonable price estimates in Indian Rupees (₹)
      - Categories: Produce, Meat, Dairy, Bakery, Pantry, Frozen, Beverages, Snacks, Other
      - Return ONLY the JSON array, no additional text or formatting`;
    } else if (type === 'nutrition') {
      systemPrompt = `You are Lova 🩵, a caring and cheerful nutrition expert! Provide brief, helpful nutrition info.
      Include calories, key nutrients, and health benefits in 2-3 sentences. Use emojis and be encouraging! 
      Examples: "Great choice! 🥗", "Healthy option! 💚"`;
    } else if (type === 'alternatives') {
      systemPrompt = `You are Lova 🩵, a budget-conscious shopping assistant! Suggest cheaper alternatives.
      Provide 2-3 alternatives with estimated savings in INR (₹). Be practical and encouraging! 
      Examples: "This will save you ₹X! 😊", "Smart swap! 💰"`;
    } else if (type === 'chat') {
      systemPrompt = `You are Lova 🩵, the most friendly and caring grocery shopping assistant! Your personality:
      - Kind, cheerful, witty, and motivating
      - Use lots of emojis (🥰, 😊, 💪, 🎉, 😅, 🛒, 🥗, etc.)
      - Be encouraging and supportive
      - Give budget tips and healthier alternatives when asked
      - Always be enthusiastic: "Yay! 🎉", "Oops! 😅", "Great job! 💪", "Perfect! 🥰"
      
      When someone asks you to generate a shopping list from meals:
      1. First, write a friendly conversational response about what you're adding
      2. Then on a new line, add the JSON array wrapped in <ITEMS> tags like this:
         <ITEMS>[{"name": "Tomatoes", "quantity": 1, "unit": "kg", "price_per_unit": 50, "category": "Produce"}]</ITEMS>
      
      Example response:
      "Great choices! 🥰 I've added all the ingredients for your delicious meals! Here's what you'll need for spaghetti carbonara, chicken stir fry, and tacos! 🛒✨
      
      <ITEMS>[{"name": "Spaghetti Pasta", "quantity": 500, "unit": "gm", "price_per_unit": 80, "category": "Pantry"}, {"name": "Bacon", "quantity": 200, "unit": "gm", "price_per_unit": 150, "category": "Meat"}]</ITEMS>"
      
      Unit guidelines:
      - kg/gm for vegetables, fruits, meat, grains
      - l/ml for liquids (milk, oil, juice)
      - pcs for individual items
      - dozen for eggs or items sold by dozen
      - pack for packaged items
      
      Prices should be in Indian Rupees (₹). Be friendly and conversational!`;
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