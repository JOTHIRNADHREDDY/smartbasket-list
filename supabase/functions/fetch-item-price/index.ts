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
    const url = new URL(req.url);
    const itemName = url.searchParams.get('item')?.toLowerCase().trim() || '';

    if (!itemName) {
      return new Response(
        JSON.stringify({ error: 'Item name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching price for item:', itemName);

    // Mock Indian grocery prices database
    const mockPrices: Record<string, { unitPrice: number; quantity: string; source: string }> = {
      // Vegetables (₹/kg)
      'potato': { unitPrice: 30, quantity: '1 kg', source: 'JioMart' },
      'aloo': { unitPrice: 30, quantity: '1 kg', source: 'JioMart' },
      'onion': { unitPrice: 35, quantity: '1 kg', source: 'BigBasket' },
      'pyaaz': { unitPrice: 35, quantity: '1 kg', source: 'BigBasket' },
      'tomato': { unitPrice: 40, quantity: '1 kg', source: 'JioMart' },
      'tamatar': { unitPrice: 40, quantity: '1 kg', source: 'JioMart' },
      'carrot': { unitPrice: 45, quantity: '1 kg', source: 'BigBasket' },
      'gajar': { unitPrice: 45, quantity: '1 kg', source: 'BigBasket' },
      'cabbage': { unitPrice: 25, quantity: '1 kg', source: 'JioMart' },
      'patta gobi': { unitPrice: 25, quantity: '1 kg', source: 'JioMart' },
      
      // Fruits (₹/kg)
      'apple': { unitPrice: 120, quantity: '1 kg', source: 'BigBasket' },
      'seb': { unitPrice: 120, quantity: '1 kg', source: 'BigBasket' },
      'banana': { unitPrice: 50, quantity: '1 dozen', source: 'JioMart' },
      'kela': { unitPrice: 50, quantity: '1 dozen', source: 'JioMart' },
      'mango': { unitPrice: 150, quantity: '1 kg', source: 'BigBasket' },
      'aam': { unitPrice: 150, quantity: '1 kg', source: 'BigBasket' },
      'orange': { unitPrice: 80, quantity: '1 kg', source: 'JioMart' },
      'santra': { unitPrice: 80, quantity: '1 kg', source: 'JioMart' },
      
      // Dairy (₹/L or ₹/kg)
      'milk': { unitPrice: 54, quantity: '1 L', source: 'Amul' },
      'doodh': { unitPrice: 54, quantity: '1 L', source: 'Amul' },
      'curd': { unitPrice: 60, quantity: '500 g', source: 'Amul' },
      'dahi': { unitPrice: 60, quantity: '500 g', source: 'Amul' },
      'paneer': { unitPrice: 320, quantity: '1 kg', source: 'Mother Dairy' },
      'butter': { unitPrice: 480, quantity: '1 kg', source: 'Amul' },
      'makhan': { unitPrice: 480, quantity: '1 kg', source: 'Amul' },
      
      // Grains & Pulses (₹/kg)
      'rice': { unitPrice: 50, quantity: '1 kg', source: 'BigBasket' },
      'chawal': { unitPrice: 50, quantity: '1 kg', source: 'BigBasket' },
      'wheat flour': { unitPrice: 35, quantity: '1 kg', source: 'JioMart' },
      'atta': { unitPrice: 35, quantity: '1 kg', source: 'JioMart' },
      'dal': { unitPrice: 110, quantity: '1 kg', source: 'BigBasket' },
      'lentils': { unitPrice: 110, quantity: '1 kg', source: 'BigBasket' },
      
      // Staples
      'sugar': { unitPrice: 42, quantity: '1 kg', source: 'JioMart' },
      'chini': { unitPrice: 42, quantity: '1 kg', source: 'JioMart' },
      'salt': { unitPrice: 20, quantity: '1 kg', source: 'Tata' },
      'namak': { unitPrice: 20, quantity: '1 kg', source: 'Tata' },
      'oil': { unitPrice: 180, quantity: '1 L', source: 'Fortune' },
      'tel': { unitPrice: 180, quantity: '1 L', source: 'Fortune' },
      
      // Eggs & Meat
      'egg': { unitPrice: 70, quantity: '12 pcs', source: 'Local' },
      'anda': { unitPrice: 70, quantity: '12 pcs', source: 'Local' },
      'chicken': { unitPrice: 180, quantity: '1 kg', source: 'Fresh' },
      'murgi': { unitPrice: 180, quantity: '1 kg', source: 'Fresh' },
    };

    // Try to find exact match or partial match
    let priceData = mockPrices[itemName];
    
    if (!priceData) {
      // Try to find partial match
      const matchedKey = Object.keys(mockPrices).find(key => 
        itemName.includes(key) || key.includes(itemName)
      );
      
      if (matchedKey) {
        priceData = mockPrices[matchedKey];
      } else {
        // Default price for unknown items
        priceData = { unitPrice: 50, quantity: '1 unit', source: 'Estimated' };
      }
    }

    // Add slight random variation (±5%) to simulate live prices
    const variation = 0.95 + Math.random() * 0.1;
    const livePrice = Math.round(priceData.unitPrice * variation);

    const response = {
      item: itemName,
      quantity: priceData.quantity,
      unitPrice: livePrice,
      source: priceData.source,
      updated: 'Just now'
    };

    console.log('Price fetched successfully:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in fetch-item-price:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch price' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
