import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ScenarioPlayer } from "./ScenarioPlayer";
import {
  customCatalog,
  dataUpdate,
  extraProp,
  malformedMessage,
  missingData,
  plainCard,
  unknownComponent,
  type Scenario,
  type Step,
} from "./scenarios";

/**
 * One story per spike scenario, plus a Playground.
 *
 * Each story's `args` hold the message steps. Storybook shows args in the
 * Controls panel, so you can edit the A2UI JSON there and watch it re-render.
 */
type Args = {
  expectation: string;
  steps: Step[];
  onAction: (action: unknown) => void;
};

const meta = {
  title: "Spike 001/Scenarios",
  args: {
    // fn() is a spy: every call shows up in the Actions panel.
    onAction: fn(),
  },
  argTypes: {
    onAction: { table: { disable: true } },
    expectation: { control: false },
  },
  render: ({ expectation, steps, onAction }) => (
    <div style={{ fontFamily: "system-ui", maxWidth: 560 }}>
      <p style={{ marginTop: 0 }}>
        <em>Expect:</em> {expectation}
      </p>
      {/* A new key (the steps' JSON) remounts the player whenever you edit
          the steps in Controls, so the stream replays from scratch. */}
      <ScenarioPlayer key={JSON.stringify(steps)} steps={steps} onAction={onAction} />
    </div>
  ),
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

// The sidebar name comes from the export name (PlainCard -> "Plain Card").
const fromScenario = (scenario: Scenario): Story => ({
  args: { expectation: scenario.expectation, steps: scenario.steps },
});

/** Start here: edit `steps` in the Controls panel and see what renders. */
export const Playground: Story = {
  args: {
    expectation:
      "Open the Controls panel, click \"Edit steps as JSON\", change the messages, then click outside the box.",
    steps: customCatalog.steps,
  },
};

export const PlainCard = fromScenario(plainCard);
export const CustomCatalog = fromScenario(customCatalog);
export const DataUpdate = fromScenario(dataUpdate);
export const UnknownComponent = fromScenario(unknownComponent);
export const MalformedMessage = fromScenario(malformedMessage);
export const MissingData = fromScenario(missingData);
export const ExtraProp = fromScenario(extraProp);
