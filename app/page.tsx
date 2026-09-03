import { getChatGPTUser, chatGPTSignInPath } from './chatgpt-auth';
import Workspace from './workspace';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  return <Workspace user={user ? { name: user.displayName, email: user.email } : null} signInPath={chatGPTSignInPath('/')} />;
}
