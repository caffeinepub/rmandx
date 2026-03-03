//+------------------------------------------------------------------+
//|                                                     RmandX_EA.mq4 |
//|                         RmandX Trading Performance Tracker        |
//|   Sends closed trade data to RmandX webhook — on load + live      |
//+------------------------------------------------------------------+
#property copyright "RmandX"
#property version   "2.00"
#property strict

//--- Input parameters
input string   WebhookURL        = "https://YOUR_CANISTER_ID.icp0.io/webhook/mt4";
input string   WebhookSecret     = "YOUR_WEBHOOK_SECRET";
input bool     SendFullHistoryOnLoad = true;  // Send ALL historical trades on EA load
input bool     SendOnClose       = true;      // Send data each time a trade closes
input bool     SendDailySummary  = true;      // Send a daily summary at end of day
input int      DailySummaryHour  = 22;        // Hour (server time) to send daily summary (0-23)
input bool     DebugMode         = false;     // Log debug messages to Experts tab

//--- Internal state
int      lastDailyDay    = -1;
datetime lastKnownClose  = 0;

//+------------------------------------------------------------------+
//| Expert initialization function — fires when EA is loaded          |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("RmandX EA v2.00 initializing. Webhook: ", WebhookURL);

   if (StringFind(WebhookURL, "YOUR_CANISTER_ID") >= 0)
   {
      Alert("RmandX EA: Please set your WebhookURL in EA inputs before running.");
      return INIT_FAILED;
   }

   // ------------------------------------------------------------------
   // FULL HISTORY LOAD — send every historical day to the dashboard
   // This runs once when the EA is first attached to a chart so that
   // ALL past trade data is immediately visible in RmandX.
   // ------------------------------------------------------------------
   if (SendFullHistoryOnLoad)
   {
      Print("RmandX EA: Starting full history export…");
      SendFullHistoryToWebhook();
      Print("RmandX EA: Full history export complete.");
   }

   // Remember the most recent close so OnTrade only fires for NEW closes
   int total = OrdersHistoryTotal();
   if (total > 0 && OrderSelect(total - 1, SELECT_BY_POS, MODE_HISTORY))
      lastKnownClose = OrderCloseTime();

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
//| Expert tick function — fires on every new quote                   |
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
      SendDailySummaryForDate(TimeCurrent());
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

   if (!OrderSelect(total - 1, SELECT_BY_POS, MODE_HISTORY)) return;
   if (OrderType() > OP_SELL) return;  // Skip balance/credit ops

   datetime closeTime = OrderCloseTime();
   if (closeTime == 0 || closeTime <= lastKnownClose) return;

   lastKnownClose = closeTime;
   SendSingleTradeToWebhook();
}

