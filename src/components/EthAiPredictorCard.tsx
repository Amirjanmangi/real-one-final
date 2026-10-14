import React from 'react';
import {
  BrainCircuit,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Layers,
  Activity,
  Calculator,
  Flame,
  CheckCircle2,
  Gauge,
} from 'lucide-react';
import { EthAiPrediction, BotConfig, OrderBookData } from '../types/trading';

interface EthAiPredictorCardProps {
  prediction: EthAiPrediction;
  config: BotConfig;
  book: OrderBookData | null;
  onManualTrigger?: () => void;
  isPositionOpen?: boolean;
}

export const EthAiPredictorCard: React.FC<EthAiPredictorCardProps> = ({
  prediction,
  config,
  book,
  onManualTrigger,
  isPositionOpen,
}) => {
  const isUpDominant = prediction.upwardProbability >= 60;
  const isDownDominant = prediction.downwardProbability >= 60;

  // 5-second cycle progress calculation (0 to 100%)
  const cycleProgress = Math.max(0, Math.min(100, ((5 - prediction.cycleCountdownSeconds) / 5) * 100));

  return (
    <div className="bg-[#0e131f] border-2 border-indigo-900/60 rounded-2xl p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header: Title, 5-Second Re-Analysis Cycle Countdown, Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                ETH $0.50-$1.00 Price Movement AI Prediction Engine
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                5-SEC CONTINUOUS CYCLE
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                SUB-SECOND WEBSOCKET FEED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Order book depth imbalance, trade tape velocity, falling market dip bounces &amp; post-fee net PnL verification
            </p>
          </div>
        </div>

        {/* 5-Second Analysis Cycle Countdown Meter */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-indigo-950/80">
          <Clock className="w-4 h-4 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
          <div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase">
              <span>5s Re-Analysis Cycle #{prediction.cycleNumber}</span>
              <span className="font-bold text-indigo-300 ml-2">
                {prediction.cycleCountdownSeconds.toFixed(1)}s left
              </span>
            </div>
            <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200 rounded-full"
                style={{ width: `${cycleProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Probability Gauges: Upward Next $1 vs Downward Next $1 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Probability Metric Display (Left 7 Cols) */}
        <div className="md:col-span-7 bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
              <Gauge className="w-4 h-4 text-indigo-400" />
              ETH Next $0.50-$1.00 Price Movement Probability (Horizon: {prediction.predictionHorizon})
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                prediction.uncertainty === 'LOW'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : prediction.uncertainty === 'MEDIUM'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              UNCERTAINTY: {prediction.uncertainty} ({prediction.confidenceScore}% CONFIDENCE)
            </span>
          </div>

          {/* Dual Probability Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline font-mono">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">
                  NEXT $0.5-$1 UP: {prediction.upwardProbability}%
                </span>
                <span className="text-xs text-slate-400">
                  (Exp: +${prediction.expectedMovementUsd.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  (Exp: -${prediction.expectedMovementUsd.toFixed(2)})
                </span>
                <span className="text-sm font-bold text-rose-400">
                  NEXT $0.5-$1 DOWN: {prediction.downwardProbability}%
                </span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>

            {/* Split Bar */}
            <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-slate-950 font-mono shadow-sm"
                style={{ width: `${prediction.upwardProbability}%` }}
              >
                {prediction.upwardProbability >= 18 ? `${prediction.upwardProbability}% UP` : ''}
              </div>
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-r-full transition-all duration-300 flex items-center justify-center text-[9px] font-bold text-white font-mono shadow-sm"
                style={{ width: `${prediction.downwardProbability}%` }}
              >
                {prediction.downwardProbability >= 18 ? `${prediction.downwardProbability}% DOWN` : ''}
              </div>
            </div>
          </div>

          {/* Post-Fee Net Profit Verification HUD */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                Fee &amp; Slippage Audited Net PnL (Size: ${config.tradeSizeUsd.toFixed(2)}):
              </span>
              <span
                className={`font-bold text-sm ${
                  prediction.isFeeCovered ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {prediction.isFeeCovered ? '✅ POSITIVE NET EDGE' : '⚠️ FEE DRAG RISK'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">Gross Move</div>
                <div className="font-bold text-emerald-400">+${prediction.expectedGrossProfitUsd.toFixed(6)}</div>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">Roundtrip Fee</div>
                <div className="font-bold text-rose-400">-${prediction.estimatedRoundtripFeeUsd.toFixed(6)}</div>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">Spread Slippage</div>
                <div className="font-bold text-amber-400">-${prediction.estimatedSlippageUsd.toFixed(6)}</div>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-emerald-900/40 bg-emerald-950/10">
                <div className="text-emerald-400 text-[10px]">Expected Net Profit</div>
                <div className="font-bold text-emerald-300">
                  {prediction.expectedNetProfitUsd > 0 ? '+' : ''}${prediction.expectedNetProfitUsd.toFixed(6)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Recommendation & Quick Scalp Execution (Right 5 Cols) */}
        <div className="md:col-span-5 bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>AI Scalp Recommendation</span>
              <span className="font-mono text-cyan-400">Live ETH: ${prediction.currentPrice.toLocaleString()}</span>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                prediction.recommendation === 'LONG_SCALP_TRIGGER'
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                  : prediction.recommendation === 'WAIT_SELLER_EXHAUSTION'
                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-300'
                  : 'bg-indigo-950/30 border-indigo-500/50 text-indigo-300'
              }`}
            >
              {prediction.recommendation === 'LONG_SCALP_TRIGGER' ? (
                <Flame className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
              ) : prediction.recommendation === 'WAIT_SELLER_EXHAUSTION' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <Activity className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-xs uppercase tracking-wide">
                  {prediction.recommendation === 'LONG_SCALP_TRIGGER'
                    ? '🚀 TRIGGER LONG SCALP (+100% RAPID BOUNCE CONFIRMED)'
                    : prediction.recommendation === 'WAIT_SELLER_EXHAUSTION'
                    ? '⚠️ WAIT: SELLERS AGGRESSIVE (MONITORING FLUSH)'
                    : '⏳ MONITORING 5S CYCLE FOR MICRO-BOUNCE'}
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300 font-sans">
                  {prediction.recommendationReason}
                </p>
              </div>
            </div>
          </div>

          {/* Micro-Details Strip: Tape Velocity & BTC Correlation */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
            <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Velocity:</span>
              <span className="font-bold text-cyan-400">{prediction.tradeVelocity} trades/s</span>
            </div>
            <div className="bg-slate-900 p-2 rounded border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">BTC Lead-Lag:</span>
              <span
                className={`font-bold ${
                  prediction.btcLeadLag.impact === 'BULLISH_BOOST'
                    ? 'text-emerald-400'
                    : prediction.btcLeadLag.impact === 'BEARISH_DRAG'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {prediction.btcLeadLag.impact === 'BULLISH_BOOST'
                  ? '🟢 +BETA BOOST'
                  : prediction.btcLeadLag.impact === 'BEARISH_DRAG'
                  ? '🔴 -DRAG'
                  : '⚪ NEUTRAL'}
              </span>
            </div>
          </div>

          {/* Manual Trigger Option */}
          {onManualTrigger && (
            <button
              onClick={onManualTrigger}
              disabled={isPositionOpen}
              className={`w-full py-2.5 px-3 rounded-lg font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                isPositionOpen
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98]'
              }`}
            >
              <Zap className="w-4 h-4" />
              {isPositionOpen ? 'POSITION OPEN (AUTO-MONITORING TAKE PROFIT)' : 'EXECUTE INSTANT 1-SEC ETH SCALP NOW'}
            </button>
          )}
        </div>
      </div>

      {/* Falling Market Dip & Micro-Fluctuation Step Tracker */}
      {/* Specifically answers user requirement: "$2,513.00 → $2,512.20 → $2,512.60 → $2,511.80 → $2,512.10 → $2,511.00" */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Falling Market Micro-Fluctuation Wave Hunter:
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                prediction.microBounceDetected
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : prediction.isSellerAggressive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {prediction.microBounceDetected
                ? '⚡ 1-SEC MICRO-BOUNCE TRIGGER ACTIVE'
                : prediction.isSellerAggressive
                ? '⏳ WAITING: SELLERS AGGRESSIVE (PAUSE UNTIL BOUNCE)'
                : '🟢 ORDER FLOW CALM & BALANCED'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Sellers: <strong className="text-rose-400">{prediction.sellerAggressionScore.toFixed(0)}%</strong> |
            Microprice Delta: <strong className={prediction.expectedMovementUsd > 0 ? 'text-emerald-400' : 'text-slate-300'}>
              {book?.micropriceDelta && book.micropriceDelta > 0 ? '+' : ''}{book?.micropriceDelta?.toFixed(4) || '0.0000'}
            </strong>
          </span>
        </div>

        {/* Visual Micro-Steps Sequence Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {prediction.microSteps.length > 0 ? (
            prediction.microSteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border ${
                    step.type === 'BOUNCE'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {step.type === 'BOUNCE' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span className="font-bold">${step.price.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400">
                    ({step.deltaUsd > 0 ? '+' : ''}{step.deltaUsd.toFixed(2)})
                  </span>
                </div>
                {idx < prediction.microSteps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="text-xs text-slate-500 font-mono py-1">
              Tracking real-time micro-fluctuations (e.g. $2,513.00 → $2,512.20 → $2,512.60 bounce)...
            </div>
          )}
        </div>

        {/* Dynamic Urdu / English Explanation */}
        <div className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80">
          <strong>Micro-Flow Verdict:</strong> {prediction.microBounceDescription}
        </div>

        {/* Spoofing & Phantom Wall Warning Notice */}
        {prediction.spoofingRisk !== 'NONE' && (
          <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1.5 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-300">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{prediction.spoofingDetails}</span>
          </div>
        )}
      </div>
    </div>
  );
};
