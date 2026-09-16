import { Link } from "react-router";
import { Avatar } from "../components/avatar";
import { ViewHeading } from "../modules/tasks/board-view";
import { useWorkspace } from "../modules/workspace/context";

export default function ActivityRoute() {
  const { workspace, base } = useWorkspace();
  return (
    <>
      <ViewHeading
        title="What's new"
        note="The little things that move us forward."
        newTask={false}
      />
      <div className="activity-list">
        {workspace.activity.map((event) => (
          <article className="activity-row" key={event.id}>
            <Avatar
              member={workspace.members.find((m) => m.id === event.actorId)}
            />
            <div>
              <p>
                <strong>
                  {workspace.members.find((m) => m.id === event.actorId)
                    ?.name ?? "A teammate"}
                </strong>{" "}
                {event.taskId &&
                workspace.tasks.some((t) => t.id === event.taskId) ? (
                  <Link to={`${base}/tasks/${event.taskId}`}>
                    {event.message}
                  </Link>
                ) : (
                  event.message
                )}
              </p>
              <time dateTime={event.createdAt}>
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "UTC",
                }).format(new Date(event.createdAt))}{" "}
                UTC
              </time>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
