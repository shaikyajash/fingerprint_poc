import { useEffect } from 'react';
import { UserIdentity } from './components/UserIdentity';
import { useDeviceStore } from './store/deviceStore';
import { getFingerprint } from './lib/deviceHash';
import './App.css';

function App() {
  const { setProfile, setError } = useDeviceStore();

  useEffect(() => {
    const init = async () => {
      try {
        const result = await getFingerprint();
        if (result && result.hash) {
          setProfile({
            master_id: result.hash,
            fingerprint: result.fingerprint
          });
        } else {
          setError('Failed to generate fingerprint');
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
