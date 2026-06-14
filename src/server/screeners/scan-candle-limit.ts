import type { Comparator, RuleNode, RuleTree } from "../rules/ast";
import type { ScreenerDependency } from "../rules/ast";

const CROSS_COMPARATORS = new Set<Comparator>(["CROSSES_ABOVE", "CROSSES_BELOW"]);

function treeUsesCrossComparator(node: RuleNode): boolean {
  if (node.type === "CONDITION") {
    return CROSS_COMPARATORS.has(node.comparator);
  }
  return node.children.some(treeUsesCrossComparator);
}

/** Fetch only as many candles as the rule actually needs during instant scan. */
export function computeScanCandleLimit(tree: RuleTree, deps: ScreenerDependency): number {
  if (deps.indicators.length > 0) {
    return Math.min(deps.maxWarmupBars, 200);
  }

  if (treeUsesCrossComparator(tree.root)) {
    return 5;
  }

  return 3;
}
