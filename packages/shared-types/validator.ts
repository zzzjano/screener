import { createHash } from "crypto";
import { ruleTreeSchema, type RuleNode, type RuleTree, type ScreenerDependency, type IndicatorConfigAst } from "./ast";


export function validateRuleTree(input: unknown): RuleTree {
  return ruleTreeSchema.parse(input);
}

export function hashRuleTree(tree: RuleTree): string {
  return createHash("sha256").update(JSON.stringify(tree)).digest("hex");
}
