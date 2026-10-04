import type { A2uiMessage } from "@a2ui/web_core/v0_9";
import { ORG_CATALOG_ID } from "./orgCatalog";

/**
 * A hard-coded A2UI v0.9 message sequence, standing in for what an agent
 * would stream to the client. Three messages, in protocol order:
 *
 * 1. createSurface    -> "make a rendering area called `main`, using this catalog"
 * 2. updateComponents -> the UI as a FLAT list; `root` + child ids form the tree
 * 3. updateDataModel  -> the data the components read through `{ path }` bindings
 *
 * Structure (2) and data (3) are separate messages. That is what lets an agent
 * stream the layout first and fill or change the data later.
 */
export const SURFACE_ID = "main";

export const balanceMessages: A2uiMessage[] = [
  {
    version: "v0.9",
    createSurface: {
      surfaceId: SURFACE_ID,
      // The catalog id is a plain string both sides agree on. It picks which
      // set of components this surface may use (see orgCatalog.tsx).
      catalogId: ORG_CATALOG_ID,
    },
  },
  {
    version: "v0.9",
    updateComponents: {
      surfaceId: SURFACE_ID,
      components: [
        { id: "root", component: "Card", child: "body" },
        { id: "body", component: "Column", children: ["title", "balance", "details_btn"] },
        // A literal string: fixed by the agent at generation time.
        { id: "title", component: "Text", text: "Everyday Savings", variant: "h3" },
        // A data binding: resolved from the data model at render time.
        { id: "balance", component: "Text", text: { path: "/account/balanceLabel" } },
        {
          id: "details_btn",
          component: "Button",
          label: "View details",
          // A server action: on click, the client sends this event to the agent.
          // `context` values can themselves be bindings, resolved at click time.
          action: {
            event: {
              name: "viewDetails",
              context: { accountId: { path: "/account/id" } },
            },
          },
        },
      ],
    },
  },
  {
    version: "v0.9",
    updateDataModel: {
      surfaceId: SURFACE_ID,
      path: "/account",
      value: { id: "acc-0001", balanceLabel: "Balance: $12,480.55" },
    },
  },
];
