/**
 * Vercel serverless function which proxies requests to the OpenAI API with rate limiting using Upstash.
 */
import fetch from 'node-fetch';
import {Ratelimit} from '@upstash/ratelimit';
import {Redis} from '@upstash/redis';

// Configure rate limiting
const ipRateLimitWindowInSecs = process.env.IP_RATE_LIMIT_WINDOW_IN_SECS || 600; // 10 minutes by default
const globalRateLimitWindowInSecs = process.env.GLOBAL_RATE_LIMIT_WINDOW_IN_SECS || 60; // 1 minute by default
const ipRateLimitMaxRequests = process.env.IP_RATE_LIMIT_MAX_REQUESTS || 5; // 5 requests per 10 minutes per IP address by default
const globalRateLimitMaxRequests = process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS || 10; // 10 requests per 1 minute by default
const globalRateLimitIdentifier = process.env.GLOBAL_RATE_LIMIT_IDENTIFIER || 'global'; // Global rate limit identifier

// Configure OpenAI API
const openAiApiKey = process.env.OPENAI_KEY;
const openAiUrl = process.env.OPENAI_URL || 'https://api.openai.com/v1/engines/text-davinci-002/completions';

// Redis DB for rate limiting data
const rateLimitDb = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// IP address rate limiter
const ipRateLimit = new Ratelimit({
    redis: rateLimitDb,
    limiter: Ratelimit.fixedWindow(ipRateLimitMaxRequests, `${ipRateLimitWindowInSecs} s`),
});

// Global rate limiter
const globalRateLimit = new Ratelimit({
    redis: rateLimitDb,
    limiter: Ratelimit.slidingWindow(globalRateLimitMaxRequests, `${globalRateLimitWindowInSecs} s`),
});

/**
 * Rate limit requests by IP address and globally
 * @param req The http request object
 * @returns {Promise<void>}
 * @throws {Error} If any of the rate limits were exceeded
 */
const rateLimitRequest = async req => {
    const {headers} = req;
    const ip = headers['x-real-ip'];
    const {success: ipSuccess} = await ipRateLimit.limit(ip);
    if (!ipSuccess) {
        throw new Error('Rate limit exceeded');
    }
    const {success: globalSuccess} = await globalRateLimit.limit(globalRateLimitIdentifier);
    if (!globalSuccess) {
        throw new Error('Global rate limit exceeded');
    }
};

/**
 * Validate the request
 * @param req The http request object
 * @param res The http response object
 * @returns {Promise<boolean>} True if the request is valid, false otherwise
 */
const validate = async (req, res) => {
    if (!openAiApiKey) {
        res.status(500).json('Misconfigured');
        return false;
    }

    try {
        await rateLimitRequest(req);
    } catch (error) {
        res.status(429).json(error.message);
        return false;
    }

    return true;
};

/**
 * Implementation of the serverless proxy.
 *
 * @param req The http request object
 * @param res The http response object
 * @returns {Promise<void>}
 */
const handler = async (req, res) => {
    const valid  = await validate(req, res);
    if (!valid) {
        return;
    }

    const {headers, body} = req;
    try {
        const response = await fetch(openAiUrl, {
            method: 'POST',
            headers: {
                Accept: headers?.Accept || 'application/json',
                Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            res.status(response.status).json(response.statusText);
        }
        const data = await response.json();

        res.status(200).json(data);
    } catch (error) {
        res.status(500).json(error.message);
    }
};

export default handler;