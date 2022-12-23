/**
 * Vercel serverless function which proxies requests to the OpenAI API with rate limiting using Upstash.
 */
import fetch from 'node-fetch';
import {Ratelimit} from '@upstash/ratelimit';
import {Redis} from '@upstash/redis';

/**
 * Rate limit requests by IP address and globally
 * @param req The http request object
 * @returns {Promise<boolean>} True if the request was rate limited, false otherwise
 */
const rateLimitRequest = async (req, res) => {
    // Configure rate limiting
    const ipRateLimitWindowInSecs = process.env.IP_RATE_LIMIT_WINDOW_IN_SECS || 600; // 10 minutes by default
    const globalRateLimitWindowInSecs = process.env.GLOBAL_RATE_LIMIT_WINDOW_IN_SECS || 60; // 1 minute by default
    const ipRateLimitMaxRequests = process.env.IP_RATE_LIMIT_MAX_REQUESTS || 5; // 5 requests per 10 minutes per IP address by default
    const globalRateLimitMaxRequests = process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS || 10; // 10 requests per 1 minute by default
    const globalRateLimitIdentifier = process.env.GLOBAL_RATE_LIMIT_IDENTIFIER || 'global'; // Global rate limit identifier

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

    const {headers} = req;
    const ip = headers['x-real-ip'];
    const {success: ipSuccess} = await ipRateLimit.limit(ip);
    if (!ipSuccess) {
        res.status(429).json({error: 'Rate limit exceeded'});
        return true;
    }

    const {success: globalSuccess} = await globalRateLimit.limit(globalRateLimitIdentifier);
    if (!globalSuccess) {
        res.status(429).json({error: 'Rate limit exceeded'});
        return true;
    }
    return false;
};

/**
 * Validate the request
 * @param req The http request object
 * @param res The http response object
 * @returns {Promise<boolean>} True if the request is valid, false otherwise
 */
const validate = async (req, res, configs) => {
    if (!configs.openAiApiKey) {
        res.status(500).json({error: 'Misconfigured'});
        return false;
    }

    if (req.method !== 'POST') {
        res.status(400).json({error: 'Invalid request method'});
        return false;
    }

    try {
        if (!req.body){
            // Check if the body is valid JSON, Vercel will parse it when accessing the Node.js ".body" helper.
            // The if is redundant, we just need to access req.body to trigger the parsing.
        }
    } catch (error) {
        res.status(400).json({error: 'Invalid request Body'});
        return false;
    }

    const rateLimited = await rateLimitRequest(req, res);
    return !rateLimited;
};

/**
 * Implementation of the serverless proxy.
 *
 * @param req The http request object
 * @param res The http response object
 * @returns {Promise<void>}
 */
const handler = async (req, res) => {
    // Configure OpenAI API
    const openAiApiKey = process.env.OPENAI_KEY;
    const openAiUrl = process.env.OPENAI_URL || 'https://api.openai.com/v1/engines/text-davinci-002/completions';

    const valid  = await validate(req, res, {openAiApiKey, openAiUrl});
    if (!valid) {
        return;
    }

    try {
        const apiResponse = await fetch(openAiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify(req.body),
        });

        if (!apiResponse.ok) {
            res.status(apiResponse.status).json(apiResponse.statusText);
            return;
        }

        const data = await apiResponse.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
};

export default handler;