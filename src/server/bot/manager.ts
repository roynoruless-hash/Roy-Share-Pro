import { Bot, webhookCallback } from 'grammy';
import { getDb } from '../config/firebase.js';
import { setupBot } from './setup.js';
import { Request, Response } from 'express';
import { CustomContext } from './context.js';

interface BotConfig {
  instance: Bot<CustomContext>;
  secretToken: string;
}

const botCache = new Map<string, BotConfig>();

export const getBotConfig = async (botId: string): Promise<BotConfig | null> => {
  if (botCache.has(botId)) {
    return botCache.get(botId)!;
  }

  const db = getDb();
  const botDoc = await db.collection('bots').doc(botId).get();
  
  if (!botDoc.exists) {
    return null;
  }
  
  const botData = botDoc.data();
  const token = botData?.botToken || botData?.token;
  if (!token) {
    return null;
  }

  const bot = new Bot<CustomContext>(token);
  
  bot.use(async (ctx, next) => {
    ctx.botId = botId;
    await next();
  });

  setupBot(bot);
  
  // Use a specific webhook secret if defined, otherwise fallback to the token itself
  // for validating inbound webhooks from Telegram.
  const secretToken = botData.webhookSecret || token;
  
  const config = { instance: bot, secretToken };
  botCache.set(botId, config);
  return config;
};

export const handleWebhook = async (botId: string, req: Request, res: Response) => {
  const config = await getBotConfig(botId);
  if (!config) {
    res.status(404).send('Bot not found');
    return;
  }
  
  const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
  if (headerSecret !== config.secretToken) {
    console.warn(`Unauthorized webhook attempt for bot ${botId}`);
    res.status(401).send('Unauthorized');
    return;
  }

  const handler = webhookCallback(config.instance, 'express');
  return handler(req, res);
};
