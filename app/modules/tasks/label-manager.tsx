import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Icon } from "../../components/icon";
import { LABEL_COLORS } from "../membership/validation";
import { useWorkspace } from "../workspace/context";
import type { CommandFailure } from "./commands";
import type { LabelResult } from "./commands";
import type { Label } from "./model";

function sendLabel(
  submit: (
    values: Record<string, string>,
    options?: { method?: "post"; action?: string },
  ) => void,
  base: string,
  values: Record<string, string>,
) {
  submit(
    {
      command: JSON.stringify({ ...values, mutationId: crypto.randomUUID() }),
    },
    { method: "post", action: `${base}/resources/labels` },
  );
}

function Swatches({
  value,
  onPick,
  label,
}: {
  value: string;
  onPick: (color: string) => void;
  label: string;
}) {
  return (
    <span className="swatches" role="group" aria-label={label}>
      {LABEL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={`swatch color-${color} ${value === color ? "is-picked" : ""}`}
          aria-pressed={value === color}
          aria-label={color}
          title={color}
          onClick={() => onPick(color)}
        />
      ))}
    </span>
  );
}

function LabelRow({ label }: { label: Label }) {
  const { base, refresh } = useWorkspace();
  const fetcher = useFetcher<LabelResult | CommandFailure>();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [confirming, setConfirming] = useState(false);
  const seen = useRef<unknown>(undefined);
  const busy = fetcher.state !== "idle";
  useEffect(() => {
    if (fetcher.data && fetcher.data !== seen.current) {
      seen.current = fetcher.data;
      if (fetcher.data.ok) {
        setConfirming(false);
        refresh();
      }
    }
  }, [fetcher.data, refresh]);
  useEffect(() => {
    setName(label.name);
    setColor(label.color);
  }, [label.name, label.color]);
  return (
    <div className="label-row">
      <Swatches
        value={color}
        onPick={setColor}
        label={`Color for ${label.name}`}
      />
      <input
        aria-label={`Name for ${label.name}`}
        value={name}
        maxLength={30}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        className="button button-small"
        disabled={busy || (name === label.name && color === label.color)}
        onClick={() =>
          sendLabel(fetcher.submit, base, {
            intent: "rename",
            labelId: label.id,
            name,
            color,
          })
        }
      >
        Save
      </button>
      {confirming ? (
        <>
          <button
            type="button"
            className="button button-small button-danger"
            disabled={busy}
            onClick={() =>
              sendLabel(fetcher.submit, base, {
                intent: "delete",
                labelId: label.id,
              })
            }
          >
            Sure?
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setConfirming(false)}
          >
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          className="text-button muted"
          onClick={() => setConfirming(true)}
        >
          Delete
        </button>
      )}
      {fetcher.data && !fetcher.data.ok && (
        <p className="form-error" role="alert">
          {fetcher.data.message}
        </p>
      )}
    </div>
  );
}

function NewLabelRow() {
  const { base, refresh } = useWorkspace();
  const fetcher = useFetcher<LabelResult | CommandFailure>();
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]!);
  const seen = useRef<unknown>(undefined);
  const busy = fetcher.state !== "idle";
  useEffect(() => {
    if (fetcher.data && fetcher.data !== seen.current) {
      seen.current = fetcher.data;
      if (fetcher.data.ok) {
        setName("");
        refresh();
      }
    }
  }, [fetcher.data, refresh]);
  return (
    <div className="label-row label-new">
      <Swatches
        value={color}
        onPick={setColor}
        label="Color for the new label"
      />
      <input
        aria-label="New label name"
        placeholder="A new category..."
        value={name}
        maxLength={30}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        type="button"
        className="button button-small button-primary"
        disabled={busy || !name.trim()}
        onClick={() => {
          sendLabel(fetcher.submit, base, {
            intent: "create",
            name,
            color,
          });
        }}
      >
        Add label
      </button>
      {fetcher.data && !fetcher.data.ok && (
        <p className="form-error" role="alert">
          {fetcher.data.message}
        </p>
      )}
    </div>
  );
}

export function LabelManager() {
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="text-button" type="button">
        Edit labels
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="task-dialog label-dialog">
          <div className="dialog-titlebar">
            <Dialog.Title>Labels</Dialog.Title>
            <Dialog.Close className="icon-button" aria-label="Close labels">
              <Icon name="close" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="dialog-note">
            Categories for the work. Renaming updates every task at once.
          </Dialog.Description>
          <div className="label-list">
            {workspace.labels.map((label) => (
              <LabelRow key={label.id} label={label} />
            ))}
            <NewLabelRow />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
