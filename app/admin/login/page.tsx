import { redirect } from "next/navigation";

/** Legacy URL — unified login lives at /login */
export default function AdminLoginRedirect() {
  redirect("/login");
}
