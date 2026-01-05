import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { 
  Play, 
  Upload, 
  LogOut, 
  X,
  User as UserIcon,
  Gamepad2
} from 'lucide-react';

// --- PRODUCTION CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDiSUeuVzA1n9d1yyODgOvnv0erey4EipQ",
  authDomain: "loganhajeheh-i.firebaseapp.com",
  projectId: "loganhajeheh-i",
  storageBucket: "loganhajeheh-i.firebasestorage.app",
  messagingSenderId: "895508601514",
  appId: "1:895508601514:web:d8f65f587e746d251f4ed3",
  measurementId: "G-JZTHTP0M74"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// We use a fixed collection name for production
const VIDEO_COLLECTION = 'mario-tube-videos';

// --- Types & Helpers ---
const PixelButton = ({ children, onClick, color = 'red', className = '', type = 'button' }) => {
  const colors = {
    red: 'bg-red-600 border-red-800 text-white hover:bg-red-500',
    green: 'bg-green-600 border-green-800 text-white hover:bg-green-500',
    yellow: 'bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-300',
    blue: 'bg-blue-500 border-blue-700 text-white hover:bg-blue-400',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        relative px-6 py-3 font-bold uppercase tracking-widest
        border-b-4 border-r-4 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1
        transition-all duration-75 pixel-font shadow-lg
        ${colors[color]} ${className}
      `}
    >
      {children}
    </button>
  );
};

const Header = ({ user, onUploadClick }) => (
  <header className="sticky top-0 z-50 bg-[#5c94fc] border-b-4 border-black shadow-xl">
    <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="w-10 h-10 bg-red-600 rounded-lg border-2 border-black flex items-center justify-center transform group-hover:-translate-y-1 transition-transform">
          <span className="text-white font-bold text-xl">M</span>
        </div>
        <h1 className="text-2xl font-black text-white stroke-black pixel-font tracking-tighter drop-shadow-md hidden sm:block">
          MarioTube
        </h1>
      </div>

      {user ? (
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 bg-black/20 px-3 py-1 rounded-full">
            <UserIcon size={16} className="text-white" />
            <span className="text-white text-xs pixel-font">{user.displayName || 'Player 1'}</span>
          </div>
          <PixelButton color="green" onClick={onUploadClick} className="!py-2 !px-4 text-xs flex items-center gap-2">
            <Upload size={16} /> <span className="hidden sm:inline">Upload</span>
          </PixelButton>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 bg-red-600 text-white border-2 border-black rounded hover:bg-red-500 transition-colors"
            title="Quit Game"
          >
            <LogOut size={20} />
          </button>
        </div>
      ) : (
        <div className="text-white text-xs pixel-font animate-pulse">Insert Coin...</div>
      )}
    </div>
  </header>
);

const VideoCard = ({ video, user }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    try {
      const docRef = doc(db, VIDEO_COLLECTION, video.id);
      await updateDoc(docRef, {
        likes: increment(1)
      });
    } catch (error) {
      console.error("Error liking video:", error);
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== video.userId) return;
    if (confirm('Are you sure you want to delete this level?')) {
      await deleteDoc(doc(db, VIDEO_COLLECTION, video.id));
    }
  };

  const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = getYoutubeId(video.url);
  const embedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1` : video.url;

  return (
    <div className="bg-white border-4 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transform transition-all hover:-translate-y-1">
      <div className="relative aspect-video bg-black group">
        {isPlaying ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer relative" onClick={() => setIsPlaying(true)}>
             <img 
              src={youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : 'https://placehold.co/600x400/000000/FFFFFF?text=Video+Only'} 
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              alt="Thumbnail"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-red-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play fill="white" className="ml-1 text-white" size={32} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-[#f8f9fa]">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 text-gray-800">{video.title}</h3>
          {user && user.uid === video.userId && (
             <button onClick={handleDelete} className="text-gray-400 hover:text-red-600 transition-colors">
               <X size={16} />
             </button>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center">
              <span className="font-bold text-xs">{video.username?.[0]?.toUpperCase() || 'P'}</span>
            </div>
            <span className="text-xs font-bold text-gray-500 uppercase">{video.username || 'Unknown'}</span>
          </div>

          <button 
            onClick={handleLike}
            disabled={!user}
            className={`
              flex items-center space-x-2 px-3 py-1 rounded-full border-2 
              transition-all duration-200 active:scale-95
              ${user ? 'hover:bg-yellow-100 cursor-pointer border-black bg-yellow-400 text-black' : 'opacity-50 border-gray-300 bg-gray-100 cursor-not-allowed'}
            `}
          >
            <div className="w-4 h-4 bg-yellow-300 rounded-full border border-yellow-600 flex items-center justify-center animate-pulse">
               <div className="w-2 h-2 bg-yellow-100 rounded-full opacity-50"></div>
            </div>
            <span className="font-black text-sm">{video.likes || 0}</span>
          </button>
        </div>
      </div>
      
      <div className="h-4 w-full bg-[#925a3d] border-t-2 border-black relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20" 
             style={{backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, #000 5px, #000 10px)'}}>
        </div>
      </div>
    </div>
  );
};

const UploadModal = ({ isOpen, onClose, user }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url || !title) return;
    setLoading(true);

    try {
      await addDoc(collection(db, VIDEO_COLLECTION), {
        title,
        url,
        likes: 0,
        userId: user.uid,
        username: user.displayName || 'Player 1',
        createdAt: serverTimestamp()
      });
      setUrl('');
      setTitle('');
      onClose();
    } catch (error) {
      console.error("Error adding video: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#b8f7cf] w-full max-w-md border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] relative p-0 overflow-hidden">
        <div className="bg-[#00aa00] border-b-4 border-black p-4 flex justify-between items-center">
          <h2 className="text-white font-bold text-xl pixel-font tracking-wider shadow-black drop-shadow-md">Warp Pipe Upload</h2>
          <button onClick={onClose} className="text-white hover:text-red-200 transition-colors">
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-green-900">Video Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: World 1-1 Speedrun"
              className="w-full p-3 border-4 border-black bg-white focus:outline-none focus:ring-4 focus:ring-green-400 font-bold"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-green-900">Video URL (YouTube)</label>
            <input 
              type="url" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full p-3 border-4 border-black bg-white focus:outline-none focus:ring-4 focus:ring-green-400 font-bold"
            />
          </div>

          <div className="flex justify-end pt-4">
            <PixelButton color="green" type="submit" className="w-full">
              {loading ? 'Warping...' : 'Upload Level'}
            </PixelButton>
          </div>
        </form>
      </div>
    </div>
  );
};

const AuthScreen = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    if(!username.trim()) return;
    setLoading(true);
    await onLogin(username);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{
             backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }}>
      </div>

      <div className="max-w-md w-full text-center space-y-8 z-10">
        <div className="animate-bounce">
          <h1 className="text-6xl md:text-8xl font-black text-[#e52521] pixel-font drop-shadow-[4px_4px_0_#fff]">
            MARIO
            <span className="text-white block text-4xl md:text-6xl mt-2 drop-shadow-[4px_4px_0_#000] stroke-black">TUBE</span>
          </h1>
        </div>

        <div className="bg-white border-4 border-white p-1 rounded-lg inline-block shadow-2xl">
          <div className="bg-black p-8 border-2 border-white rounded space-y-6">
            <p className="text-white pixel-font text-sm uppercase tracking-widest text-yellow-400 mb-6">
              1 Player Game
            </p>
            
            <form onSubmit={handleStart} className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ENTER NAME"
                maxLength={12}
                className="w-full bg-transparent border-b-4 border-white text-white text-center text-xl font-bold py-2 focus:outline-none focus:border-yellow-400 uppercase placeholder-gray-600 pixel-font"
              />
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full mt-6 text-2xl font-black text-white hover:text-yellow-400 transition-colors pixel-font blink-text"
              >
                {loading ? 'LOADING...' : 'PRESS START'}
              </button>
            </form>
          </div>
        </div>
        
        <div className="text-gray-500 text-xs mt-8 pixel-font">
          © 2026 MUSHROOM KINGDOM INC.
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listener (only listens when loading is done to prevent errors)
  useEffect(() => {
    const q = collection(db, VIDEO_COLLECTION);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      videoList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setVideos(videoList);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (username) => {
    try {
      // 1. Sign in anonymously
      const result = await signInAnonymously(auth);
      // 2. Update profile with the username
      await updateProfile(result.user, {
        displayName: username
      });
      setUser({...result.user, displayName: username});
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white pixel-font text-2xl animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#5c94fc] font-sans selection:bg-red-500 selection:text-white pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        
        .pixel-font {
          font-family: 'Press Start 2P', cursive;
        }
        
        .blink-text {
          animation: blink 1s linear infinite;
        }
        
        @keyframes blink {
          50% { opacity: 0; }
        }

        ::-webkit-scrollbar {
          width: 12px;
        }
        ::-webkit-scrollbar-track {
          background: #000;
        }
        ::-webkit-scrollbar-thumb {
          background: #e52521;
          border: 2px solid #fff;
        }
      `}</style>

      <Header user={user} onUploadClick={() => setIsUploadOpen(true)} />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-8 flex items-end justify-between border-b-8 border-[#925a3d] pb-4 px-2">
          <div>
            <h2 className="text-white font-black text-2xl md:text-4xl drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] uppercase italic transform -skew-x-6">
              World 1-1
            </h2>
            <p className="text-white font-bold text-sm bg-black/30 inline-block px-2 mt-1 rounded">
              {videos.length} LEVELS FOUND
            </p>
          </div>
          <div className="hidden md:flex space-x-2">
             <div className="w-8 h-8 bg-yellow-400 border-2 border-black animate-bounce delay-75"></div>
             <div className="w-8 h-8 bg-red-600 border-2 border-black animate-bounce delay-150"></div>
             <div className="w-8 h-8 bg-green-500 border-2 border-black animate-bounce delay-300"></div>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/10 border-4 border-dashed border-white/40 rounded-xl">
             <Gamepad2 size={64} className="text-white mb-4 opacity-50" />
             <p className="text-white text-xl font-bold mb-4">No levels found!</p>
             <PixelButton color="green" onClick={() => setIsUploadOpen(true)}>
               Create First Level
             </PixelButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} user={user} />
            ))}
          </div>
        )}
      </main>

      <div className="fixed top-32 left-10 w-24 h-12 bg-white/80 rounded-full blur-xl pointer-events-none -z-0"></div>
      <div className="fixed top-48 right-20 w-32 h-16 bg-white/80 rounded-full blur-xl pointer-events-none -z-0"></div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        user={user} 
      />
    </div>
  );
}

