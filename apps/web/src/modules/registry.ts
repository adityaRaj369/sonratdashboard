import {
  BarChart3,
  Bot,
  LayoutDashboard,
  Megaphone,
  PhoneCall,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { registerModule } from "./types";

registerModule({
  id: "dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  route: "/dashboard",
  order: 1,
});

registerModule({
  id: "agents",
  label: "Agents",
  icon: Bot,
  route: "/agents",
  permissions: ["agents.show_menu"],
  order: 2,
});

registerModule({
  id: "campaigns",
  label: "Campaigns",
  icon: Megaphone,
  route: "/campaigns",
  permissions: ["campaigns.show_menu"],
  order: 3,
});

registerModule({
  id: "contacts",
  label: "Contacts",
  icon: Users,
  route: "/contacts",
  permissions: ["contacts.show_menu"],
  order: 4,
});

registerModule({
  id: "calls",
  label: "Calls",
  icon: PhoneCall,
  route: "/calls",
  permissions: ["calls.show_menu"],
  order: 5,
});

registerModule({
  id: "analytics",
  label: "Analytics",
  icon: BarChart3,
  route: "/analytics",
  permissions: ["analytics.show_menu"],
  order: 6,
});

registerModule({
  id: "settings",
  label: "Settings",
  icon: Settings,
  route: "/settings",
  permissions: ["settings.show_menu"],
  order: 100,
});

registerModule({
  id: "admin-console",
  label: "Admin Console",
  icon: UserCog,
  route: "/admin",
  permissions: ["adminconsole.show_menu"],
  order: 110,
});

export { getModules, getSidebarItems, registerModule } from "./types";
