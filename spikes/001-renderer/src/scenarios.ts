import { balanceMessages } from "./messages";
import { ORG_CATALOG_ID } from "./orgCatalog";

/**
 * Each scenario is a list of messages with an optional delay, like a recorded
 * agent stream. Messages are typed `unknown` because some are deliberately
 * invalid: we want to see what the renderer does with bad input.
 */
export type Step = { delayMs?: number; message: unknown };
export type Scenario = { title: string; expectation: string; steps: Step[] };

const v = "v0.9" as const;
const create = { version: v, createSurface: { surfaceId: "s", catalogId: ORG_CATALOG_ID } };
const components = (list: unknown[]) => ({
  version: v,
  updateComponents: { surfaceId: "s", components: list },
});
const data = (path: string, value: unknown) => ({
  version: v,
  updateDataModel: { surfaceId: "s", path, value },
});

const summary = {
  id: "summary",
  component: "AccountSummary",
  title: { path: "/account/name" },
  balance: { path: "/account/balance" },
  onViewDetails: {
    event: { name: "viewDetails", context: { accountId: { path: "/account/id" } } },
  },
};

const account = { id: "acc-0001", name: "Everyday Savings", balance: "$12,480.55" };

export const plainCard: Scenario = {
  title: "1. Card built from plain components",
  expectation: "Card renders; button logs viewDetails.",
  steps: balanceMessages.map((message) => ({ message })),
};

export const customCatalog: Scenario = {
  title: "2. A domain block inside a Column",
  expectation: "AccountSummary renders inside a Column; button logs viewDetails.",
  steps: [
    { message: create },
    {
      message: components([
        { id: "root", component: "Column", children: ["intro", "summary"] },
        { id: "intro", component: "Text", text: "Here is your account:" },
        summary,
      ]),
    },
    { message: data("/account", account) },
  ],
};

export const dataUpdate: Scenario = {
  title: "3. Data changes after first render",
  expectation: "Balance updates in place after ~1.5s without resending components.",
  steps: [
    { message: create },
    { message: components([{ ...summary, id: "root" }]) },
    { message: data("/account", account) },
    { delayMs: 1500, message: data("/account/balance", "$12,380.55") },
  ],
};

export const unknownComponent: Scenario = {
  title: "4. Unknown component type",
  expectation: "Something other than a crash.",
  steps: [
    { message: create },
    {
      message: components([
        { id: "root", component: "Column", children: ["ok", "chart"] },
        { id: "ok", component: "Text", text: "Sibling that should still render" },
        { id: "chart", component: "PieChart", slices: [] },
      ]),
    },
  ],
};

export const malformedMessage: Scenario = {
  title: "5. Malformed message mid-stream",
  expectation: "Bad message reported; later messages still apply.",
  steps: [
    { message: create },
    { message: components([{ ...summary, id: "root" }]) },
    { message: { version: v, updateComponents: { surfaceId: "s", components: "oops" } } },
    { message: data("/account", account) },
  ],
};

export const missingData: Scenario = {
  title: "6. Required data missing",
  expectation: "Block renders with empty values; no crash.",
  steps: [{ message: create }, { message: components([{ ...summary, id: "root" }]) }],
};

export const extraProp: Scenario = {
  title: "7. Prop not in the schema (style injection attempt)",
  expectation: "Rejected by the strict Zod schema.",
  steps: [
    { message: create },
    { message: components([{ ...summary, id: "root", style: "color:red" }]) },
    { message: data("/account", account) },
  ],
};

/** All scenarios, in the order the spike page shows them. */
export const scenarios: Scenario[] = [
  plainCard,
  customCatalog,
  dataUpdate,
  unknownComponent,
  malformedMessage,
  missingData,
  extraProp,
];
