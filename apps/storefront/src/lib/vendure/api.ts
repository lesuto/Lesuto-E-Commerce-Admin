import type { TadaDocumentNode } from 'gql.tada';
import { print } from 'graphql';
import { getAuthToken } from '@/lib/auth';
// REMOVE: import { getChannelToken } from '@/lib/channel-helper';

const VENDURE_API_URL = (process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api').replace('localhost', '127.0.0.1');
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

interface VendureRequestOptions {
    token?: string;
    useAuthToken?: boolean;
    channelToken?: string;
    fetch?: RequestInit;
    tags?: string[];
}

export async function query<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    const { token, useAuthToken, channelToken, fetch: fetchOptions, tags } = options || {};

    const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions?.headers as Record<string, string>),
    };

    let authToken = token;
    if (useAuthToken && !authToken) {
        authToken = await getAuthToken();
    }
    if (authToken) {
        reqHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    // THE FIX: Only use what is explicitly passed or default. No "magic" auto-detection here.
    // This prevents the "headers() inside cache" crash.
    reqHeaders[VENDURE_CHANNEL_TOKEN_HEADER] = channelToken || VENDURE_CHANNEL_TOKEN;

    const response = await fetch(VENDURE_API_URL!, {
        ...fetchOptions,
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
            query: print(document),
            variables: variables || {},
        }),
        ...(tags && { next: { tags } }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();
    if (result.errors) throw new Error(result.errors.map((e: any) => e.message).join(', '));
    if (!result.data) throw new Error('No data returned');

    return {
        data: result.data,
        ...(response.headers.get(VENDURE_AUTH_TOKEN_HEADER) && { token: response.headers.get(VENDURE_AUTH_TOKEN_HEADER)! }),
    };
}

export async function mutate<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    // @ts-expect-error - inference
    return query(document, variables, options);
}