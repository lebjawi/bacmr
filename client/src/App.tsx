import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/landing";
import Login from "@/pages/auth/login";
import Signup from "@/pages/auth/signup";
import Dashboard from "@/pages/app/dashboard";
import Subjects from "@/pages/app/subjects";
import SubjectDetail from "@/pages/app/subject-detail";
import Lesson from "@/pages/app/lesson";
import Exams from "@/pages/app/exams";
import Profile from "@/pages/app/profile";
import AdminDashboard from "@/pages/admin/index";
import AdminSubjects from "@/pages/admin/subjects";
import AdminLessons from "@/pages/admin/lessons";
import AdminExams from "@/pages/admin/exams";
import AdminUsers from "@/pages/admin/users";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth/login" component={Login} />
      <Route path="/auth/signup" component={Signup} />

      <Route path="/app" component={Dashboard} />
      <Route path="/app/subjects" component={Subjects} />
      <Route path="/app/subjects/:id" component={SubjectDetail} />
      <Route path="/app/lesson/:id" component={Lesson} />
      <Route path="/app/exams" component={Exams} />
      <Route path="/app/profile" component={Profile} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/subjects" component={AdminSubjects} />
      <Route path="/admin/lessons" component={AdminLessons} />
      <Route path="/admin/exams" component={AdminExams} />
      <Route path="/admin/users" component={AdminUsers} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
