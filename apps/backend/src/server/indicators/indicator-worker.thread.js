/* eslint-disable @typescript-eslint/no-require-imports */
const { parentPort } = require("worker_threads");
const { RSI, EMA, SMA, MACD } = require("technicalindicators");

function lastTwo(values) {
  if (!values || values.length === 0) return { current: NaN };
  return {
    current: values[values.length - 1],
    previous: values.length > 1 ? values[values.length - 2] : undefined,
  };
}

function computeIndicator(candles, config) {
  const closes = candles.map((c) => c.c);
  const params = config.params ?? {};
  const field = config.outputField ?? "value";

  switch (config.kind) {
    case "RSI":
      return lastTwo(RSI.calculate({ values: closes, period: params.period ?? 14 }));
    case "SMA":
      return lastTwo(SMA.calculate({ values: closes, period: params.period ?? 20 }));
    case "EMA":
      return lastTwo(EMA.calculate({ values: closes, period: params.period ?? 20 }));
    case "MACD": {
      const rows = MACD.calculate({
        values: closes,
        fastPeriod: params.fastPeriod ?? 12,
        slowPeriod: params.slowPeriod ?? 26,
        signalPeriod: params.signalPeriod ?? 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });
      const mapped = rows.map((v) => {
        if (field === "signal") return v.signal ?? 0;
        if (field === "histogram") return v.histogram ?? 0;
        return v.MACD ?? 0;
      });
      return lastTwo(mapped);
    }
    default:
      return { current: NaN };
  }
}

parentPort.on("message", (message) => {
  try {
    const { id, candles, config } = message;
    const result = computeIndicator(candles, config);
    parentPort.postMessage({ id, result });
  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
