import { redirect } from "next/navigation";

// Redirect /apps to the home page since there's no apps listing page
// This prevents the [username] catch-all route from intercepting /apps
export default function AppsPage() {
  redirect("/");
}







