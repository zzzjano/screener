import type { RuleTree } from "@/src/server/rules/ast";
import { AST_VERSION } from "@/src/server/rules/ast";

export function createEmptyRuleTree(): RuleTree {
  return {
    version: AST_VERSION,
    root: {
      type: "GROUP",
      id: "root",
      operator: "AND",
      children: [
        {
          type: "CONDITION",
          id: "cond-1",
          left: {
            kind: "INDICATOR",
            indicator: {
              id: "ind-1",
              kind: "RSI",
              timeframe: "15m",
              source: "CLOSE",
              params: { period: 14 },
            },
          },
          comparator: "LT",
          right: { kind: "CONSTANT", value: 30 },
        },
      ],
    },
  };
}
