import { AuthFrame } from "@/components/auth-frame";
import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function Loading() {
  return <AuthFrame mode="register"><LoadingSkeleton layout="auth" label="Loading form…" /></AuthFrame>;
}
