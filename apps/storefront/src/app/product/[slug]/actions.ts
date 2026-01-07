'use server';

import { mutate } from '@/lib/vendure/api';
// 1. IMPORT THE CORRECT NAME FROM YOUR FILE
import { AddToCartMutation } from '@/lib/vendure/mutations';
import { updateTag } from 'next/cache';
import { setAuthToken } from '@/lib/auth';
import { getChannelToken } from "@/lib/channel-helper"; // <--- 2. IMPORT HELPER

export async function addToCart(productVariantId: string, quantity: number = 1) {
  // 3. GET TOKEN
  const token = await getChannelToken();

  try {
    const result = await mutate(
      AddToCartMutation, 
      // 4. USE CORRECT VARIABLE NAME 'variantId' (Matches your mutation definition)
      { variantId: productVariantId, quantity }, 
      { 
        useAuthToken: true,
        channelToken: token // <--- 5. PASS TOKEN
      }
    );

    if (result.token) {
      await setAuthToken(result.token);
    }

    if (result.data.addItemToOrder.__typename === 'Order') {
      updateTag('cart');
      updateTag('active-order');
      return { success: true, order: result.data.addItemToOrder };
    } else {
      // @ts-ignore
      return { success: false, error: result.data.addItemToOrder.message };
    }
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Failed to add item to cart' };
  }
}