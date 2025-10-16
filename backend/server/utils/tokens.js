import axios from 'axios';
import qs from 'qs';
import { CONFIG } from '../config/env.js';

export async function refreshAccessTokenIfNeeded(merchant) {
        if (!merchant?.tokens?.refresh_token) return merchant;

        const expMs = merchant.tokens.expires_at ? new Date(merchant.tokens.expires_at).getTime() : 0;
        const aboutToExpire = Date.now() > (expMs - 60 * 1000);

        if (!aboutToExpire) return merchant;

        try {
                const resp = await axios.post(
                        CONFIG.TOKEN_URL,
                        qs.stringify({
                                grant_type: 'refresh_token',
                                refresh_token: merchant.tokens.refresh_token,
                                client_id: CONFIG.CLIENT_ID,
                                client_secret: CONFIG.CLIENT_SECRET
                        }),
                        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
                );

                const t = resp.data;
                if (t.expires_in) t.expires_at = new Date(Date.now() + t.expires_in * 1000);

                merchant.tokens = {
                        access_token: t.access_token || merchant.tokens.access_token,
                        refresh_token: t.refresh_token || merchant.tokens.refresh_token,
                        token_type: t.token_type || merchant.tokens.token_type,
                        scope: t.scope || merchant.tokens.scope,
                        expires_at: t.expires_at || merchant.tokens.expires_at,
                        oauth_invalid: false
                };

                await merchant.save();
                return merchant;
        } catch (err) {
                const status = err.response?.status;
                if (status === 400 || status === 401) {
                        merchant.tokens.oauth_invalid = true;
                        await merchant.save();
                }
                throw err;
        }
}
