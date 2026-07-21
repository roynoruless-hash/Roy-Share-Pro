import { Context, SessionFlavor } from 'grammy';

export interface BotSession {
  state?: 'awaiting_name' | 'awaiting_phone' | 'awaiting_otp' | 'registered';
  tempName?: string;
  tempPhone?: string;
  referredBy?: string;
}

export type CustomContext = Context & SessionFlavor<BotSession> & {
  botId: string;
};
