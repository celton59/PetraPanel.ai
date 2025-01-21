
import { BarChart, Clock, TrendingUp, Users, Video, CheckCircle, AlertCircle } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import { useVideos } from "@/hooks/use-videos";
import { useUsers } from "@/hooks/useUsers";

export const DashboardStats = () => {
  const { videos } = useVideos();
  const { users } = useUsers();

  const pendingVideos = videos?.filter(v => v.status === 'pending').length || 0;
  const inProgressVideos = videos?.filter(v => v.status === 'in_progress').length || 0;
  const completedVideos = videos?.filter(v => v.status === 'completed').length || 0;
  const totalVideos = videos?.length || 0;
  const activeUsers = users?.filter(u => u.lastLoginAt && new Date(u.lastLoginAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length || 0;

  const statsCards = [
    {
      title: "Total Videos",
      value: totalVideos.toString(),
      change: `${pendingVideos} pendientes`,
      isPositive: true,
      icon: Video,
    },
    {
      title: "Videos Completados",
      value: completedVideos.toString(),
      change: `${Math.round((completedVideos/totalVideos || 0) * 100)}% del total`,
      isPositive: true,
      icon: CheckCircle,
    },
    {
      title: "En Proceso",
      value: inProgressVideos.toString(),
      change: `${inProgressVideos} en producción`,
      isPositive: true,
      icon: Clock,
    },
    {
      title: "Usuarios Activos",
      value: activeUsers.toString(),
      change: "Últimos 7 días",
      isPositive: true,
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
      {statsCards.map((stat) => (
        <StatsCard key={stat.title} {...stat} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1" />
      ))}
    </div>
  );
};
