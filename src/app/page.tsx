import ResourcePackMerger from '@/components/ResourcePackMerger';
import { FaGithub } from 'react-icons/fa';

export default function Home() {
  return (
    <div>
      <ResourcePackMerger />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <a 
          href="https://github.com/naimur0X0/MCResourcePackMerger" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ fontSize: '24px', color: '#333', textDecoration: 'none' }}
          aria-label="GitHub Repository"
        >
          <FaGithub />
        </a>
      </div>
    </div>
  );
}
