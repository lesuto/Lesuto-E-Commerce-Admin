'use server';

import {mutate} from '@/lib/vendure/api';
import {
    RemoveFromCartMutation,
    AdjustCartItemMutation,
    ApplyPromotionCodeMutation,
    RemovePromotionCodeMutation
} from '@/lib/vendure/mutations';
import {updateTag} from 'next/cache';
import { getChannelToken } from "@/lib/channel-helper"; // <--- 1. IMPORT

export async function removeFromCart(lineId: string) {
    const token = await getChannelToken(); // <--- 2. GET TOKEN
    
    // 3. PASS TOKEN
    await mutate(RemoveFromCartMutation, {lineId}, {
        useAuthToken: true,
        channelToken: token 
    });
    updateTag('cart');
}

export async function adjustQuantity(lineId: string, quantity: number) {
    const token = await getChannelToken(); // <--- 2. GET TOKEN

    await mutate(AdjustCartItemMutation, {lineId, quantity}, {
        useAuthToken: true,
        channelToken: token 
    });
    updateTag('cart');
}

export async function applyPromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;
    const token = await getChannelToken(); // <--- 2. GET TOKEN

    const res = await mutate(ApplyPromotionCodeMutation, {couponCode: code}, {
        useAuthToken: true,
        channelToken: token
    });
    console.log({res: res.data.applyCouponCode})
    updateTag('cart');
}

export async function removePromotionCode(formData: FormData) {
    const code = formData.get('code') as string;
    if (!code) return;
    const token = await getChannelToken(); // <--- 2. GET TOKEN

    const res = await mutate(RemovePromotionCodeMutation, {couponCode: code}, {
        useAuthToken: true,
        channelToken: token
    });
    console.log({removeRes: res.data.removeCouponCode});
    updateTag('cart');
}