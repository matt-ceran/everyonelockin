import type { TaskStatus, Priority } from "../tasks/model";

export const demoMembers = [
  { id: "you", name: "You", initials: "Y", color: "purple", role: "Founder" },
  { id: "riley", name: "Riley", initials: "R", color: "pink", role: "Design" },
  { id: "sam", name: "Sam", initials: "S", color: "blue", role: "Engineering" },
  { id: "jules", name: "Jules", initials: "J", color: "green", role: "Growth" },
];
export const demoLabels = [
  { id: "design", name: "Design", color: "purple" },
  { id: "product", name: "Product", color: "green" },
  { id: "engineering", name: "Engineering", color: "blue" },
  { id: "growth", name: "Growth", color: "orange" },
];
interface DemoTask {
  title: string;
  description: string;
  status: TaskStatus;
  ownerId: string | null;
  labels: string[];
  priority?: Priority;
  helpers?: string[];
}
export const demoTasks: DemoTask[] = [
  {
    title: "Give our homepage some personality",
    description:
      "Explore a strong visual direction for our first impression. Bring two sketches to the next team catch-up.",
    status: "ready",
    ownerId: "riley",
    labels: ["design"],
    priority: "high",
    helpers: ["you"],
  },
  {
    title: "Talk to five potential customers",
    description:
      "Find out how people organize their work today, what gets lost, and what would make their week easier. Capture the recurring themes.",
    status: "ready",
    ownerId: "you",
    labels: ["product", "growth"],
  },
  {
    title: "Write the first welcome email",
    description:
      "A short, useful hello. Explain the first thing someone can do, and give them a way to reply.",
    status: "ready",
    ownerId: "jules",
    labels: ["growth"],
  },
  {
    title: "Build the task detail view",
    description:
      "Make room for a clear title, a useful description, an owner, labels, and people who want to help.",
    status: "in_progress",
    ownerId: "sam",
    labels: ["engineering"],
    priority: "high",
    helpers: ["riley"],
  },
  {
    title: "Map out the first-run experience",
    description:
      "Sketch the path from joining a workspace to finishing a first task. Keep every step necessary.",
    status: "in_progress",
    ownerId: "riley",
    labels: ["design", "product"],
  },
  {
    title: "Put together our launch checklist",
    description:
      "Gather the things that must happen before launch. Give each one a clear owner.",
    status: "in_progress",
    ownerId: "you",
    labels: ["product"],
    helpers: ["jules"],
  },
  {
    title: "A little polish for the buttons",
    description:
      "Review default, hover, pressed, disabled, and keyboard focus states. Make sure every control feels like part of the same website.",
    status: "review",
    ownerId: "riley",
    labels: ["design"],
    helpers: ["sam"],
  },
  {
    title: "Check the mobile task flow",
    description:
      "Create a task, change its owner, move it, and offer to help using a phone-sized screen.",
    status: "review",
    ownerId: "sam",
    labels: ["engineering", "product"],
  },
  {
    title: "Find a name that feels like us",
    description:
      "everyonelockin. A place for the whole team to get moving together.",
    status: "done",
    ownerId: "you",
    labels: ["product"],
  },
  {
    title: "Set up our team workspace",
    description:
      "Bring our first tasks into one place and give everyone a clear view of the work.",
    status: "done",
    ownerId: "sam",
    labels: ["engineering"],
  },
  {
    title: "Collect the first round of feedback",
    description:
      "Read the early notes together and turn useful observations into small, actionable tasks.",
    status: "done",
    ownerId: "jules",
    labels: ["growth"],
  },
  {
    title: "A weekly note from the team",
    description:
      "Try a short Friday update: what shipped, what we learned, and where help would make a difference.",
    status: "backlog",
    ownerId: null,
    labels: ["growth"],
  },
  {
    title: "Make room for little celebrations",
    description:
      "Explore one small, optional animation for finishing a task. Include a still alternative.",
    status: "backlog",
    ownerId: "riley",
    labels: ["design"],
    priority: "low",
  },
  {
    title: "A place for team links",
    description:
      "Collect the handful of links people need every week. Keep the list useful and easy to maintain.",
    status: "backlog",
    ownerId: null,
    labels: ["product"],
    priority: "low",
  },
];
