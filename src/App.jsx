import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged, 
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
} from 'firebase/storage';
import { 
  Play, 
  Pause,
  Upload, 
  LogOut, 
  X,
  Settings,
  Film,
  Link as LinkIcon,
  AlertTriangle,
  MonitorPlay,
  Maximize,
  RotateCcw,
  Heart,
  ArrowLeft
} from 'lucide-react';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDiSUeuVzA1n9d1yyODgOvnv0erey4EipQ",
  authDomain: "loganhajeheh-i.firebaseapp.com",
  projectId: "loganhajeheh-i",
  storageBucket: "loganhajeheh-i.firebasestorage.app",
  messagingSenderId: "895508601514",
  appId: "1:895508601514:web:d8f65f587e746d251f4ed3",
  measurementId: "G-JZTHTP0M74"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

const VIDEO_COLLECTION = 'mario-tube-videos';
const USERS_COLLECTION = 'mario-tube-users';

// --- HELPER FUNCTIONS ---
const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- COMPONENTS ---

const PixelButton = ({ children, onClick, color = 'red', className = '', type = 'button', disabled = false }) => {
  const colors = {
    red: 'bg-red-600 border-red-800 text-white hover:bg-red-500',
    green: 'bg-green-600 border-green-800 text-white hover:bg-green-500',
    yellow: 'bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-300',
    blue: 'bg-blue-500 border-blue-700 text-white hover:bg-blue-400',
    gray: 'bg-gray-500 border-gray-700 text-white hover:bg-gray-400',
    white: 'bg-white border-gray-300 text-black hover:bg-gray-100'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative px-4 py-2 font-bold uppercase tracking-widest text-xs sm:text-sm
        border-b-4 border-r-4 active:border-b-0 active:border-r-0 active:translate-y-1 active:translate-x-1
        transition-all duration-75 pixel-font shadow-lg
        ${colors[color]} ${className}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
      `}
    >
      {children}
    </button>
  );
};

// --- WARP ZONE (CHANNEL PAGE) ---
const WarpZone = ({ targetUser, videos, currentUser, onBack }) => {
  const [channelData, setChannelData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    const fetchChannel = async () => {
      if (!targetUser?.uid) return;
      const docRef = doc(db, USERS_COLLECTION, targetUser.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setChannelData(snap.data());
        setNewDesc(snap.data().description || '');
      } else if (currentUser && currentUser.uid === targetUser.uid) {
        setIsEditing(true);
      }
    };
    fetchChannel();
  }, [targetUser, currentUser]);

  const saveChannel = async () => {
    if (!currentUser) return;
    await setDoc(doc(db, USERS_COLLECTION, currentUser.uid), {
      description: newDesc,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setChannelData({ ...channelData, description: newDesc });
    setIsEditing(false);
  };

  const userVideos = videos.filter(v => v.userId === targetUser.uid);

  return (
    <div className="min-h-screen bg-black text-white p-4 relative overflow-hidden font-mono">
      <div className="fixed top-4 left-4 z-50">
        <PixelButton color="gray" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> EXIT ZONE
        </PixelButton>
      </div>

      <div className="fixed top-0 left-0 w-full h-16 bg-[url('https://pixelartmaker-data-78746291193.nyc3.digitaloceanspaces.com/image/0078b4033c4c374.png')] bg-repeat-x z-10 opacity-50"></div>

      <div className="max-w-6xl mx-auto mt-20 relative z-20">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white pixel-font tracking-widest animate-pulse">
            WELCOME TO WARP ZONE!
          </h1>
          <div className="inline-block border-4 border-white p-4 bg-black/80 max-w-2xl">
            <h2 className="text-xl md:text-2xl text-[#e52521] pixel-font mb-2">
              {targetUser.displayName}'S CHANNEL
            </h2>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed pixel-font">
              {channelData?.description || "This player hasn't written a bio yet."}
            </p>
            {currentUser?.uid === targetUser.uid && (
              <button 
                onClick={() => setIsEditing(true)}
                className="mt-4 text-[10px] uppercase text-blue-400 hover:text-blue-300 pixel-font flex items-center gap-2"
              >
                <Settings size={12} /> Edit Channel Info
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-16 pb-32">
          {userVideos.length === 0 ? (
            <div className="text-center mt-12 opacity-50">
              <p className="pixel-font text-sm">NO PIPES FOUND IN THIS WORLD.</p>
            </div>
          ) : (
            userVideos.map((video, index) => {
               if (!video.url) return null; // Safety check
               const ytid = getYoutubeId(video.url);
               const thumb = ytid ? `https://img.youtube.com/vi/${ytid}/hqdefault.jpg` : null;
               
               return (
                <div key={video.id} className="group relative flex flex-col items-center">
                  <div className="mb-2 text-white pixel-font text-xs animate-bounce">
                    {index + 1}
                  </div>

                  <div className="relative w-48 md:w-64 aspect-video bg-gray-900 border-4 border-white rounded mb-[-4px] z-10 overflow-hidden group-hover:-translate-y-4 transition-transform duration-300 cursor-pointer shadow-xl">
                    <a href={video.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      {thumb ? (
                          <img 
                          src={thumb}
                          onError={(e) => e.target.src = 'https://placehold.co/600x400/000000/FFFFFF?text=Video'} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100"
                          alt={video.title}
                          />
                      ) : (
                          <div className="w-full h-full bg-[#5c94fc] flex items-center justify-center relative">
                              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/brick-wall.png')]"></div>
                              <Play className="text-white drop-shadow-md z-10" size={32} />
                          </div>
                      )}
                    </a>
                  </div>

                  <div className="flex flex-col items-center w-full">
                    <div className="w-56 md:w-72 h-12 bg-gradient-to-r from-[#008800] via-[#00cc00] to-[#006600] border-4 border-black relative z-20 shadow-lg"></div>
                    <div className="w-48 md:w-64 h-32 md:h-48 bg-gradient-to-r from-[#008800] via-[#00cc00] to-[#006600] border-x-4 border-black"></div>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full h-16 bg-[url('https://pixelartmaker-data-78746291193.nyc3.digitaloceanspaces.com/image/2a2e85908092a00.png')] bg-repeat-x z-10"></div>

      {isEditing && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="bg-blue-900 border-4 border-white p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-yellow-400 pixel-font text-lg mb-4 text-center">CHANNEL CONFIG</h3>
            <p className="text-white pixel-font text-xs mb-4 text-center">Setup your Warp Zone description.</p>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full h-32 bg-black border-2 border-white text-white p-4 font-mono text-sm mb-4 focus:outline-none focus:border-yellow-400"
              placeholder="Ex: I speedrun World 1-1 every day..."
            />
            <div className="flex gap-2">
              <PixelButton color="green" onClick={saveChannel} className="flex-1">SAVE ZONE</PixelButton>
              <PixelButton color="red" onClick={() => setIsEditing(false)} className="flex-1">CANCEL</PixelButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- HEADER COMPONENT ---

const Header = ({ user, onUploadClick, onMyChannel, onHomeClick }) => {
  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?';

  return (
    <header className="sticky top-0 z-50 bg-[#5c94fc] border-b-4 border-black shadow-xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={onHomeClick}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-lg border-2 border-black flex items-center justify-center transform group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg sm:text-xl pixel-font">M</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white stroke-black pixel-font tracking-tighter drop-shadow-md hidden sm:block">
            MarioTube
          </h1>
        </div>

        {user ? (
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button 
              onClick={onMyChannel}
              className="flex items-center space-x-2 bg-black/20 pr-3 py-1 pl-1 rounded-full hover:bg-black/40 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center shadow-sm group-hover:bg-yellow-300">
                <span className="text-black font-bold text-xs pixel-font">{userInitial}</span>
              </div>
              <span className="text-white text-xs pixel-font hidden md:inline">{user.displayName || 'Player 1'}</span>
            </button>
            
            <PixelButton color="green" onClick={onUploadClick} className="!py-2 !px-3 sm:!px-4 text-xs flex items-center gap-2">
              <Upload size={16} /> <span className="hidden sm:inline">Upload</span>
            </PixelButton>
            
            <button 
              onClick={() => signOut(auth)}
              className="p-2 bg-red-600 text-white border-2 border-black rounded hover:bg-red-500 transition-colors"
              title="Quit Game"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="text-white text-xs pixel-font animate-pulse">Insert Coin...</div>
        )}
      </div>
    </header>
  );
};

// --- VIDEO CARD COMPONENT ---
const VideoCard = ({ video, user, onUserClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef(null);

  // Safety check for video URL
  if (!video || !video.url) return null;

  const isUploadedFile = video.url.includes('firebasestorage');
  const ytid = getYoutubeId(video.url);
  const canRenderYoutube = !isUploadedFile && ytid;

  // --- LIKE LOGIC (WIPED) ---
  // If 'likedBy' exists, count it. If not, 0. This effectively wipes old 'likes' counts.
  const currentLikes = video.likedBy ? video.likedBy.length : 0;
  const hasLiked = video.likedBy ? video.likedBy.includes(user?.uid) : false;

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const docRef = doc(db, VIDEO_COLLECTION, video.id);
      
      if (hasLiked) {
        // Remove user from array
        await updateDoc(docRef, { 
          likedBy: arrayRemove(user.uid)
        });
      } else {
        // Add user to array (creates field if missing)
        await updateDoc(docRef, { 
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) { 
      // Fallback: If document is malformed, force create the array
      const docRef = doc(db, VIDEO_COLLECTION, video.id);
      await setDoc(docRef, { likedBy: [user.uid] }, { merge: true });
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!user || user.uid !== video.userId) return;
    if (confirm('Delete this level?')) {
      await deleteDoc(doc(db, VIDEO_COLLECTION, video.id));
    }
  };

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const handleFullscreen = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Thumbnail Logic
  let thumbnail = null;
  if (canRenderYoutube) {
    thumbnail = `https://img.youtube.com/vi/${ytid}/hqdefault.jpg`;
  }

  // --- MKTV BUTTON ---
  const MKTVButton = ({ onClick, icon: Icon }) => (
    <button 
      onClick={onClick}
      className="bg-black/50 backdrop-blur-sm border-2 border-white/50 text-white rounded-full p-2 hover:bg-white hover:text-black hover:scale-110 transition-all duration-200 shadow-lg"
    >
      <Icon size={20} fill="currentColor" className="opacity-100" />
    </button>
  );

  return (
    <div 
      className="bg-white border-4 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transform transition-all hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-video bg-black group">
        
        {/* MKTV Watermark Layer */}
        {isPlaying && (
           <div className="absolute top-4 left-4 z-20 pointer-events-none">
             <div className="text-white font-black italic tracking-tighter text-2xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)] opacity-50">
               MKTV
             </div>
           </div>
        )}

        {/* Video Layer */}
        {isPlaying ? (
          isUploadedFile ? (
            <>
              <video
                ref={videoRef}
                src={video.url}
                className="w-full h-full object-cover"
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                autoPlay
              />
              
              <div 
                className={`absolute bottom-4 right-4 z-30 flex gap-3 transition-opacity duration-300 ${isHovered || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
              >
                 <MKTVButton onClick={() => {
                   if(videoRef.current) videoRef.current.currentTime = 0;
                 }} icon={RotateCcw} />
                 
                 <MKTVButton onClick={togglePlay} icon={isPlaying ? Pause : Play} />
                 
                 <MKTVButton onClick={handleFullscreen} icon={Maximize} />
              </div>

              <div className="absolute bottom-0 left-0 w-full h-2 bg-gray-800/50">
                 <div 
                   className="h-full bg-yellow-400 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                   style={{ width: `${progress}%` }}
                 />
              </div>
            </>
          ) : (
             canRenderYoutube ? (
                <iframe
                  src={`https://www.youtube.com/embed/${ytid}?autoplay=1&modestbranding=1&rel=0`}
                  className="w-full h-full relative z-10"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white p-4 text-center">
                 <div className="flex flex-col items-center">
                   <AlertTriangle className="mb-2 text-yellow-500" />
                   <p className="pixel-font text-xs">LINK BROKEN</p>
                 </div>
               </div>
             )
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer relative bg-[#000]" onClick={() => setIsPlaying(true)}>
             
             {thumbnail ? (
                <img 
                  src={thumbnail}
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  alt="Thumbnail"
                />
             ) : (
               <>
                 <div className="absolute inset-0 opacity-20 bg-[#5c94fc] bg-[url('https://www.transparenttextures.com/patterns/brick-wall.png')]"></div>
                 <div className="absolute top-4 right-4 text-white opacity-50">
                    {isUploadedFile ? <Upload size={48} className="rotate-90" /> : <MonitorPlay size={48} />}
                 </div>
               </>
             )}

             <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-red-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform z-10">
                <Play fill="white" className="ml-1 text-white" size={32} />
              </div>
            </div>
             {isUploadedFile && <span className="absolute bottom-4 text-white font-black pixel-font text-xs uppercase drop-shadow-md">Uploaded Level</span>}
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
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-1 rounded transition-colors"
            onClick={() => onUserClick({ uid: video.userId, displayName: video.username })}
          >
            <div className="w-8 h-8 rounded-full bg-yellow-400 border-2 border-black flex items-center justify-center">
              <span className="font-bold text-xs">{video.username?.[0]?.toUpperCase() || 'P'}</span>
            </div>
            <span className="text-xs font-bold text-gray-600 uppercase hover:underline">{video.username || 'Unknown'}</span>
          </div>

          <button 
            onClick={handleLike}
            disabled={!user}
            className={`
              flex items-center space-x-2 px-3 py-1 rounded-full border-2 
              transition-all duration-200 active:scale-95
              ${
                hasLiked 
                  ? 'bg-red-500 border-black text-white' 
                  : user 
                    ? 'bg-yellow-400 border-black text-black hover:bg-yellow-300' 
                    : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
              }
            `}
          >
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${hasLiked ? 'bg-red-300 border-red-700' : 'bg-yellow-300 border-yellow-600'}`}>
               <Heart size={10} fill={hasLiked ? "currentColor" : "none"} />
            </div>
            <span className="font-black text-sm">{currentLikes}</span>
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

// --- UPLOAD MODAL ---
const UploadModal = ({ isOpen, onClose, user }) => {
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'file'
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.size > 20971520) {
        alert("File too big! Limit is 20MB to save space.");
        return;
      }
      setFile(selected);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;
    if (activeTab === 'link' && !url) return;
    if (activeTab === 'file' && !file) return;

    setLoading(true);

    try {
      if (activeTab === 'file') {
        const storageRef = ref(storage, `videos/${user.uid}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(progress);
          },
          (error) => {
            console.error("Upload failed:", error);
            setLoading(false);
            alert("Upload failed! Check Storage rules.");
          },
          async () => {
            const finalUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await createVideoDoc(finalUrl);
          }
        );
      } else {
         await createVideoDoc(url);
      }
    } catch (error) {
      console.error("Error: ", error);
      setLoading(false);
    }
  };

  const createVideoDoc = async (videoUrl) => {
    await addDoc(collection(db, VIDEO_COLLECTION), {
      title,
      url: videoUrl,
      likedBy: [], 
      userId: user.uid,
      username: user.displayName || 'Player 1',
      createdAt: serverTimestamp()
    });
    setTitle('');
    setUrl('');
    setFile(null);
    setProgress(0);
    setLoading(false);
    onClose();
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
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-green-900">Level Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: World 1-1 Speedrun"
              className="w-full p-3 border-4 border-black bg-white focus:outline-none focus:ring-4 focus:ring-green-400 font-bold"
              autoFocus
            />
          </div>

          <div className="flex border-b-4 border-black mb-4">
             <button
               type="button" 
               onClick={() => setActiveTab('link')}
               className={`flex-1 py-2 font-bold pixel-font text-xs flex items-center justify-center gap-2 ${activeTab === 'link' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
             >
               <LinkIcon size={14} /> FREE (LINK)
             </button>
             <button 
               type="button"
               onClick={() => setActiveTab('file')}
               className={`flex-1 py-2 font-bold pixel-font text-xs flex items-center justify-center gap-2 ${activeTab === 'file' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
             >
               <Film size={14} /> UPLOAD (20MB)
             </button>
          </div>

          {activeTab === 'link' ? (
             <div>
               <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-green-900">YouTube URL</label>
               <input 
                 type="url" 
                 value={url}
                 onChange={(e) => setUrl(e.target.value)}
                 placeholder="https://youtube.com/..."
                 className="w-full p-3 border-4 border-black bg-white focus:outline-none focus:ring-4 focus:ring-green-400 font-bold"
               />
               <p className="text-[10px] mt-2 text-green-800 font-bold flex items-center gap-1">
                 <LinkIcon size={10} /> Best for long videos (0% Storage Used)
               </p>
             </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-green-900">Select Video File</label>
              <div className="relative border-4 border-dashed border-green-700 bg-green-50 p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-colors">
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Film size={32} className="text-green-700 mb-2" />
                  <span className="font-bold text-green-800 text-sm pixel-font">
                    {file ? file.name : "CLICK TO CHOOSE"}
                  </span>
              </div>
              <p className="text-[10px] mt-2 text-red-600 font-bold flex items-center gap-1">
                 <AlertTriangle size={10} /> Max 20MB (Consumes Free Quota)
               </p>
            </div>
          )}

          {loading && activeTab === 'file' && (
             <div className="w-full border-4 border-black bg-gray-300 h-8 relative">
               <div 
                 className="h-full bg-yellow-400 transition-all duration-200"
                 style={{ width: `${progress}%` }}
               ></div>
               <span className="absolute inset-0 flex items-center justify-center text-xs font-bold pixel-font">
                 UPLOADING {Math.round(progress)}%
               </span>
             </div>
          )}

          <div className="flex justify-end pt-4">
            <PixelButton color="green" type="submit" className="w-full" disabled={loading}>
              {loading ? 'WARPING...' : 'UPLOAD LEVEL'}
            </PixelButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- AUTH SCREEN ---
const AuthScreen = ({ onGoogleLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    await onGoogleLogin();
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
            
            <div className="space-y-4">
              <p className="text-gray-400 pixel-font text-[10px] mb-4">PLEASE CONNECT CONTROLLER</p>
              
              <button 
                onClick={handleStart}
                disabled={loading}
                className="w-full py-4 bg-white hover:bg-gray-100 text-black border-4 border-gray-400 shadow-[4px_4px_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" alt="G" className="w-6 h-6" />
                <span className="pixel-font font-bold tracking-tighter">
                   {loading ? 'CONNECTING...' : 'LOGIN WITH GOOGLE'}
                </span>
              </button>
            </div>
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
  
  const [currentView, setCurrentView] = useState('feed'); 
  const [channelTarget, setChannelTarget] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) { console.error("Login failed", e); }
  };

  const navigateToChannel = (targetUser) => {
    setChannelTarget(targetUser);
    setCurrentView('channel');
    window.scrollTo(0, 0);
  };

  if (loading) return <div className="min-h-screen bg-black text-white p-10 pixel-font">LOADING...</div>;
  if (!user) return <AuthScreen onGoogleLogin={handleGoogleLogin} />;

  if (currentView === 'channel' && channelTarget) {
    return (
      <WarpZone 
        targetUser={channelTarget} 
        videos={videos} 
        currentUser={user}
        onBack={() => setCurrentView('feed')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#5c94fc] font-sans selection:bg-red-500 selection:text-white pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .pixel-font { font-family: 'Press Start 2P', cursive; }
        .blink-text { animation: blink 1s linear infinite; }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>

      <Header 
        user={user} 
        onUploadClick={() => setIsUploadOpen(true)}
        onMyChannel={() => navigateToChannel({ uid: user.uid, displayName: user.displayName })}
        onHomeClick={() => setCurrentView('feed')}
      />

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
             <PixelButton color="green" onClick={() => setIsUploadOpen(true)}>Create First Level</PixelButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {videos.map((video) => (
              <VideoCard 
                key={video.id} 
                video={video} 
                user={user} 
                onUserClick={navigateToChannel}
              />
            ))}
          </div>
        )}
      </main>

      <div className="fixed top-32 left-10 w-24 h-12 bg-white/80 rounded-full blur-xl pointer-events-none -z-0"></div>
      <div className="fixed top-48 right-20 w-32 h-16 bg-white/80 rounded-full blur-xl pointer-events-none -z-0"></div>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} user={user} />
    </div>
  );
}


