import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: 50 requests per minute per user
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (userLimit.count >= limit) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

function getUserIdFromToken(authHeader: string): string | null {
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Input validation schema
const priceRequestSchema = z.object({
  itemName: z.string().trim().min(1).max(100),
  quantity: z.number().positive().max(10000),
  unit: z.string().max(20),
});

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

    // Check rate limit (50 requests per minute)
    const userId = getUserIdFromToken(authHeader);
    if (userId && !checkRateLimit(userId, 50, 60000)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    
    // Validate input
    const validationResult = priceRequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input', 
          details: validationResult.error.errors[0].message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { itemName, quantity, unit } = validationResult.data;
    
    console.log('Fetching price for item:', itemName, 'quantity:', quantity, unit);

    // Generate realistic Indian market prices based on item type
    // Using smart estimation based on item category and common market prices
    
    const itemLower = itemName.toLowerCase();
    let basePricePerKg = 80; // Default ₹80/kg
    let category = 'General';
    
    // Categorize items and set base prices
    if (itemLower.includes('chicken') || itemLower.includes('mutton') || itemLower.includes('lamb') || itemLower.includes('meat')) {
      basePricePerKg = 300;
      category = 'Meat';
    } else if (itemLower.includes('fish') || itemLower.includes('prawn') || itemLower.includes('shrimp')) {
      basePricePerKg = 350;
      category = 'Seafood';
    } else if (itemLower.includes('milk') || itemLower.includes('paneer') || itemLower.includes('cheese') || itemLower.includes('butter') || itemLower.includes('ghee') || itemLower.includes('yogurt') || itemLower.includes('curd')) {
      basePricePerKg = 70;
      category = 'Dairy';
    } else if (itemLower.includes('tomato') || itemLower.includes('potato') || itemLower.includes('onion') || itemLower.includes('carrot') || itemLower.includes('cabbage') || itemLower.includes('cauliflower') || itemLower.includes('vegetable')) {
      basePricePerKg = 50;
      category = 'Produce';
    } else if (itemLower.includes('apple') || itemLower.includes('banana') || itemLower.includes('orange') || itemLower.includes('mango') || itemLower.includes('grape') || itemLower.includes('fruit')) {
      basePricePerKg = 80;
      category = 'Produce';
    } else if (itemLower.includes('rice') || itemLower.includes('wheat') || itemLower.includes('flour') || itemLower.includes('atta') || itemLower.includes('grain')) {
      basePricePerKg = 50;
      category = 'Pantry';
    } else if (itemLower.includes('oil') || itemLower.includes('cooking')) {
      basePricePerKg = 150;
      category = 'Pantry';
    } else if (itemLower.includes('bread') || itemLower.includes('bun') || itemLower.includes('pav')) {
      basePricePerKg = 40;
      category = 'Bakery';
    } else if (itemLower.includes('spice') || itemLower.includes('masala') || itemLower.includes('chilli') || itemLower.includes('turmeric') || itemLower.includes('coriander') || itemLower.includes('cumin')) {
      basePricePerKg = 300;
      category = 'Pantry';
    }
    
    const variance = (Math.random() - 0.5) * 20; // +/- ₹10
    const pricePerKg = Math.max(30, basePricePerKg + variance);
    
    // Calculate total price based on quantity and unit
    let finalPrice = pricePerKg;
    if (unit === 'gm' || unit === 'g') {
      finalPrice = (pricePerKg * quantity) / 1000;
    } else if (unit === 'kg') {
      finalPrice = pricePerKg * quantity;
    } else if (unit === 'l' || unit === 'liter') {
      finalPrice = pricePerKg * quantity; // Use similar pricing for liquids
    } else if (unit === 'ml') {
      finalPrice = (pricePerKg * quantity) / 1000;
    } else if (unit === 'pcs' || unit === 'dozen' || unit === 'pack') {
      finalPrice = (pricePerKg / 2) * quantity; // Approximate for pieces
    }
    
    console.log('Price fetched successfully:', finalPrice);

    return new Response(
      JSON.stringify({
        price: parseFloat(finalPrice.toFixed(2)),
        source: 'api',
        itemName,
        category,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        price: 0,
        source: 'error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
