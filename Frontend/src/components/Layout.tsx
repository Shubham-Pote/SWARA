import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from './ui/sidebar';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard,
  BookOpen,
  FileText,
  StickyNote,
  User,
  GraduationCap
} from 'lucide-react';

const SidebarContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open, animate } = useSidebar();

  const handleUserClick = () => {
    navigate('/profile');
  };

  const links = [
    {
      label: "AI Learner",
      href: "/dashboard", // Or could be "/" for home
      icon: (
        <div className="flex items-center justify-center w-5 h-5">
          <GraduationCap className="text-gray-300 hover:text-white h-5 w-5 flex-shrink-0" />
        </div>
      ),
    },
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="text-gray-300 hover:text-white h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Lessons",
      href: "/lessons",
      icon: <BookOpen className="text-gray-300 hover:text-white h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Articles",
      href: "/articles",
      icon: <FileText className="text-gray-300 hover:text-white h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Notes",
      href: "/notes",
      icon: <StickyNote className="text-gray-300 hover:text-white h-5 w-5 flex-shrink-0" />,
    },
    {
      label: "Character",
      href: "/character",
      icon: <User className="text-gray-300 hover:text-white h-5 w-5 flex-shrink-0" />,
    },
  ];

  return (
    <SidebarBody className="justify-between gap-10">
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* App Icon/Name */}
        <div className="mt-8 mb-6">
          <SidebarLink 
            link={links[0]} 
            className="font-bold text-lg py-3"
          />
        </div>
        
        {/* Navigation Links */}
        <div className="flex flex-col gap-2">
          {links.slice(1).map((link, idx) => (
            <SidebarLink key={idx + 1} link={link} />
          ))}
        </div>
      </div>
      
      {/* User Profile Section at Bottom */}
      <div>
        <button
          onClick={handleUserClick}
          className="flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left"
        >
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <motion.span
            animate={{
              display: animate ? (open ? "inline-block" : "none") : "inline-block",
              opacity: animate ? (open ? 1 : 0) : 1,
            }}
            className="text-gray-300 hover:text-white text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
          >
            {user?.displayName || 'User'}
          </motion.span>
        </button>
      </div>
    </SidebarBody>
  );
};

const Layout = () => {
  return (
    <div className="flex h-screen bg-black">
      <Sidebar>
        <SidebarContent />
      </Sidebar>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto bg-black">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;