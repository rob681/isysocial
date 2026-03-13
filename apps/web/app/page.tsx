import { redirect } from "next/navigation";

// Root redirect — middleware handles role-based routing,
// but this handles the case where middleware doesn't catch it
export default function RootPage() {
  redirect("/login");
}
