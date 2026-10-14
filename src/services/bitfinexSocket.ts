/**
 * Real-Time Sub-Second Bitfinex WebSocket Feed Manager
 * Connects to wss://api-pub.bitfinex.com/ws/2 for sub-second order book, trades, and ticker streaming.
 */

import { OrderBookData, OrderBookLevel, TradeItem } from '../types/trading';

type BookCallback = (book: OrderBookData) => void;
type TradeCallback = (trade: TradeItem) => void;
type TickerCallback = (data: { lastPrice: number; high: number; low: number; volume: number; bid: number; ask: number }) => void;
type StatusCallback = (connected: boolean, latencyMs: number) => void;

export class BitfinexSocketManager {
  private ws: WebSocket | null = null;
  private symbol: string = 'tETHUSD';
  private btcSymbol: string = 'tBTCUSD';
  private chanMap: Map<number, { channel: string; symbol: string }> = new Map();
  private bookState: { bids: Map<number, OrderBookLevel>; asks: Map<number, OrderBookLevel> } = {
    bids: new Map(),
    asks: new Map(),
  };
  private seenTradeIds: Set<string | number> = new Set();
  private onBookCallback: BookCallback | null = null;
  private onTradeCallback: TradeCallback | null = null;
  private onTickerCallback: TickerCallback | null = null;
  private onStatusCallback: StatusCallback | null = null;
  private reconnectTimer: any = null;
  private isDestroyed = false;
  private lastPingTime = 0;
  private latency = 45;

  constructor(symbol: string = 'tETHUSD') {
    this.symbol = symbol;
  }

  public setCallbacks(callbacks: {
    onBook?: BookCallback;
    onTrade?: TradeCallback;
    onTicker?: TickerCallback;
    onStatus?: StatusCallback;
  }) {
    if (callbacks.onBook) this.onBookCallback = callbacks.onBook;
    if (callbacks.onTrade) this.onTradeCallback = callbacks.onTrade;
    if (callbacks.onTicker) this.onTickerCallback = callbacks.onTicker;
    if (callbacks.onStatus) this.onStatusCallback = callbacks.onStatus;
  }

