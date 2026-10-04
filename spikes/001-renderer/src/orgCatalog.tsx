import { Fragment, type ReactNode } from "react";
import { z } from "zod";
import { Catalog, CommonSchemas } from "@a2ui/web_core/v0_9";
import {
  createComponentImplementation,
  type ReactComponentImplementation,
} from "@a2ui/react/v0_9";
import "./catalog.css";

/**
 * The spike's catalog: every component an agent may use on a surface whose
 * `createSurface.catalogId` is "org-catalog".
 *
 * All components are our own plain HTML + CSS (catalog.css). We don't use
 * A2UI's built-in "basic catalog" components: they add a stylesheet to the
 * whole page (see decision record 001), and this spike should be readable
 * without any A2UI styling.
 *
 * Each component has two halves:
 *   1. an API: a name plus a Zod schema for its props (what the agent may send);
 *   2. an implementation: a React component that receives already-resolved props.
 *
 * Schema helpers from A2UI:
 *   CommonSchemas.DynamicString -> a literal ("Savings") OR a binding
 *                                  ({ path: "/account/name" }); arrives as a string
 *   CommonSchemas.Action        -> an A2UI action object; arrives as () => void
 *   CommonSchemas.ComponentId   -> the id of one child component
 *   CommonSchemas.ChildList     -> a list of child component ids
 * `.strict()` rejects props a schema does not list.
 */

// --- Column: stacks its children vertically -------------------------------

const ColumnApi = {
  name: "Column",
  schema: z.object({ children: CommonSchemas.ChildList }).strict(),
};

const Column = createComponentImplementation(ColumnApi, ({ props, buildChild }) => (
  <div className="column">{renderChildren(props.children, buildChild)}</div>
));

// --- Card: a bordered box around one child ---------------------------------

const CardApi = {
  name: "Card",
  schema: z.object({ child: CommonSchemas.ComponentId }).strict(),
};

const Card = createComponentImplementation(CardApi, ({ props, buildChild }) => (
  <div className="card">{buildChild(props.child)}</div>
));

// --- Text: a heading or a paragraph -----------------------------------------

const TextApi = {
  name: "Text",
  schema: z
    .object({
      text: CommonSchemas.DynamicString,
      variant: z.enum(["h3", "body"]).optional(),
    })
    .strict(),
};

const Text = createComponentImplementation(TextApi, ({ props }) =>
  props.variant === "h3" ? (
    <h3 className="text">{props.text}</h3>
  ) : (
    <p className="text">{props.text}</p>
  ),
);

// --- Button: a labelled button that fires an action -------------------------

const ButtonApi = {
  name: "Button",
  schema: z
    .object({
      label: CommonSchemas.DynamicString,
      action: CommonSchemas.Action,
    })
    .strict(),
};

const Button = createComponentImplementation(ButtonApi, ({ props }) => (
  <button type="button" className="button" onClick={props.action}>
    {props.label}
  </button>
));

// --- AccountSummary: a domain block (what designers will mostly build) -------

const AccountSummaryApi = {
  name: "AccountSummary",
  schema: z
    .object({
      title: CommonSchemas.DynamicString,
      balance: CommonSchemas.DynamicString,
      onViewDetails: CommonSchemas.Action.optional(),
    })
    .strict(),
};

// The renderer's "generic binder" resolves every dynamic prop before this
// runs: `props.balance` is a plain string here and `props.onViewDetails` is a
// ready-to-call function. The block never sees A2UI paths or message shapes.
const AccountSummary = createComponentImplementation(AccountSummaryApi, ({ props }) => (
  <section className="account-summary" aria-label={props.title}>
    <h3 className="account-summary__title">{props.title}</h3>
    <p className="account-summary__balance">{props.balance}</p>
    {props.onViewDetails && (
      <button type="button" className="button" onClick={props.onViewDetails}>
        View details
      </button>
    )}
  </section>
));

// --- Helpers ---------------------------------------------------------------

/**
 * A resolved child list holds either plain ids ("title") or, for lists
 * generated from data, `{ id, basePath }` pairs. Either way we hand each one
 * to `buildChild`, which renders that component from the surface.
 */
function renderChildren(
  children: unknown,
  buildChild: (id: string, basePath?: string) => ReactNode,
) {
  if (!Array.isArray(children)) return null;
  return children.map((child: string | { id: string; basePath?: string }, index) =>
    typeof child === "string" ? (
      <Fragment key={`${child}-${index}`}>{buildChild(child)}</Fragment>
    ) : (
      <Fragment key={`${child.id}-${child.basePath}`}>
        {buildChild(child.id, child.basePath)}
      </Fragment>
    ),
  );
}

// --- The catalog -------------------------------------------------------------

export const ORG_CATALOG_ID = "org-catalog";

export const orgCatalog = new Catalog<ReactComponentImplementation>(ORG_CATALOG_ID, "v0.9", [
  Column,
  Card,
  Text,
  Button,
  AccountSummary,
]);
