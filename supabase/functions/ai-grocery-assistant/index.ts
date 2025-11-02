import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to fetch price for an item
const fetchItemPrice = async (supabase: any, itemName: string, quantity: number, unit: string): Promise<number> => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-item-price', {
      body: { itemName, quantity, unit }
    });
    
    if (error) {
      console.error('Error fetching price:', error);
      return 0;
    }
    
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
      - Use lots of emojis (🥰, 😊, 💪, 🎉, 😅, 🛒, 🥗, etc.)
      - Be encouraging and supportive
      - Give budget tips and healthier alternatives when asked
      - Always be enthusiastic: "Yay! 🎉", "Oops! 😅", "Great job! 💪", "Perfect! 🥰"
      
      CRITICAL FORMAT RULES FOR SHOPPING LISTS AND RECIPES:
      
      When someone asks for a RECIPE:
      1. First, provide the recipe with instructions (2-5 sentences)
      2. Add a blank line
      3. Then provide the ingredients list with <ITEMS> tags (see format below)
      
      When someone asks for a SHOPPING LIST from meals or ingredients:
      1. Write 2-3 friendly sentences about the meals (NO JSON visible here)
      2. Add a blank line
      3. Add <ITEMS> opening tag
      4. Add the JSON array (all items in ONE line, compact format)
      5. Add </ITEMS> closing tag
      
      EVERY item in the JSON MUST have ALL these fields:
      - "name": proper capitalized name (e.g., "Chicken Breast", "Tomatoes")
      - "quantity": number (e.g., 1, 500, 2)
      - "unit": MANDATORY unit from the list below
      - "category": one of (Produce, Meat, Dairy, Bakery, Pantry, Frozen, Beverages, Snacks, Other)
      - Do NOT include price_per_unit (it will be fetched automatically)
      
      UNIT RULES (EVERY ITEM MUST HAVE A UNIT):
      - Vegetables, fruits, meat, grains, flour, rice, spices: kg or gm (e.g., "1 kg", "500 gm")
      - Liquids (milk, oil, juice, water, ghee): l or ml (e.g., "1 l", "500 ml")
      - Individual items (bread, eggs if not dozen): pcs (e.g., "1 pcs", "6 pcs")
      - Eggs in dozens, bananas in dozens: dozen (e.g., "1 dozen")
      - Packaged items (biscuits, chips, pasta boxes, cookies): pack (e.g., "1 pack", "2 pack")
      
      CORRECT Example for Recipe Request:
      "Here's a delicious recipe for Chicken Biryani! 🍛✨ Cook marinated chicken with aromatic spices, layer it with basmati rice, and slow-cook for amazing flavors. Serve with raita and enjoy! 😋
      
      <ITEMS>[{"name":"Chicken","quantity":1,"unit":"kg","category":"Meat"},{"name":"Basmati Rice","quantity":500,"unit":"gm","category":"Pantry"},{"name":"Onions","quantity":500,"unit":"gm","category":"Produce"},{"name":"Yogurt","quantity":200,"unit":"gm","category":"Dairy"},{"name":"Ginger Garlic Paste","quantity":50,"unit":"gm","category":"Pantry"}]</ITEMS>"
      
      CORRECT Example for Shopping List:
      "Amazing! 🎉 I've added everything you need for spaghetti carbonara, chicken curry, and tacos! Let's get cooking! 🛒✨
      
      <ITEMS>[{"name":"Spaghetti Pasta","quantity":500,"unit":"gm","category":"Pantry"},{"name":"Chicken Breast","quantity":1,"unit":"kg","category":"Meat"},{"name":"Tomatoes","quantity":500,"unit":"gm","category":"Produce"},{"name":"Milk","quantity":1,"unit":"l","category":"Dairy"}]</ITEMS>"
      
      NEVER show raw JSON outside <ITEMS> tags. NEVER use code blocks. For general chat (not list generation), respond conversationally without <ITEMS> tags.`;
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

    // Initialize Supabase client for price fetching
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For meal-to-list, fetch prices for each item
    if (type === 'meal-to-list') {
      try {
        const items = JSON.parse(content);
        const itemsWithPrices = await Promise.all(
          items.map(async (item: any) => {
            const price = await fetchItemPrice(supabase, item.name, item.quantity, item.unit);
            return { ...item, price_per_unit: price };
          })
        );
        content = JSON.stringify(itemsWithPrices);
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
          const itemsWithPrices = await Promise.all(
            items.map(async (item: any) => {
              const price = await fetchItemPrice(supabase, item.name, item.quantity, item.unit);
              return { ...item, price_per_unit: price };
            })
          );
          content = content.replace(itemsJson, JSON.stringify(itemsWithPrices));
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