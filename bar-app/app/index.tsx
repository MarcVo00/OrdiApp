import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, loading, initialCheckDone } = useAuth(); // Ajoutez initialCheckDone dans votre AuthContext

  useEffect(() => {
  if (!initialCheckDone || loading) {
    console.log("Waiting for auth check to complete...");
    return;
  }

  console.log("Auth check complete. User:", user);

  if (!user) {
    console.log("No user, redirecting to login");
    router.replace('/login');
    return;
  }

  // User is logged in but not validated
  if (!user.valide) {
    console.log("User not validated, redirecting to pending");
    router.replace('/pending');
    return;
  }

  // User is logged in and validated
  switch(user.role) {
    case 'admin':
      console.log("Redirecting to admin");
      router.replace('/admin');
      break;
    case 'serveur':
      console.log("Redirecting to serveur");
      router.replace('/serveur');
      break;
    case 'cuisine':
      console.log("Redirecting to cuisine");
      router.replace('/cuisine');
      break;
    default:
      console.log("No valid role, redirecting to profile");
      router.replace('/profile');
  }
}, [user, loading, initialCheckDone]);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}