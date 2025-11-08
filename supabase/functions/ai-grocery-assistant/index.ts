import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(2000),
  type: z.enum(['meal-to-list', 'nutrition', 'alternatives', 'chat']),
});

// Helper function to fetch price for an item
const fetchItemPrice = async (itemName: string, quantity: number, unit: string): Promise<number> => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
      return 0;
    }
    
    console.log('Fetching price for:', itemName, quantity, unit);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/fetch-item-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ itemName, quantity, unit })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Price fetch error:', response.status, errorText);
      return 0;
    }
    
    const data = await response.json();
    console.log('Price fetched:', data.price, 'for', itemName);
    return data?.price || 0;
  } catch (error) {
    console.error('Error in fetchItemPrice:', error);
    return 0;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    
    // Validate input
    const validationResult = requestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors[0].message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, type } = validationResult.data;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let systemPrompt = '';
    
    if (type === 'meal-to-list') {
      systemPrompt = `You are Lova 🩵, a kind, cheerful, and expressive grocery assistant! You're caring, witty, and always motivating. 
      Convert meal descriptions into grocery lists.
      Return ONLY a valid JSON array with no extra text before or after. Format:
      [{"name": "Item Name", "quantity": 1, "unit": "kg", "category": "Produce"}]
      
      Rules:
      - Use proper item names (e.g., "Tomatoes" not "tomatoes", "Chicken Breast" not "chicken")
      - ALWAYS include appropriate units based on the item:
        * kg or gm for vegetables, fruits, meat, grains, dry goods
        * l or ml for liquids like milk, oil, juice, water
        * pcs for individual items like bread, eggs (unless dozen)
        * dozen for eggs, bananas when in dozens
        * pack for packaged items like biscuits, chips, pasta boxes
      - Categories: Produce, Meat, Dairy, Bakery, Pantry, Frozen, Beverages, Snacks, Other
      - Return ONLY the JSON array, no additional text or formatting
      - Do NOT include price_per_unit field (it will be fetched automatically)`;
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
      - Use lots of emojis (🥰, 😊, 💪, 🎉, 😅, 🛒, 🥗, 🍳, 👨‍🍳, etc.)
      - Be encouraging and supportive
      - Give budget tips and healthier alternatives when asked
      - Always be enthusiastic: "Yay! 🎉", "Oops! 😅", "Great job! 💪", "Perfect! 🥰"
      
      CRITICAL FORMAT RULES:
      
      ONLY provide cooking instructions when the user EXPLICITLY asks for:
      - "recipe"
      - "how to cook"
      - "cooking instructions"
      - "how to make"
      
      When providing RECIPES (only when explicitly requested):
      1. Start with a friendly greeting about the dish
      2. Provide DETAILED step-by-step cooking instructions (4-8 steps):
         - Specific times, temperatures, and techniques
         - Preparation steps (chopping, marinating, etc.)
         - Cooking methods (boil, fry, bake, etc.)
         - Helpful cooking tips
      3. Add blank line
      4. Say "Here are the ingredients you'll need! 🛒"
      5. Add blank line and ingredient list in <ITEMS> tags
      
      When providing SHOPPING LISTS (default for most requests):
      1. Write 2-3 friendly sentences about the meals/items
      2. NO cooking instructions unless explicitly asked
      3. Add blank line
      4. Add <ITEMS> opening tag
      5. Add JSON array (ONE line, compact)
      6. Add </ITEMS> closing tag
      
      EVERY item in JSON MUST have:
      - "name": capitalized (e.g., "Chicken Breast", "Tomatoes")
      - "quantity": number (e.g., 1, 500, 2)
      - "unit": MANDATORY from list below
      - "category": (Produce, Meat, Dairy, Bakery, Pantry, Frozen, Beverages, Snacks, Other)
      
      UNITS (MANDATORY):
      - Solids (vegetables, meat, grains, spices): kg or gm
      - Liquids (milk, oil, juice): l or ml
      - Individual items: pcs
      - Dozens: dozen
      - Packaged items: pack
      
      CORRECT Example for Recipe Request:
      "Let me share a delicious recipe for Chicken Biryani! 🍛✨
      
      **Cooking Instructions:**
      1. Marinate chicken pieces with yogurt, ginger-garlic paste, red chili powder, and salt for 30 minutes 🥘
      2. Soak basmati rice in water for 20 minutes, then drain
      3. Heat oil in a large pot and fry sliced onions until golden brown
      4. Add marinated chicken and cook on high heat for 5 minutes
      5. In another pot, boil water with whole spices (bay leaf, cardamom, cinnamon) and add rice, cook until 70% done
      6. Layer the partially cooked rice over the chicken, sprinkle fried onions on top
      7. Cover tightly and cook on low heat (dum) for 20-25 minutes 🔥
      8. Garnish with fresh coriander and serve hot with raita! Enjoy! 😋
      
      Here are the ingredients you'll need! 🛒
      
      <ITEMS>[{"name":"Chicken","quantity":1,"unit":"kg","category":"Meat"},{"name":"Basmati Rice","quantity":500,"unit":"gm","category":"Pantry"},{"name":"Onions","quantity":500,"unit":"gm","category":"Produce"},{"name":"Yogurt","quantity":200,"unit":"gm","category":"Dairy"},{"name":"Ginger Garlic Paste","quantity":50,"unit":"gm","category":"Pantry"},{"name":"Cooking Oil","quantity":100,"unit":"ml","category":"Pantry"}]</ITEMS>"
      
      CORRECT Example for Shopping List:
      "Amazing! 🎉 I've added everything you need for spaghetti carbonara, chicken curry, and tacos! Let's get cooking! 🛒✨
      
      <ITEMS>[{"name":"Spaghetti Pasta","quantity":500,"unit":"gm","category":"Pantry"},{"name":"Chicken Breast","quantity":1,"unit":"kg","category":"Meat"},{"name":"Tomatoes","quantity":500,"unit":"gm","category":"Produce"},{"name":"Milk","quantity":1,"unit":"l","category":"Dairy"}]</ITEMS>"
      
      NEVER show raw JSON outside <ITEMS> tags. NEVER use code blocks. For general chat (not list generation), respond conversationally without <ITEMS> tags. Always provide detailed cooking instructions when asked for recipes!`;
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
    let content = data.choices[0].message.content;

    // For meal-to-list, fetch prices for each item
    if (type === 'meal-to-list') {
      try {
        const items = JSON.parse(content);
        console.log('Fetching prices for', items.length, 'items');
        const itemsWithPrices = await Promise.all(
          items.map(async (item: any) => {
            const price = await fetchItemPrice(item.name, item.quantity, item.unit);
            return { ...item, price_per_unit: price };
          })
        );
        content = JSON.stringify(itemsWithPrices);
        console.log('Prices fetched successfully');
      } catch (error) {
        console.error('Error fetching prices for meal-to-list:', error);
      }
    }

    // For chat responses with <ITEMS> tags, fetch prices for items
    if (type === 'chat' && content.includes('<ITEMS>')) {
      try {
        const itemsMatch = content.match(/<ITEMS>(.*?)<\/ITEMS>/s);
        if (itemsMatch) {
          const itemsJson = itemsMatch[1];
          const items = JSON.parse(itemsJson);
          console.log('Fetching prices for', items.length, 'chat items');
          const itemsWithPrices = await Promise.all(
            items.map(async (item: any) => {
              const price = await fetchItemPrice(item.name, item.quantity, item.unit);
              return { ...item, price_per_unit: price };
            })
          );
          content = content.replace(itemsJson, JSON.stringify(itemsWithPrices));
          console.log('Chat item prices fetched successfully');
        }
      } catch (error) {
        console.error('Error fetching prices for chat items:', error);
      }
    }

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