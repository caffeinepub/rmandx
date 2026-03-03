//+------------------------------------------------------------------+
//|                                                     RmandX_EA.mq4 |
//|                         RmandX Trading Performance Tracker        |
//|                   Sends closed trade data to RmandX webhook        |
//+------------------------------------------------------------------+
#property copyright "RmandX"
#property version   "1.00"
#property strict

//--- Input parameters
input string   WebhookURL     = "https://YOUR_CANISTER_ID.icp0.io/webhook/mt4";
input string   WebhookSecret  = "YOUR_WEBHOOK_SECRET";
input bool     SendOnClose    = true;   // Send data each time a trade closes
input bool     SendDailySummary = true; // Send a daily summary at end of day
input int      DailySummaryHour = 22;  // Hour (server time) to send daily summary (0-23)
input bool     DebugMode      = false;  // Log debug messages to Experts tab

//--- Internal state
datetime lastDailyCheck = 0;
int      lastDailyDay   = -1;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("RmandX EA initialized. Webhook: ", WebhookURL);
   if (StringFind(WebhookURL, "YOUR_CANISTER_ID") >= 0)
   {
      Alert("RmandX EA: Please set your WebhookURL in EA inputs before running.");
      return INIT_FAILED;
   }
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("RmandX EA stopped. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   if (!SendDailySummary) return;

   datetime now = TimeCurrent();
   MqlDateTime dt;
   TimeToStruct(now, dt);

   // Send daily summary once per day at the configured hour
   if (dt.hour == DailySummaryHour && dt.day != lastDailyDay)
   {
      lastDailyDay = dt.day;
      SendDailySummaryToWebhook();
   }
}

//+------------------------------------------------------------------+
//| Trade event — fires when a trade is opened/closed/modified       |
//+------------------------------------------------------------------+
void OnTrade()
{
   if (!SendOnClose) return;

   // Scan history for the most recently closed order
   int total = OrdersHistoryTotal();
   if (total == 0) return;

   // Check the last closed order
   if (!OrderSelect(total - 1, SELECT_BY_POS, MODE_HISTORY)) return;
   if (OrderType() > OP_SELL) return;  // Skip balance/credit ops

   datetime closeTime = OrderCloseTime();
   if (closeTime == 0) return; // Still open

   // Only act if closed very recently (within last 10 seconds)
   if (TimeCurrent() - closeTime > 10) return;

   SendTradeToWebhook();
}

