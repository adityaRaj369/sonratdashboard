import {
  BarChart3,
  Bot,
  GitBranch,
  Headset,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Settings,
  UserCog,
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
  id: "flows",
  label: "Flows",
  icon: GitBranch,
  route: "/flows",
  permissions: ["agents.show_menu"],
  order: 3,
});

registerModule({
  id: "customer-support",
  label: "Customer Support",
  icon: Headset,
  route: "/support",
  permissions: ["calls.show_menu"],
  order: 4,
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
  id: "whatsapp",
  label: "WhatsApp",
  icon: MessageCircle,
  route: "/whatsapp",
  permissions: ["agents.show_menu"],
  order: 6,
});

registerModule({
  id: "analytics",
  label: "Analytics",
  icon: BarChart3,
  route: "/analytics",
  permissions: ["analytics.show_menu"],
  order: 7,
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
