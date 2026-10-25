// ONLIDagger MT5 Manager — bridge and XAGUSD M1 sell-only strategy.
#property copyright "ONLIDagger"
#property version "1.00"
#property strict
input string ServerURL="http://127.0.0.1:8080";
input string ApiToken="";
input string PairCode="";
input bool AllowRealTrading=false;
input int PollSeconds=1;
input int HttpTimeoutMs=2000;
input int HistoryDays=30;
input bool TesterBotEnabled=true;
input string TesterSymbol="XAGUSD";
input double TesterLots=0.01;
input int TesterMaxPositions=1;
input double TesterMaxVolume=0.05;
input int TesterMaxSpreadPoints=50;
input double TesterDailyLoss=50;
input int TesterCooldownSeconds=120;
input double TesterSL_ATR=1.5;
input double TesterTP_ATR=2.0;
input double TesterEntryMin=0;
input double TesterEntryMax=0;
const ulong BOT_MAGIC=610001;
string base, prefix, effectiveToken="", botSymbol="", botMessage="Stopped";
bool tester=false, desiredRunning=false;
int lockHandle=INVALID_HANDLE, appliedVersion=0, fastHandle=INVALID_HANDLE, slowHandle=INVALID_HANDLE, rsiHandle=INVALID_HANDLE, atrHandle=INVALID_HANDLE;
double lots=0.01,maxVolume=0.05,dailyLoss=50,slATR=1.5,tpATR=2,entryMin=0,entryMax=0;
int maxPositions=1,maxSpread=50,cooldown=120;
long expiresAt=0, serverEpoch=0;
ulong syncedTick=0,nextPoll=0,lastHistoryTick=0;
int failureCount=0;
datetime lastBar=0,lastEntry=0,historyFrom=0,historyTo=0,historyCursor=0;
ulong fullHistoryTick=0;
bool historyFullPass=false;
int historyIndex=0;
bool historyActive=false,historyDirty=true,botUncertain=false;
string J(string s) {
   StringReplace(s,"\\","\\\\");StringReplace(s,"\"","\\\"");StringReplace(s,"\r"," ");StringReplace(s,"\n"," ");StringReplace(s,"\t"," ");
   return "\""+s+"\"";
}
string U(ulong v){return StringFormat("%I64u",v);}
string N(double v){return DoubleToString(v,8);}
string Identity(){return "\"login\":"+J((string)AccountInfoInteger(ACCOUNT_LOGIN))+",\"server\":"+J(AccountInfoString(ACCOUNT_SERVER));}
uint Hash(string s){uint h=2166136261;for(int i=0;i<StringLen(s);i++){h^=(uint)StringGetCharacter(s,i);h*=16777619;}return h;}
long NowUTC(){return tester?(long)TimeCurrent():serverEpoch+(long)((GetTickCount64()-syncedTick)/1000);}
long BrokerOffset(){return (long)MathRound((double)(TimeTradeServer()-TimeGMT())/900.0)*900;}
bool Request(string endpoint,string payload,string &response){
   char data[],result[];string headers;
   int length=StringToCharArray(payload,data,0,WHOLE_ARRAY,CP_UTF8);if(length>0)ArrayResize(data,length-1);
   ResetLastError();
   int status=WebRequest("POST",base+"/api/ea/"+endpoint,"Content-Type: application/json\r\nAuthorization: Bearer "+effectiveToken+"\r\n",HttpTimeoutMs,data,result,headers);
   response=CharArrayToString(result,0,WHOLE_ARRAY,CP_UTF8);
   if(status!=200){Print("ONLIDagger HTTP ",endpoint," failed: ",status," terminal error ",GetLastError());return false;}
   return true;
}
string JsonValue(string json,string key){
   string needle="\""+key+"\":\"";int start=StringFind(json,needle);if(start<0)return "";
   start+=StringLen(needle);string out="";
   for(int i=start;i<StringLen(json);i++){
      ushort ch=StringGetCharacter(json,i);
      if(ch=='"')break;
      if(ch=='\\'&&i+1<StringLen(json)){i++;ch=StringGetCharacter(json,i);}
      out+=ShortToString(ch);
   }
   return out;
}
bool SaveToken(string token){
   int f=FileOpen(prefix+"api_token.txt",FILE_WRITE|FILE_TXT|FILE_ANSI);if(f==INVALID_HANDLE)return false;
   uint saved=FileWriteString(f,token);FileFlush(f);FileClose(f);return saved>0;
}
bool LoadToken(string &token){
   int f=FileOpen(prefix+"api_token.txt",FILE_READ|FILE_TXT|FILE_ANSI);if(f==INVALID_HANDLE)return false;
   token=FileReadString(f);FileClose(f);return StringLen(token)>10;
}
bool PairAccount(){
   string code=PairCode;StringReplace(code," ","");StringReplace(code,"-","");
   if(StringLen(code)<8)return false;
   char data[],result[];string headers,response;
   string payload="{"+Identity()+",\"code\":"+J(code)+",\"account_name\":"+J(AccountInfoString(ACCOUNT_NAME))+",\"symbol\":"+J(Symbol())+"}";
   int length=StringToCharArray(payload,data,0,WHOLE_ARRAY,CP_UTF8);if(length>0)ArrayResize(data,length-1);
   ResetLastError();
   int status=WebRequest("POST",base+"/api/ea/pair","Content-Type: application/json\r\n",HttpTimeoutMs,data,result,headers);
   response=CharArrayToString(result,0,WHOLE_ARRAY,CP_UTF8);
   if(status!=201){Print("ONLIDagger pairing failed: ",status," terminal error ",GetLastError()," ",response);return false;}
   string token=JsonValue(response,"token");
   if(StringLen(token)<32){Print("ONLIDagger pairing did not return a usable token.");return false;}
   if(!SaveToken(token)){Print("ONLIDagger paired, but could not save the token file.");return false;}
   effectiveToken=token;Print("ONLIDagger account paired successfully.");return true;
}
bool CanTrade(){
   return (tester||TerminalInfoInteger(TERMINAL_CONNECTED)) && MQLInfoInteger(MQL_TRADE_ALLOWED) &&
      (tester||TerminalInfoInteger(TERMINAL_TRADE_ALLOWED)) && AccountInfoInteger(ACCOUNT_TRADE_ALLOWED) && AccountInfoInteger(ACCOUNT_TRADE_EXPERT) &&
      (tester||AllowRealTrading||AccountInfoInteger(ACCOUNT_TRADE_MODE)!=ACCOUNT_TRADE_MODE_REAL);
}
void ReleaseIndicators(){
   if(fastHandle!=INVALID_HANDLE)IndicatorRelease(fastHandle);if(slowHandle!=INVALID_HANDLE)IndicatorRelease(slowHandle);
   if(rsiHandle!=INVALID_HANDLE)IndicatorRelease(rsiHandle);if(atrHandle!=INVALID_HANDLE)IndicatorRelease(atrHandle);
   fastHandle=slowHandle=rsiHandle=atrHandle=INVALID_HANDLE;
}
bool SetSymbol(string symbol){
   if(symbol==botSymbol&&fastHandle!=INVALID_HANDLE)return true;
   ReleaseIndicators();botSymbol=symbol;
   if(!SymbolSelect(symbol,true))return false;
   fastHandle=iMA(symbol,PERIOD_M1,9,0,MODE_EMA,PRICE_CLOSE);slowHandle=iMA(symbol,PERIOD_M1,21,0,MODE_EMA,PRICE_CLOSE);
   rsiHandle=iRSI(symbol,PERIOD_M1,14,PRICE_CLOSE);atrHandle=iATR(symbol,PERIOD_M1,14);
   return fastHandle!=INVALID_HANDLE&&slowHandle!=INVALID_HANDLE&&rsiHandle!=INVALID_HANDLE&&atrHandle!=INVALID_HANDLE;
}
string PositionsJSON(){
   string result="[";int added=0;
   for(int i=0;i<PositionsTotal() && added<500;i++){
      ulong ticket=PositionGetTicket(i);if(ticket==0)continue;if(added++)result+=",";
      result+="{\"ticket\":"+J(U(ticket))+",\"symbol\":"+J(PositionGetString(POSITION_SYMBOL))+",\"side\":"+J(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY?"buy":"sell")+
      ",\"volume\":"+N(PositionGetDouble(POSITION_VOLUME))+",\"price\":"+N(PositionGetDouble(POSITION_PRICE_OPEN))+",\"profit\":"+N(PositionGetDouble(POSITION_PROFIT))+"}";
   }return result+"]";
}
string ReceiptFile(long id){return prefix+"cmd_"+(string)id+".txt";}
bool SaveReceipt(long id,string status,string ticket,string code,string message){
   int f=FileOpen(ReceiptFile(id),FILE_WRITE|FILE_TXT|FILE_ANSI);if(f==INVALID_HANDLE){Print("Cannot persist command receipt; no submission allowed.");return false;}
   StringReplace(message,"\t"," ");StringReplace(message,"\r"," ");StringReplace(message,"\n"," ");
   string line=status+"\t"+ticket+"\t"+code+"\t"+message;
   uint written=FileWriteString(f,line);FileFlush(f);FileClose(f);return written>0;
}
bool LoadReceipt(long id,string &status,string &ticket,string &code,string &message){
   int f=FileOpen(ReceiptFile(id),FILE_READ|FILE_TXT|FILE_ANSI);if(f==INVALID_HANDLE)return false;
   string line=FileReadString(f);FileClose(f);string cols[];int count=StringSplit(line,'\t',cols);
   status="unknown";ticket="";code="";message="Incomplete local receipt; reconcile before retry";
   if(count>=4){status=cols[0];ticket=cols[1];code=cols[2];message=cols[3];}return true;
}
void Acknowledge(long id,string status,string ticket,string code,string message){
   string response;
   Request("receipt","{"+Identity()+",\"command_id\":"+(string)id+",\"status\":"+J(status)+",\"ticket\":"+J(ticket)+",\"retcode\":"+J(code)+",\"message\":"+J(StringSubstr(message,0,170))+"}",response);
}
string OrderState(ENUM_ORDER_STATE state){
   if(state==ORDER_STATE_FILLED)return "filled";if(state==ORDER_STATE_CANCELED)return "cancelled";
   if(state==ORDER_STATE_EXPIRED)return "expired";if(state==ORDER_STATE_REJECTED)return "rejected";
   if(state==ORDER_STATE_PARTIAL)return "partially_filled";return "accepted";
}
bool Reconcile(ulong magic,long deadline,string &status,string &ticket,string &message){
   for(int i=0;i<OrdersTotal();i++){
      ulong t=OrderGetTicket(i);if(t && (ulong)OrderGetInteger(ORDER_MAGIC)==magic){ticket=U(t);status=OrderState((ENUM_ORDER_STATE)OrderGetInteger(ORDER_STATE));message="Broker order reconciled";return true;}
   }
   datetime from=(datetime)MathMax(0,deadline+BrokerOffset()-7200);
   if(!HistorySelect(from,TimeCurrent()+60))return false;
   for(int i=HistoryOrdersTotal()-1;i>=0;i--){
      ulong t=HistoryOrderGetTicket(i);if(t && (ulong)HistoryOrderGetInteger(t,ORDER_MAGIC)==magic){ticket=U(t);status=OrderState((ENUM_ORDER_STATE)HistoryOrderGetInteger(t,ORDER_STATE));message="Broker history reconciled";return true;}
   }return false;
}
bool Grid(double value,double step){return step>0 && MathAbs(value/step-MathRound(value/step))<0.00001;}
bool ValidateOrder(MqlTradeRequest &r,string &reason){
   if(!CanTrade()){reason="Trading disabled or real trading not enabled in EA";return false;}
   if(!SymbolSelect(r.symbol,true)){reason="Broker symbol unavailable";return false;}
   double step=SymbolInfoDouble(r.symbol,SYMBOL_VOLUME_STEP),min=SymbolInfoDouble(r.symbol,SYMBOL_VOLUME_MIN),max=SymbolInfoDouble(r.symbol,SYMBOL_VOLUME_MAX);
   if(r.volume<min||r.volume>max||!Grid(r.volume,step)){reason="Volume violates broker minimum, maximum or step";return false;}
   double tickSize=SymbolInfoDouble(r.symbol,SYMBOL_TRADE_TICK_SIZE);
   if(!Grid(r.price,tickSize)||!Grid(r.sl,tickSize)||!Grid(r.tp,tickSize)){reason="Price, SL or TP is off the broker tick grid";return false;}
   MqlTick tick;if(!SymbolInfoTick(r.symbol,tick)||tick.bid<=0||tick.ask<=0||TimeCurrent()-tick.time>15){reason="No fresh broker quote";return false;}
   double distance=SymbolInfoInteger(r.symbol,SYMBOL_TRADE_STOPS_LEVEL)*SymbolInfoDouble(r.symbol,SYMBOL_POINT);
   bool buy=r.type==ORDER_TYPE_BUY_LIMIT||r.type==ORDER_TYPE_BUY_STOP||r.type==ORDER_TYPE_BUY;
   if(buy?!(r.sl<r.price&&r.tp>r.price):!(r.sl>r.price&&r.tp<r.price)){reason="Invalid protective exit levels";return false;}
   if(MathAbs(r.price-r.sl)<distance||MathAbs(r.price-r.tp)<distance){reason="Protective exits below broker stop distance";return false;}
   if(r.action==TRADE_ACTION_PENDING){
      if((r.type==ORDER_TYPE_BUY_LIMIT&&r.price>=tick.ask-distance)||(r.type==ORDER_TYPE_BUY_STOP&&r.price<=tick.ask+distance)||
         (r.type==ORDER_TYPE_SELL_LIMIT&&r.price<=tick.bid+distance)||(r.type==ORDER_TYPE_SELL_STOP&&r.price>=tick.bid-distance)){reason="Pending entry violates current quote or stop distance";return false;}
   }
   MqlTradeCheckResult check={};if(!OrderCheck(r,check)){reason="OrderCheck: "+check.comment;return false;}
   return true;
}
void ProcessCommand(string &c[]){
   if(ArraySize(c)!=11)return;
   long id=StringToInteger(c[1]),deadline=StringToInteger(c[8]);ulong magic=(ulong)StringToInteger(c[9]);
   string status,ticket,code,message;
   bool exists=FileIsExist(ReceiptFile(id));
   if(exists){
      if(!LoadReceipt(id,status,ticket,code,message)){Acknowledge(id,"unknown","","","Receipt is inaccessible; submission blocked");return;}
      if(status=="unknown"||status=="accepted"||status=="partially_filled"){
         if(Reconcile(magic,deadline,status,ticket,message))SaveReceipt(id,status,ticket,code,message);
      }
      Acknowledge(id,status,ticket,code,message);return;
   }
   // The broker is checked even without a local receipt (e.g. changed terminal host).
   if(Reconcile(magic,deadline,status,ticket,message)){SaveReceipt(id,status,ticket,"",message);Acknowledge(id,status,ticket,"",message);return;}
   if(c[10]!="queued"){SaveReceipt(id,"unknown","","","Previously delivered command has no local receipt; inspect broker history");Acknowledge(id,"unknown","","","Previously delivered command has no local receipt; inspect broker history");return;}
   if(NowUTC()>deadline){SaveReceipt(id,"expired","","","Delivery deadline elapsed");Acknowledge(id,"expired","","","Delivery deadline elapsed");return;}
   MqlTradeRequest r={};MqlTradeResult result={};r.action=TRADE_ACTION_PENDING;r.magic=magic;r.symbol=c[3];r.volume=StringToDouble(c[4]);r.price=StringToDouble(c[5]);r.sl=StringToDouble(c[6]);r.tp=StringToDouble(c[7]);
   r.type_filling=ORDER_FILLING_RETURN;r.type_time=ORDER_TIME_GTC;r.comment="OD#"+(string)id;
   if(c[2]=="buy_limit")r.type=ORDER_TYPE_BUY_LIMIT;else if(c[2]=="buy_stop")r.type=ORDER_TYPE_BUY_STOP;
   else if(c[2]=="sell_limit")r.type=ORDER_TYPE_SELL_LIMIT;else if(c[2]=="sell_stop")r.type=ORDER_TYPE_SELL_STOP;else return;
   if(!ValidateOrder(r,message)){SaveReceipt(id,"rejected","","",message);Acknowledge(id,"rejected","","",message);return;}
   if(!SaveReceipt(id,"unknown","","","Submission started; broker reconciliation required"))return;
   // Never automatically resubmit a command after this durable marker exists.
   bool sent=OrderSend(r,result);code=(string)result.retcode;ticket=result.order?U(result.order):"";
   status="unknown";message=result.comment==""?"Broker outcome uncertain":result.comment;
   if(result.retcode==TRADE_RETCODE_DONE||result.retcode==TRADE_RETCODE_PLACED)status="accepted";
   else if(result.retcode==TRADE_RETCODE_DONE_PARTIAL)status="partially_filled";
   else if(result.retcode!=0&&result.retcode!=TRADE_RETCODE_TIMEOUT&&result.retcode!=TRADE_RETCODE_CONNECTION&&result.retcode!=TRADE_RETCODE_ERROR)status="rejected";
   if(!sent&&status=="accepted")status="unknown";
   SaveReceipt(id,status,ticket,code,message);Acknowledge(id,status,ticket,code,message);historyDirty=true;
}
void ApplyBot(string &c[]){
   if(ArraySize(c)!=15)return;
   int version=(int)StringToInteger(c[1]);if(version<appliedVersion)return;
   bool running=c[2]=="running";
   if(!running){desiredRunning=false;appliedVersion=version;botMessage="Stopped; existing broker exits remain active";return;}
   double newLots=StringToDouble(c[4]),newMax=StringToDouble(c[6]);
   if(newLots<=0||newMax<newLots){desiredRunning=false;botMessage="Invalid bot configuration";return;}
   if(!SetSymbol(c[3])){desiredRunning=false;botMessage="Cannot initialize silver symbol or indicators";return;}
   lots=newLots;maxPositions=(int)StringToInteger(c[5]);maxVolume=newMax;maxSpread=(int)StringToInteger(c[7]);dailyLoss=StringToDouble(c[8]);cooldown=(int)StringToInteger(c[9]);slATR=StringToDouble(c[10]);tpATR=StringToDouble(c[11]);entryMin=StringToDouble(c[12]);entryMax=StringToDouble(c[13]);expiresAt=StringToInteger(c[14]);
   if(!desiredRunning||version!=appliedVersion)botMessage="Running; waiting for a completed M1 signal";
   desiredRunning=true;appliedVersion=version;
}
void Sync(){
   string mode=AccountInfoInteger(ACCOUNT_TRADE_MODE)==ACCOUNT_TRADE_MODE_REAL?"real":AccountInfoInteger(ACCOUNT_TRADE_MODE)==ACCOUNT_TRADE_MODE_CONTEST?"contest":"demo";
   string payload="{"+Identity()+",\"currency\":"+J(AccountInfoString(ACCOUNT_CURRENCY))+",\"balance\":"+N(AccountInfoDouble(ACCOUNT_BALANCE))+",\"equity\":"+N(AccountInfoDouble(ACCOUNT_EQUITY))+
      ",\"floating\":"+N(AccountInfoDouble(ACCOUNT_PROFIT))+",\"margin\":"+N(AccountInfoDouble(ACCOUNT_MARGIN))+",\"mode\":"+J(mode)+",\"trade_allowed\":"+(CanTrade()?"1":"0")+
      ",\"positions\":"+PositionsJSON()+",\"bot_applied\":"+(string)appliedVersion+",\"bot_message\":"+J(botMessage)+"}";
   string response;
   if(!Request("sync",payload,response)){
      failureCount++;nextPoll=GetTickCount64()+(ulong)MathMin(30000,1000*MathPow(2,MathMin(failureCount,5)))+(ulong)(MathRand()%250);return;
   }
   string lines[];int count=StringSplit(response,'\n',lines);bool gotTime=false;
   for(int i=0;i<count;i++){
      string c[];int n=StringSplit(lines[i],'\t',c);if(n<2)continue;
      if(c[0]=="TIME"){serverEpoch=StringToInteger(c[1]);syncedTick=GetTickCount64();gotTime=true;}
      else if(c[0]=="BOT"&&gotTime)ApplyBot(c);
      else if(c[0]=="CMD"&&gotTime)ProcessCommand(c);
   }
   if(gotTime){failureCount=0;nextPoll=GetTickCount64()+(ulong)(PollSeconds*1000);}
}
string DealJSON(ulong ticket){
   ENUM_DEAL_TYPE type=(ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket,DEAL_TYPE);
   ENUM_DEAL_ENTRY entry=(ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket,DEAL_ENTRY);
   string side=type==DEAL_TYPE_BUY?"buy":type==DEAL_TYPE_SELL?"sell":"cash";
   string direction=entry==DEAL_ENTRY_IN?"in":entry==DEAL_ENTRY_OUT?"out":entry==DEAL_ENTRY_INOUT?"inout":"out_by";
   long utc=HistoryDealGetInteger(ticket,DEAL_TIME)-BrokerOffset();
   return "{\"ticket\":"+J(U(ticket))+",\"order_ticket\":"+J(U((ulong)HistoryDealGetInteger(ticket,DEAL_ORDER)))+",\"position_id\":"+J(U((ulong)HistoryDealGetInteger(ticket,DEAL_POSITION_ID)))+
      ",\"symbol\":"+J(HistoryDealGetString(ticket,DEAL_SYMBOL))+",\"side\":"+J(side)+",\"entry\":"+J(direction)+",\"volume\":"+N(HistoryDealGetDouble(ticket,DEAL_VOLUME))+
      ",\"price\":"+N(HistoryDealGetDouble(ticket,DEAL_PRICE))+",\"profit\":"+N(HistoryDealGetDouble(ticket,DEAL_PROFIT))+",\"commission\":"+N(HistoryDealGetDouble(ticket,DEAL_COMMISSION))+
      ",\"swap\":"+N(HistoryDealGetDouble(ticket,DEAL_SWAP))+",\"fee\":"+N(HistoryDealGetDouble(ticket,DEAL_FEE))+",\"magic\":"+J(U((ulong)HistoryDealGetInteger(ticket,DEAL_MAGIC)))+
      ",\"time\":"+(string)utc+",\"comment\":"+J(HistoryDealGetString(ticket,DEAL_COMMENT))+"}";
}
void PushHistory(){
   if(!historyActive){
      historyTo=TimeCurrent();
      historyFullPass=(fullHistoryTick==0||GetTickCount64()-fullHistoryTick>=86400000);
      if(historyCursor==0)historyFrom=historyTo-HistoryDays*86400;
      else historyFrom=historyCursor-3600;
      if(historyFullPass)historyFrom=(datetime)MathMin((long)historyFrom,(long)historyTo-HistoryDays*86400);
      historyFrom=(datetime)MathMax(0,(long)historyFrom);
      historyIndex=0;historyActive=true;historyDirty=false;
   }
   if(!HistorySelect(historyFrom,historyTo))return;
   int total=HistoryDealsTotal(),end=MathMin(historyIndex+200,total);string deals="[";
   for(int i=historyIndex;i<end;i++){if(i>historyIndex)deals+=",";deals+=DealJSON(HistoryDealGetTicket(i));}deals+="]";
   string response;if(!Request("deals","{"+Identity()+",\"deals\":"+deals+"}",response))return;
   historyIndex=end;if(historyIndex>=total){
      historyActive=false;lastHistoryTick=GetTickCount64();historyCursor=historyTo;
      if(historyFullPass)fullHistoryTick=GetTickCount64();
      int f=FileOpen(prefix+"history_cursor.txt",FILE_WRITE|FILE_TXT|FILE_ANSI);
      if(f!=INVALID_HANDLE){FileWriteString(f,(string)historyCursor);FileFlush(f);FileClose(f);}
   }
}
double DailyNet(){
   MqlDateTime day;TimeToStruct(TimeCurrent(),day);day.hour=0;day.min=0;day.sec=0;
   if(!HistorySelect(StructToTime(day),TimeCurrent()))return -DBL_MAX;
   double net=AccountInfoDouble(ACCOUNT_PROFIT);
   for(int i=0;i<HistoryDealsTotal();i++){
      ulong t=HistoryDealGetTicket(i);ENUM_DEAL_TYPE type=(ENUM_DEAL_TYPE)HistoryDealGetInteger(t,DEAL_TYPE);
      if(type==DEAL_TYPE_BUY||type==DEAL_TYPE_SELL)net+=HistoryDealGetDouble(t,DEAL_PROFIT)+HistoryDealGetDouble(t,DEAL_COMMISSION)+HistoryDealGetDouble(t,DEAL_SWAP)+HistoryDealGetDouble(t,DEAL_FEE);
   }return net;
}
bool ExposureOK(){
   int count=0;double volume=0;bool netting=AccountInfoInteger(ACCOUNT_MARGIN_MODE)!=ACCOUNT_MARGIN_MODE_RETAIL_HEDGING;
   for(int i=0;i<PositionsTotal();i++){if(PositionGetTicket(i)>0&&PositionGetString(POSITION_SYMBOL)==botSymbol){count++;volume+=PositionGetDouble(POSITION_VOLUME);}}
   for(int i=0;i<OrdersTotal();i++){if(OrderGetTicket(i)>0&&OrderGetString(ORDER_SYMBOL)==botSymbol){count++;volume+=OrderGetDouble(ORDER_VOLUME_CURRENT);}}
   // A netting position can belong to another strategy; do not merge or reverse it.
   if(netting&&count>0)return false;
   return count<maxPositions && volume+lots<=maxVolume+0.0000001;
}
bool PersistBotBar(datetime bar){
   if(tester)return true;
   int f=FileOpen(prefix+"bot_bar.txt",FILE_WRITE|FILE_TXT|FILE_ANSI);if(f==INVALID_HANDLE)return false;
   uint n=FileWriteString(f,(string)bar);FileFlush(f);FileClose(f);return n>0;
}
void EvaluateBot(){
   if(!desiredRunning)return;
   if(botUncertain){
      bool found=false;
      for(int i=0;i<PositionsTotal();i++)if(PositionGetTicket(i)>0&&(ulong)PositionGetInteger(POSITION_MAGIC)==BOT_MAGIC&&PositionGetInteger(POSITION_TIME)>=(long)lastEntry-60)found=true;
      if(!found&&HistorySelect(lastEntry-60,TimeCurrent()))for(int i=0;i<HistoryDealsTotal();i++){ulong t=HistoryDealGetTicket(i);if((ulong)HistoryDealGetInteger(t,DEAL_MAGIC)==BOT_MAGIC)found=true;}
      if(found){botUncertain=false;if(!tester)FileDelete(prefix+"bot_uncertain.txt");}
      else {botMessage="Paused: previous bot submission needs broker reconciliation";return;}
   }
   if(!tester&&(syncedTick==0||GetTickCount64()-syncedTick>15000)){botMessage="Paused: control connection is stale";return;}
   if(NowUTC()>=expiresAt){desiredRunning=false;botMessage="Run expired; no new entries";return;}
   if(!CanTrade()){botMessage="Paused: Algo Trading disabled or real trading not allowed";return;}
   datetime bar=iTime(botSymbol,PERIOD_M1,0);if(bar==0||bar==lastBar)return;
   MqlTick tick;if(!SymbolInfoTick(botSymbol,tick)||TimeCurrent()-tick.time>10)return;
   double fast[],slow[],rsi[],atr[];MqlRates candles[];ArraySetAsSeries(fast,true);ArraySetAsSeries(candles,true);
   if(CopyBuffer(fastHandle,0,1,2,fast)!=2||CopyBuffer(slowHandle,0,1,1,slow)!=1||CopyBuffer(rsiHandle,0,1,1,rsi)!=1||CopyBuffer(atrHandle,0,1,1,atr)!=1||CopyRates(botSymbol,PERIOD_M1,1,2,candles)!=2)return;
   lastBar=bar;
   double point=SymbolInfoDouble(botSymbol,SYMBOL_POINT);
   if(point<=0||(tick.ask-tick.bid)/point>maxSpread){botMessage="Waiting: spread above limit";return;}
   if(TimeCurrent()-lastEntry<cooldown){botMessage="Waiting: entry cooldown";return;}
   if(!ExposureOK()){botMessage="Waiting: silver exposure limit";return;}
   if(DailyNet()<=-dailyLoss){botMessage="Paused: account daily loss limit reached";return;}
   if((entryMin>0&&tick.bid<entryMin)||(entryMax>0&&tick.bid>entryMax)){botMessage="Waiting: outside entry range";return;}
   bool signal=fast[0]<slow[0]&&candles[1].close>=fast[1]&&candles[0].close<fast[0]&&candles[0].close<candles[0].open&&rsi[0]>25&&rsi[0]<50&&atr[0]>0;
   if(!signal){botMessage="Running: waiting for M1 pullback signal";return;}
   MqlTradeRequest r={};MqlTradeResult result={};r.action=TRADE_ACTION_DEAL;r.symbol=botSymbol;r.magic=BOT_MAGIC;r.volume=lots;r.type=ORDER_TYPE_SELL;r.price=tick.bid;r.deviation=10;r.comment="OD Silver M1";
   double grid=SymbolInfoDouble(botSymbol,SYMBOL_TRADE_TICK_SIZE);if(grid<=0)return;
   r.sl=MathCeil((tick.ask+atr[0]*slATR)/grid)*grid;r.tp=MathFloor((tick.bid-atr[0]*tpATR)/grid)*grid;
   long filling=SymbolInfoInteger(botSymbol,SYMBOL_FILLING_MODE);
   if((filling&SYMBOL_FILLING_FOK)!=0)r.type_filling=ORDER_FILLING_FOK;
   else if((filling&SYMBOL_FILLING_IOC)!=0)r.type_filling=ORDER_FILLING_IOC;
   else r.type_filling=ORDER_FILLING_RETURN;
   string reason;if(!ValidateOrder(r,reason)){botMessage=StringSubstr(reason,0,170);return;}
   if(!PersistBotBar(bar)){botMessage="Paused: cannot persist bot submission";return;}
   if(!tester){
      int marker=FileOpen(prefix+"bot_uncertain.txt",FILE_WRITE|FILE_TXT|FILE_ANSI);
      if(marker==INVALID_HANDLE){botMessage="Paused: cannot save bot submission marker";return;}
      uint saved=FileWriteString(marker,(string)TimeCurrent());FileFlush(marker);FileClose(marker);
      if(saved==0){botMessage="Paused: cannot save bot submission marker";return;}
   }
   botUncertain=true;lastEntry=TimeCurrent();
   bool sent=OrderSend(r,result);historyDirty=true;
   if(sent&&(result.retcode==TRADE_RETCODE_DONE||result.retcode==TRADE_RETCODE_DONE_PARTIAL)){botMessage="Sell executed; broker protective exits attached";}
   else if(result.retcode==TRADE_RETCODE_PLACED){botMessage="Sell request accepted; awaiting broker fill";}
   else {botMessage="Order response "+(string)result.retcode+": "+StringSubstr(result.comment,0,110);}
   bool certain=(result.retcode==TRADE_RETCODE_DONE||result.retcode==TRADE_RETCODE_DONE_PARTIAL)||
      (result.retcode!=0&&result.retcode!=TRADE_RETCODE_PLACED&&result.retcode!=TRADE_RETCODE_TIMEOUT&&result.retcode!=TRADE_RETCODE_CONNECTION&&result.retcode!=TRADE_RETCODE_ERROR);
   if(certain){botUncertain=false;if(!tester)FileDelete(prefix+"bot_uncertain.txt");}
}
int OnInit(){
   tester=(bool)MQLInfoInteger(MQL_TESTER);base=ServerURL;while(StringLen(base)>0&&StringSubstr(base,StringLen(base)-1)=="/")base=StringSubstr(base,0,StringLen(base)-1);
   if(PollSeconds<1||HttpTimeoutMs<100||HttpTimeoutMs>10000||HistoryDays<1||HistoryDays>3650)return INIT_PARAMETERS_INCORRECT;
   prefix="ONLIDagger_"+(string)AccountInfoInteger(ACCOUNT_LOGIN)+"_"+(string)Hash(AccountInfoString(ACCOUNT_SERVER))+"_";
   if(tester){
      if(TesterLots<=0||TesterMaxVolume<TesterLots||TesterMaxPositions<1||TesterDailyLoss<=0||TesterSL_ATR<=0||TesterTP_ATR<=0||TesterCooldownSeconds<60)return INIT_PARAMETERS_INCORRECT;
      if(!SetSymbol(TesterSymbol))return INIT_FAILED;
      desiredRunning=TesterBotEnabled;lots=TesterLots;maxVolume=TesterMaxVolume;maxPositions=TesterMaxPositions;maxSpread=TesterMaxSpreadPoints;dailyLoss=TesterDailyLoss;cooldown=TesterCooldownSeconds;slATR=TesterSL_ATR;tpATR=TesterTP_ATR;entryMin=TesterEntryMin;entryMax=TesterEntryMax;expiresAt=4102444800;return INIT_SUCCEEDED;
   }
   if(StringLen(base)<8){Print("Set ServerURL from the dashboard.");return INIT_PARAMETERS_INCORRECT;}
   effectiveToken=ApiToken;
   if(effectiveToken==""&&!LoadToken(effectiveToken)&&!PairAccount()){Print("Set ServerURL and paste the dashboard PairCode into the EA.");return INIT_PARAMETERS_INCORRECT;}
   lockHandle=FileOpen(prefix+"lock.bin",FILE_READ|FILE_WRITE|FILE_BIN);
   if(lockHandle==INVALID_HANDLE){Print("Only one ONLIDagger EA may run per account in this terminal.");return INIT_FAILED;}
   int f=FileOpen(prefix+"bot_bar.txt",FILE_READ|FILE_TXT|FILE_ANSI);
   if(f!=INVALID_HANDLE){lastBar=(datetime)StringToInteger(FileReadString(f));lastEntry=lastBar+60;FileClose(f);}
   int cursorFile=FileOpen(prefix+"history_cursor.txt",FILE_READ|FILE_TXT|FILE_ANSI);
   if(cursorFile!=INVALID_HANDLE){historyCursor=(datetime)StringToInteger(FileReadString(cursorFile));FileClose(cursorFile);}
   botUncertain=FileIsExist(prefix+"bot_uncertain.txt");
   if(botUncertain){int marker=FileOpen(prefix+"bot_uncertain.txt",FILE_READ|FILE_TXT|FILE_ANSI);if(marker!=INVALID_HANDLE){lastEntry=(datetime)StringToInteger(FileReadString(marker));FileClose(marker);}}
   MathSrand((int)GetTickCount());EventSetTimer(1);Print("ONLIDagger bridge initialized. Real trading: ",AllowRealTrading);return INIT_SUCCEEDED;
}
void OnDeinit(const int reason){EventKillTimer();ReleaseIndicators();if(lockHandle!=INVALID_HANDLE)FileClose(lockHandle);Comment("");}
void OnTimer(){
   if(tester)return;
   if(GetTickCount64()>=nextPoll)Sync();
   if(failureCount==0&&(historyActive||historyDirty||GetTickCount64()-lastHistoryTick>60000))PushHistory();
   EvaluateBot();Comment("ONLIDagger MT5 Manager\n",botMessage,"\nControl version: ",appliedVersion,"\nReal trading: ",AllowRealTrading?"enabled":"disabled");
}
void OnTick(){EvaluateBot();}
void OnTradeTransaction(const MqlTradeTransaction &trans,const MqlTradeRequest &request,const MqlTradeResult &result){historyDirty=true;}