//+------------------------------------------------------------------+
//| Build daily stats from today's history and send to webhook       |
//+------------------------------------------------------------------+
void SendDailySummaryToWebhook()
{
   datetime today_start = StringToTime(TimeToString(TimeCurrent(), TIME_DATE));
   datetime today_end   = today_start + 86400;

   double   totalProfit  = 0;
   double   totalGross   = 0;
   double   totalLoss    = 0;
   double   totalComm    = 0;
   double   totalSwap    = 0;
   int      tradeCount   = 0;
   int      wins         = 0;
   double   totalRR      = 0;

   // Session buckets (server time hours, adjust to your broker's GMT offset)
   double londonProfit = 0, nyProfit = 0, asiaProfit = 0;
   double gbpjpy = 0, eurusd = 0, usdjpy = 0, gbpusd = 0, xauusd = 0, us30 = 0, audusd = 0;

   int total = OrdersHistoryTotal();
   for (int i = 0; i < total; i++)
   {
      if (!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if (OrderType() > OP_SELL)  continue; // Skip balance/credit
      if (OrderCloseTime() < today_start || OrderCloseTime() >= today_end) continue;

      double profit = OrderProfit();
      double comm   = MathAbs(OrderCommission());
      double swap   = OrderSwap();
      double net    = profit + swap; // gross before comm

      tradeCount++;
      totalProfit += net;
      totalComm   += comm;
      totalSwap   += swap;

      if (net > 0) { totalGross += net; wins++; }
      else          { totalLoss  += MathAbs(net); }

      // R:R approximation
      double sl = MathAbs(OrderOpenPrice() - OrderStopLoss());
      double tp = MathAbs(OrderTakeProfit() - OrderOpenPrice());
      if (sl > 0 && tp > 0) totalRR += tp / sl;

      // Session by close hour (server time)
      MqlDateTime ct;
      TimeToStruct(OrderCloseTime(), ct);
      int h = ct.hour;
      // London: 07:00-15:59 UTC, NY: 13:00-21:59 UTC, Asia: 23:00-07:59 UTC
      if (h >= 7  && h <= 15) londonProfit += net;
      if (h >= 13 && h <= 21) nyProfit     += net;
      if (h >= 23 || h <= 7)  asiaProfit   += net;

      // Pair breakdown
      string sym = OrderSymbol();
      StringToUpper(sym);
      if (StringFind(sym, "GBPJPY") >= 0) gbpjpy += net;
      if (StringFind(sym, "EURUSD") >= 0) eurusd += net;
      if (StringFind(sym, "USDJPY") >= 0) usdjpy += net;
      if (StringFind(sym, "GBPUSD") >= 0) gbpusd += net;
      if (StringFind(sym, "XAUUSD") >= 0 || StringFind(sym, "GOLD") >= 0) xauusd += net;
      if (StringFind(sym, "US30")   >= 0 || StringFind(sym, "DJ30") >= 0) us30   += net;
      if (StringFind(sym, "AUDUSD") >= 0) audusd += net;
   }

   if (tradeCount == 0)
   {
      if (DebugMode) Print("RmandX EA: No trades today, skipping summary.");
      return;
   }

   // Balance-relative P&L %
   double balance  = AccountBalance();
   double pnlPct   = (balance > 0) ? (totalProfit / balance) * 100.0 : 0;
   double commPct  = (balance > 0) ? (totalComm   / balance) * 100.0 : 0;
   double slipPct  = 0; // MT4 doesn't expose slippage natively
   double avgRR    = (tradeCount > 0) ? totalRR / tradeCount : 0;

   // Normalize session/pair P&L to % of balance
   double norm = (balance > 0) ? (100.0 / balance) : 0;

   string dateStr = TimeToString(today_start, TIME_DATE);
   // Replace spaces with hyphens (YYYY.MM.DD -> YYYY-MM-DD)
   StringReplace(dateStr, ".", "-");

   // Build JSON payload
   string json = "{";
   json += "\"secret\":\""     + WebhookSecret  + "\",";
   json += "\"date\":\""       + dateStr         + "\",";
   json += "\"pnlPct\":"       + DoubleToString(pnlPct, 4)         + ",";
   json += "\"trades\":"       + IntegerToString(tradeCount)        + ",";
   json += "\"rr\":"           + DoubleToString(avgRR, 4)           + ",";
   json += "\"riskPct\":0,";   // not calculable from MT4 history alone
   json += "\"commissions\":"  + DoubleToString(commPct, 4)         + ",";
   json += "\"slippage\":"     + DoubleToString(slipPct, 4)         + ",";
   json += "\"sessions\":{";
   json += "\"london\":"       + DoubleToString(londonProfit * norm, 4) + ",";
   json += "\"ny\":"           + DoubleToString(nyProfit    * norm, 4) + ",";
   json += "\"asia\":"         + DoubleToString(asiaProfit  * norm, 4) + "},";
   json += "\"pairs\":{";
   json += "\"gbpjpy\":"       + DoubleToString(gbpjpy * norm, 4) + ",";
   json += "\"eurusd\":"       + DoubleToString(eurusd * norm, 4) + ",";
   json += "\"usdjpy\":"       + DoubleToString(usdjpy * norm, 4) + ",";
   json += "\"gbpusd\":"       + DoubleToString(gbpusd * norm, 4) + ",";
   json += "\"xauusd\":"       + DoubleToString(xauusd * norm, 4) + ",";
   json += "\"us30\":"         + DoubleToString(us30   * norm, 4) + ",";
   json += "\"audusd\":"       + DoubleToString(audusd * norm, 4) + "},";
   json += "\"psych\":3,";     // default neutral — user edits in RmandX
   json += "\"note\":\"Auto-imported from MT4 EA\",";
   json += "\"source\":\"mt4-ea\"";
   json += "}";

   string labelDaily = "DAILY SUMMARY";
   PostToWebhook(json, labelDaily);
}

//+------------------------------------------------------------------+
//| Send a single closed trade event to the webhook                  |
//+------------------------------------------------------------------+
void SendTradeToWebhook()
{
   // Build a minimal single-trade payload
   double balance = AccountBalance();
   double profit  = OrderProfit() + OrderSwap();
   double comm    = MathAbs(OrderCommission());
   double pnlPct  = (balance > 0) ? (profit / balance) * 100.0 : 0;
   double commPct = (balance > 0) ? (comm   / balance) * 100.0 : 0;

   double sl = MathAbs(OrderOpenPrice() - OrderStopLoss());
   double tp = MathAbs(OrderTakeProfit() - OrderOpenPrice());
   double rr = (sl > 0 && tp > 0) ? tp / sl : 0;

   string closeDate = TimeToString(OrderCloseTime(), TIME_DATE);
   StringReplace(closeDate, ".", "-");

   string sym = OrderSymbol();
   StringToUpper(sym);

   // Identify pair bucket
   string pairKey = "\"gbpjpy\":0,\"eurusd\":0,\"usdjpy\":0,\"gbpusd\":0,\"xauusd\":0,\"us30\":0,\"audusd\":0";
   double norm = (balance > 0) ? (100.0 / balance) : 0;
   double p    = profit * norm;
   if      (StringFind(sym, "GBPJPY") >= 0) StringReplace(pairKey, "\"gbpjpy\":0", "\"gbpjpy\":" + DoubleToString(p, 4));
   else if (StringFind(sym, "EURUSD") >= 0) StringReplace(pairKey, "\"eurusd\":0", "\"eurusd\":" + DoubleToString(p, 4));
   else if (StringFind(sym, "USDJPY") >= 0) StringReplace(pairKey, "\"usdjpy\":0", "\"usdjpy\":" + DoubleToString(p, 4));
   else if (StringFind(sym, "GBPUSD") >= 0) StringReplace(pairKey, "\"gbpusd\":0", "\"gbpusd\":" + DoubleToString(p, 4));
   else if (StringFind(sym, "XAUUSD") >= 0 || StringFind(sym, "GOLD") >= 0) StringReplace(pairKey, "\"xauusd\":0", "\"xauusd\":" + DoubleToString(p, 4));
   else if (StringFind(sym, "US30")   >= 0) StringReplace(pairKey, "\"us30\":0",   "\"us30\":"   + DoubleToString(p, 4));
   else if (StringFind(sym, "AUDUSD") >= 0) StringReplace(pairKey, "\"audusd\":0", "\"audusd\":" + DoubleToString(p, 4));

   string json = "{";
   json += "\"secret\":\""  + WebhookSecret + "\",";
   json += "\"date\":\""    + closeDate      + "\",";
   json += "\"pnlPct\":"    + DoubleToString(pnlPct,  4) + ",";
   json += "\"trades\":1,";
   json += "\"rr\":"        + DoubleToString(rr,      4) + ",";
   json += "\"riskPct\":0,";
   json += "\"commissions\":" + DoubleToString(commPct, 4) + ",";
   json += "\"slippage\":0,";
   json += "\"sessions\":{\"london\":0,\"ny\":0,\"asia\":0},";
   json += "\"pairs\":{"    + pairKey + "},";
   json += "\"psych\":3,";
   json += "\"note\":\"Auto-imported from MT4 EA — " + sym + "\",";
   json += "\"source\":\"mt4-ea\"";
   json += "}";

   string labelTrade = "TRADE CLOSE";
   PostToWebhook(json, labelTrade);
}

//+------------------------------------------------------------------+
//| HTTP POST helper                                                 |
//+------------------------------------------------------------------+
void PostToWebhook(const string &payload, const string &label)
{
   if (DebugMode) Print("RmandX EA [", label, "] Sending: ", payload);

   char   post[];
   char   result[];
   string headers = "Content-Type: application/json\r\n";
   string resultHeaders;

   StringToCharArray(payload, post, 0, WHOLE_ARRAY, CP_UTF8);
   // Remove trailing null byte added by StringToCharArray
   ArrayResize(post, ArraySize(post) - 1);

   int res = WebRequest(
      "POST",
      WebhookURL,
      headers,
      5000,     // timeout ms
      post,
      result,
      resultHeaders
   );

   if (res == 200 || res == 201)
   {
      Print("RmandX EA [", label, "] OK — HTTP ", res);
   }
   else
   {
      string body = CharArrayToString(result);
      Print("RmandX EA [", label, "] ERROR — HTTP ", res, " | ", body);
   }
}
//+------------------------------------------------------------------+
