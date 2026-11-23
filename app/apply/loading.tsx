import { LoadingSkeleton } from "@/components/loading-skeleton";
import "./student.css";

export default function Loading() {
  return <main className="student-portal">
    <div className="student-wrap route-loading"><LoadingSkeleton layout="student" label="Loading student portal…" /></div>
  </main>;
}
