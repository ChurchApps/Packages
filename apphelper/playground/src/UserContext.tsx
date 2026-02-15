import React from "react";
import { type LoginUserChurchInterface, type PersonInterface, type UserContextInterface, type UserInterface, ApiHelper, NotificationService } from "@churchapps/apphelper";

const UserContext = React.createContext<UserContextInterface | undefined>(undefined);

interface Props {
  children: React.ReactNode;
}

export const UserProvider = ({ children }: Props) => {
  // Start with null user to simulate unauthenticated state
  const [user, setUser] = React.useState<UserInterface | null>(null);
  const [person, setPerson] = React.useState<PersonInterface | null>(null);
  const [userChurch, setUserChurch] = React.useState<LoginUserChurchInterface | null>(null);
  const [userChurches, setUserChurches] = React.useState<LoginUserChurchInterface[] | null>(null);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Note: Environment configuration is handled by playground/src/helpers/EnvironmentHelper.ts
  // which is called in main.tsx before the React app renders.
  // We don't need to configure it again here.

  // Initialize notifications when user context changes
  React.useEffect(() => {
    const initializeNotifications = async () => {
      if (user && person && userChurch) {
        console.log("🔔 UserContext: Initializing NotificationService with user context");
        try {
          const context = {
            user,
            person,
            userChurch,
            userChurches: userChurches || []
          } as UserContextInterface;

          await NotificationService.getInstance().initialize(context);
          console.log("✅ NotificationService initialized successfully");
        } catch (error) {
          console.error("❌ Failed to initialize NotificationService:", error);
        }
      } else if (!user) {
        // Cleanup notifications on logout
        console.log("🧹 UserContext: Cleaning up NotificationService");
        NotificationService.getInstance().cleanup();
      }
    };

    initializeNotifications();
  }, [user, person, userChurch, userChurches]);

  // Standard logout function
  const logout = () => {
    console.log("🚪 UserContext: Logging out and cleaning up NotificationService");

    // Cleanup notifications first
    NotificationService.getInstance().cleanup();

    setUser(null);
    setPerson(null);
    setUserChurch(null);
    setUserChurches(null);
    ApiHelper.isAuthenticated = false;

    // Clear API configs on logout
    ApiHelper.clearPermissions();
  };


  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        userChurch,
        setUserChurch,
        userChurches,
        setUserChurches,
        person,
        setPerson,
        logout,
        loginError,
        clearLoginError: () => setLoginError(null)
      } as UserContextInterface & {
        logout: () => void;
        loginError: string | null;
        clearLoginError: () => void;
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;
