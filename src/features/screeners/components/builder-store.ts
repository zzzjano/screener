"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { RuleNode, RuleTree } from "@/src/server/rules/ast";
import { AST_VERSION } from "@/src/server/rules/ast";
import {
  createConstantOperand,
  createIndicatorOperand,
} from "@/src/features/screeners/components/operand-defaults";

function newId() {
  return `node-${Math.random().toString(36).slice(2, 9)}`;
}

interface BuilderState {
  name: string;
  description: string;
  symbols: string[];
  timeframes: string[];
  root: RuleNode;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setSymbols: (symbols: string[]) => void;
  setTimeframes: (timeframes: string[]) => void;
  addCondition: (groupId?: string) => void;
  addGroup: (parentId?: string) => void;
  updateGroupOperator: (id: string, operator: "AND" | "OR") => void;
  updateCondition: (id: string, patch: Partial<Extract<RuleNode, { type: "CONDITION" }>>) => void;
  removeNode: (id: string) => void;
  toRuleTree: () => RuleTree;
}

const defaultCondition = (): Extract<RuleNode, { type: "CONDITION" }> => ({
  type: "CONDITION",
  id: newId(),
  left: createIndicatorOperand("RSI", "15m"),
  comparator: "LT",
  right: createConstantOperand(30),
});

const defaultRoot = (): Extract<RuleNode, { type: "GROUP" }> => ({
  type: "GROUP",
  id: "root",
  operator: "AND",
  children: [defaultCondition()],
});

function updateNode(tree: RuleNode, id: string, updater: (node: RuleNode) => RuleNode): RuleNode {
  if (tree.id === id) return updater(tree);
  if (tree.type === "GROUP") {
    return {
      ...tree,
      children: tree.children.map((child) => updateNode(child, id, updater)).filter(Boolean),
    };
  }
  return tree;
}

function removeNodeFromTree(tree: RuleNode, id: string): RuleNode | null {
  if (tree.id === id) return null;
  if (tree.type === "GROUP") {
    const children = tree.children
      .map((child) => removeNodeFromTree(child, id))
      .filter((child): child is RuleNode => child !== null);
    return { ...tree, children };
  }
  return tree;
}

export const useBuilderStore = create<BuilderState>()(
  immer((set, get) => ({
    name: "",
    description: "",
    symbols: ["BTCUSDT"],
    timeframes: ["15m"],
    root: defaultRoot(),
    setName: (name) => set((s) => { s.name = name; }),
    setDescription: (description) => set((s) => { s.description = description; }),
    setSymbols: (symbols) => set((s) => { s.symbols = symbols; }),
    setTimeframes: (timeframes) => set((s) => { s.timeframes = timeframes; }),
    addCondition: (groupId = "root") =>
      set((s) => {
        s.root = updateNode(s.root, groupId, (node) => {
          if (node.type !== "GROUP") return node;
          return { ...node, children: [...node.children, defaultCondition()] };
        });
      }),
    addGroup: (parentId = "root") =>
      set((s) => {
        const group: Extract<RuleNode, { type: "GROUP" }> = {
          type: "GROUP",
          id: newId(),
          operator: "OR",
          children: [defaultCondition()],
        };
        s.root = updateNode(s.root, parentId, (node) => {
          if (node.type !== "GROUP") return node;
          return { ...node, children: [...node.children, group] };
        });
      }),
    updateGroupOperator: (id, operator) =>
      set((s) => {
        s.root = updateNode(s.root, id, (node) =>
          node.type === "GROUP" ? { ...node, operator } : node,
        );
      }),
    updateCondition: (id, patch) =>
      set((s) => {
        s.root = updateNode(s.root, id, (node) =>
          node.type === "CONDITION" ? { ...node, ...patch } : node,
        );
      }),
    removeNode: (id) =>
      set((s) => {
        const next = removeNodeFromTree(s.root, id);
        if (next) s.root = next;
      }),
    toRuleTree: () => ({ version: AST_VERSION, root: get().root }),
  })),
);