//+------------------------------------------------------------------+
//| Scan the ENTIRE trade history, group by date, send each day      |
//+------------------------------------------------------------------+
void SendFullHistoryToWebhook()
{
   int total = OrdersHistoryTotal();
   if (total == 0)
   {
      Print("RmandX EA: No history found.");
      return;
   }

   // Collect all unique dates first
   string dates[];
   int    dateCount = 0;

   for (int i = 0; i < total; i++)
   {
      if (!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if (OrderType() > OP_SELL) continue;
      if (OrderCloseTime() == 0) continue;

      string d = TimeToString(OrderCloseTime(), TIME_DATE);
      StringReplace(d, ".", "-");

      // Check if date is already in list
      bool found = false;
      for (int j = 0; j < dateCount; j++)
      {
         if (dates[j] == d) { found = true; break; }
      }
      if (!found)
      {
         ArrayResize(dates, dateCount + 1);
         dates[dateCount] = d;
         dateCount++;
      }
   }

   Print("RmandX EA: Found ", dateCount, " unique trading days to export.");

   // Send one summary per unique date
   for (int d = 0; d < dateCount; d++)
   {
      SendDaySummaryForDateStr(dates[d]);
      Sleep(200); // small delay to avoid hammering the webhook
   }
}

//+------------------------------------------------------------------+
//| Send summary for a given date string (YYYY-MM-DD)                |
//+------------------------------------------------------------------+
void SendDaySummaryForDateStr(const string &dateStr)
{
   // Convert "YYYY-MM-DD" back to a datetime for range calculation
   // Use StringToTime which expects "YYYY.MM.DD" format
   string dotDate = dateStr;
   StringReplace(dotDate, "-", ".");
   datetime dayStart = StringToTime(dotDate);
   datetime dayEnd   = dayStart + 86400;

   double totalProfit = 0, totalGross = 0, totalLoss = 0;
   double totalComm = 0, totalSwap = 0, totalRR = 0;
   int    tradeCount = 0, wins = 0;

   double londonProfit = 0, nyProfit = 0, asiaProfit = 0;
   double gbpjpy = 0, eurusd = 0, usdjpy = 0, gbpusd = 0;
   double xauusd = 0, us30 = 0, audusd = 0;

   int total = OrdersHistoryTotal();
   for (int i = 0; i < total; i++)
   {
      if (!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if (OrderType() > OP_SELL) continue;
      if (OrderCloseTime() < dayStart || OrderCloseTime() >= dayEnd) continue;

      double profit = OrderProfit();
      double comm   = MathAbs(OrderCommission());
      double swap   = OrderSwap();
      double net    = profit + swap;

      tradeCount++;
      totalProfit += net;
      totalComm   += comm;
      totalSwap   += swap;

      if (net > 0) { totalGross += net; wins++; }
      else          { totalLoss  += MathAbs(net); }

      double sl = MathAbs(OrderOpenPrice() - OrderStopLoss());
      double tp = MathAbs(OrderTakeProfit() - OrderOpenPrice());
      if (sl > 0 && tp > 0) totalRR += tp / sl;

      MqlDateTime ct;
      TimeToStruct(OrderCloseTime(), ct);
      int h = ct.hour;
      if (h >= 7  && h <= 15) londonProfit += net;
      if (h >= 13 && h <= 21) nyProfit     += net;
      if (h >= 23 || h <= 7)  asiaProfit   += net;

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

   if (tradeCount == 0) return; // No trades on this date — skip

   double balance = AccountBalance();
   double pnlPct  = (balance > 0) ? (totalProfit / balance) * 100.0 : 0;
   double commPct = (balance > 0) ? (totalComm   / balance) * 100.0 : 0;
   double avgRR   = (tradeCount > 0) ? totalRR / tradeCount : 0;
   double norm    = (balance > 0) ? (100.0 / balance) : 0;

   string json = "{";
   json += "\"secret\":\""     + WebhookSecret                        + "\",";
   json += "\"date\":\""       + dateStr                               + "\",";
   json += "\"pnlPct\":"       + DoubleToString(pnlPct, 4)            + ",";
   json += "\"trades\":"       + IntegerToString(tradeCount)           + ",";
   json += "\"rr\":"           + DoubleToString(avgRR, 4)             + ",";
   json += "\"riskPct\":0,";
   json += "\"commissions\":"  + DoubleToString(commPct, 4)           + ",";
   json += "\"slippage\":0,";
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
   json += "\"psych\":3,";
   json += "\"note\":\"Auto-imported from MT4 EA\",";
   json += "\"source\":\"mt4-ea\"";
   json += "}";

   string labelStr = "HISTORY: " + dateStr;
   PostToWebhook(json, labelStr);
}

//+------------------------------------------------------------------+
//| Send today's summary (called at DailySummaryHour)                |
//+------------------------------------------------------------------+
void SendDailySummaryForDate(datetime refTime)
{
   string dateStr = TimeToString(refTime, TIME_DATE);
   StringReplace(dateStr, ".", "-");
   SendDaySummaryForDateStr(dateStr);
}

//+------------------------------------------------------------------+
//| Send a single just-closed trade event to the webhook             |
//+------------------------------------------------------------------+
void SendSingleTradeToWebhook()
{
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
   json += "\"secret\":\""    + WebhookSecret                     + "\",";
   json += "\"date\":\""      + closeDate                          + "\",";
   json += "\"pnlPct\":"      + DoubleToString(pnlPct,  4)        + ",";
   json += "\"trades\":1,";
   json += "\"rr\":"          + DoubleToString(rr,      4)        + ",";
   json += "\"riskPct\":0,";
   json += "\"commissions\":" + DoubleToString(commPct, 4)        + ",";
   json += "\"slippage\":0,";
   json += "\"sessions\":{\"london\":0,\"ny\":0,\"asia\":0},";
   json += "\"pairs\":{"      + pairKey                           + "},";
   json += "\"psych\":3,";
   json += "\"note\":\"Auto-imported from MT4 EA — " + sym + "\",";
   json += "\"source\":\"mt4-ea\"";
   json += "}";

   string labelStr = "TRADE CLOSE";
   PostToWebhook(json, labelStr);
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
   ArrayResize(post, ArraySize(post) - 1); // Remove trailing null

   int res = WebRequest(
      "POST",
      WebhookURL,
      headers,
      5000,
      post,
      result,
      resultHeaders
   );

   if (res == 200 || res == 201)
   {
      if (DebugMode) Print("RmandX EA [", label, "] OK — HTTP ", res);
   }
   else
   {
      string body = CharArrayToString(result);
      Print("RmandX EA [", label, "] ERROR — HTTP ", res, " | ", body);
   }
}
//+------------------------------------------------------------------+
