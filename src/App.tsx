import { useEffect } from 'react';
import { UserIdentity } from './components/UserIdentity';
import { useDeviceStore } from './store/deviceStore';
import { generateProfile, initWalletListener } from './lib/deviceHash';
import './App.css';

function App() {
  const { setProfile, setError } = useDeviceStore();

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await generateProfile();
        if (profile) {
          setProfile(profile);
          console.log("%c IDENTITY GENERATED", "color: #0f0; font-weight: bold; font-size: 16px;");
          console.table(profile);

          // Start listening for wallet changes - will update store reactively
          initWalletListener();
        } else {
          setError('User is blacklisted');
        }
      } catch (err) {
        setError('Failed to generate profile');
        console.error(err);
      }
    };

    init();
  }, [setProfile, setError]);

  return (
    <div className="app-container">
      <UserIdentity />
    </div>
  );
}

export default App;