  public setSymbol(newSymbol: string) {
    if (this.symbol === newSymbol) return;
    this.symbol = newSymbol;
    this.seenTradeIds.clear();
    this.bookState = { bids: new Map(), asks: new Map() };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.reconnect();
    }
  }

  public connect() {
    this.isDestroyed = false;
    try {
      this.ws = new WebSocket('wss://api-pub.bitfinex.com/ws/2');
    } catch (e) {
      console.warn('Bitfinex WebSocket initialization error:', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.onStatusCallback?.(true, this.latency);
      this.chanMap.clear();
      this.seenTradeIds.clear();
      this.bookState = { bids: new Map(), asks: new Map() };

      // 1. Subscribe to Ticker
      this.send({
        event: 'subscribe',
        channel: 'ticker',
        symbol: this.symbol,
      });

      // 2. Subscribe to Order Book (P0, len 25)
      this.send({
        event: 'subscribe',
        channel: 'book',
        symbol: this.symbol,
        prec: 'P0',
        len: '25',
      });

      // 3. Subscribe to Trades
      this.send({
        event: 'subscribe',
        channel: 'trades',
        symbol: this.symbol,
      });

      // 4. Subscribe to BTC Ticker for lead-lag correlation if not already BTC
      if (!this.symbol.toUpperCase().includes('BTC')) {
        this.send({
          event: 'subscribe',
          channel: 'ticker',
          symbol: this.btcSymbol,
        });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (_) {}
    };

    this.ws.onerror = () => {
      this.onStatusCallback?.(false, 999);
    };

    this.ws.onclose = () => {
      this.onStatusCallback?.(false, 999);
      if (!this.isDestroyed) {
        this.scheduleReconnect();
      }
    };
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(msg: any) {
    // 1. Info / Subscribed event handling
    if (msg.event === 'subscribed') {
      this.chanMap.set(msg.chanId, { channel: msg.channel, symbol: msg.symbol });
      return;
    }
    if (msg.event === 'pong') {
      this.latency = Math.max(15, Date.now() - this.lastPingTime);
      this.onStatusCallback?.(true, this.latency);
      return;
    }
    if (!Array.isArray(msg)) return;

    const chanId = msg[0];
    const data = msg[1];

    if (data === 'hb') return; // Heartbeat

    const meta = this.chanMap.get(chanId);
    if (!meta) return;

    // 2. Channel: Ticker
    if (meta.channel === 'ticker') {
      if (Array.isArray(data) && data.length >= 10 && meta.symbol === this.symbol) {
        // [ BID, BID_SIZE, ASK, ASK_SIZE, DAILY_CHANGE, DAILY_CHANGE_RELATIVE, LAST_PRICE, VOLUME, HIGH, LOW ]
        const [bid, , ask, , , , lastPrice, volume, high, low] = data;
        this.onTickerCallback?.({
          bid,
          ask,
          lastPrice,
          high,
          low,
          volume,
        });
      }
      return;
    }

    // 3. Channel: Trades
    // Bitfinex sends snapshot array on connect, and 'te' (trade executed) + 'tu' (trade update) on each trade.
    // Process snapshot or 'te' execution ticks, ignoring 'tu' duplicates.
    if (meta.channel === 'trades') {
      if (Array.isArray(data)) {
        // Snapshot array of trades
        for (const t of data) {
          if (Array.isArray(t) && t.length >= 4) {
            const [id, mts, amount, price] = t;
            if (this.seenTradeIds.has(id)) continue;
            this.seenTradeIds.add(id);
            const isBuy = amount > 0;
            const absAmount = Math.abs(amount);
            this.onTradeCallback?.({
              id,
              timestamp: mts,
              time: new Date(mts).toISOString().slice(11, 23),
              price,
              amount: absAmount,
              side: isBuy ? 'buy' : 'sell',
              usdValue: Number((price * absAmount).toFixed(2)),
            });
          }
        }
        return;
      }

      if (data === 'te') {
        const t = msg[2];
        if (Array.isArray(t) && t.length >= 4) {
          const [id, mts, amount, price] = t;
          if (this.seenTradeIds.has(id)) return;
          this.seenTradeIds.add(id);

          // Keep set bounded to avoid memory leak
          if (this.seenTradeIds.size > 800) {
            const iter = this.seenTradeIds.values();
            for (let i = 0; i < 200; i++) {
              const val = iter.next().value;
              if (val !== undefined) this.seenTradeIds.delete(val);
            }
          }

          const isBuy = amount > 0;
          const absAmount = Math.abs(amount);
          this.onTradeCallback?.({
            id,
            timestamp: mts,
            time: new Date(mts).toISOString().slice(11, 23),
            price,
            amount: absAmount,
            side: isBuy ? 'buy' : 'sell',
            usdValue: Number((price * absAmount).toFixed(2)),
          });
        }
      }
      return;
    }

    // 4. Channel: Order Book
    if (meta.channel === 'book' && meta.symbol === this.symbol) {
      if (Array.isArray(data)) {
        // Check if snapshot (array of arrays) or single update
        if (Array.isArray(data[0])) {
          // Snapshot
          this.bookState.bids.clear();
          this.bookState.asks.clear();
          for (const item of data) {
            this.processBookItem(item);
          }
        } else {
          // Single update
          this.processBookItem(data);
        }
        this.emitBook();
      }
    }
  }

  private processBookItem(item: any[]) {
    const [price, count, amount] = item;
    if (count === 0) {
      // Level deleted
      if (amount > 0) this.bookState.bids.delete(price);
      else this.bookState.asks.delete(price);
    } else {
      // Level created or updated
      if (amount > 0) {
        this.bookState.bids.set(price, { price, count, amount, total: 0 });
      } else {
        this.bookState.asks.set(price, { price, count, amount: Math.abs(amount), total: 0 });
      }
    }
  }

  private emitBook() {
    const bidsArr = Array.from(this.bookState.bids.values()).sort((a, b) => b.price - a.price);
    const asksArr = Array.from(this.bookState.asks.values()).sort((a, b) => a.price - b.price);

    let cumBid = 0;
    const bids = bidsArr.slice(0, 25).map((b) => {
      cumBid += b.amount;
      return { ...b, total: cumBid };
    });

    let cumAsk = 0;
    const asks = asksArr.slice(0, 25).map((a) => {
      cumAsk += a.amount;
      return { ...a, total: cumAsk };
    });

    const topBid = bids[0]?.price || 0;
    const topBidQty = bids[0]?.amount || 0;
    const topAsk = asks[0]?.price || 0;
    const topAskQty = asks[0]?.amount || 0;

    const midPrice = topBid && topAsk ? (topBid + topAsk) / 2 : topBid || topAsk;
    const spread = topAsk - topBid;
    const spreadBps = midPrice > 0 ? (spread / midPrice) * 10000 : 0;

    let microprice = midPrice;
    if (topBidQty + topAskQty > 0) {
      microprice = (topBidQty * topAsk + topAskQty * topBid) / (topBidQty + topAskQty);
    }
    const micropriceDelta = microprice - midPrice;

    const bidDepth5 = bids.slice(0, 5).reduce((acc, b) => acc + b.amount, 0);
    const askDepth5 = asks.slice(0, 5).reduce((acc, a) => acc + a.amount, 0);
    const imbalance5 = bidDepth5 + askDepth5 > 0 ? ((bidDepth5 - askDepth5) / (bidDepth5 + askDepth5)) * 100 : 0;

    const totalBidDepth = cumBid;
    const totalAskDepth = cumAsk;
    const obiRatio = totalAskDepth > 0 ? Number((totalBidDepth / totalAskDepth).toFixed(2)) : 1.0;

    const avgAskAmount = asks.length > 0 ? totalAskDepth / asks.length : 1;
    const avgBidAmount = bids.length > 0 ? totalBidDepth / bids.length : 1;

    const sellWalls = asks
      .filter((a) => a.amount >= avgAskAmount * 2.5 && a.amount > 0.5)
      .map((w) => ({
        price: w.price,
        amount: w.amount,
        distancePerc: midPrice > 0 ? ((w.price - midPrice) / midPrice) * 100 : 0,
        multipleOfAvg: Number((w.amount / avgAskAmount).toFixed(1)),
      }));

    const buyWalls = bids
      .filter((b) => b.amount >= avgBidAmount * 2.5 && b.amount > 0.5)
      .map((w) => ({
        price: w.price,
        amount: w.amount,
        distancePerc: midPrice > 0 ? ((midPrice - w.price) / midPrice) * 100 : 0,
        multipleOfAvg: Number((w.amount / avgBidAmount).toFixed(1)),
      }));

    const payload: OrderBookData = {
      symbol: this.symbol,
      timestamp: Date.now(),
      midPrice,
      topBid,
      topAsk,
      spread,
      spreadBps: Number(spreadBps.toFixed(2)),
      microprice: Number(microprice.toFixed(6)),
      micropriceDelta: Number(micropriceDelta.toFixed(6)),
      imbalance5: Number(imbalance5.toFixed(2)),
      imbalanceTotal: totalBidDepth + totalAskDepth > 0 ? Number((((totalBidDepth - totalAskDepth) / (totalBidDepth + totalAskDepth)) * 100).toFixed(2)) : 0,
      bidDepth5,
      askDepth5,
      totalBidDepth,
      totalAskDepth,
      obiRatio,
      obi5Ratio: askDepth5 > 0 ? Number((bidDepth5 / askDepth5).toFixed(2)) : 1.0,
      sellWalls,
      buyWalls,
      bids,
      asks,
    };

    this.onBookCallback?.(payload);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, 2500);
  }

  public reconnect() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
    }
    this.connect();
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
      this.ws = null;
    }
  }
}
