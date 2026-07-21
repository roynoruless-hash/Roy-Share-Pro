import { Context, SessionFlavor } from 'grammy';

export interface BotSession {
  state?: 'awaiting_name' | 'awaiting_phone' | 'awaiting_otp' | 'registered' | 'awaiting_withdraw_upi_id' | 'awaiting_withdraw_amount_upi' | 'awaiting_withdraw_amount_redeem';
  tempName?: string;
  tempPhone?: string;
  referredBy?: string;
  tempUpiId?: string;
}

export type CustomContext = Context & SessionFlavor<BotSession> & {
  botId: string;
};
