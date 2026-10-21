import { redirect } from "next/navigation";

/** The two dashboards were merged into /app. */
export default function Page() {
  redirect("/app");
}
