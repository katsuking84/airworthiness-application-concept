import { chatGPTSignInPath, chatGPTSignOutPath } from './chatgpt-auth';
import { currentUser } from '@/lib/auth';
import Workspace from './workspace';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await currentUser();
  return <Workspace user={user ? { name: user.displayName, email: user.email, provider:user.provider } : null} signInPath={chatGPTSignInPath('/')} chatGPTSignOutPath={chatGPTSignOutPath('/')} />;
}
