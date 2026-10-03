import {
  Bot,
  LayoutDashboard,
  Megaphone,
  UserCog,
} from "lucide-react";
import { registerModule } from "./types";

registerModule({
  id: "agents",
  label: "Agents",
  icon: Bot,
  route: "/agents",
  permissions: ["agents.show_menu"],
  order: 1,
});


registerModule({
  id: "sales",
  label: "Sales",
  icon: Megaphone,
  route: "/sales",
  permissions: ["campaigns.show_menu"],
  order: 5,
});

registerModule({
  id: "admin-console",
  label: "Admin Console",
  icon: UserCog,
  route: "/admin",
  permissions: ["adminconsole.show_menu"],
  order: 110,
});
