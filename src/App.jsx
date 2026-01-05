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
  increment,
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
  User as UserIcon, 
  Gamepad2, 
  ArrowLeft, 
  Settings, 
  Film, 
  Link as LinkIcon, 
  AlertTriangle, 
  Maximize, 
  RotateCcw, 
  Heart,
  Star,
  Globe,
  Share2,
  Copy,
  Search
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

// Initialize Firebase
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
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  } catch (e) {
    return null;
  }
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleDateString();
};

// --- COMPONENTS ---

const PixelButton = ({ children, onClick, color = 'red', className = '', type = 'button', disabled = false }) => {
  const colors = {
    red: 'bg-red-600 border-red-800 text-white hover:bg-red-500',
    green: 'bg-green-600 border-green-800 text-white hover:bg-green-500',
    yellow: 'bg-yellow-400 border-yellow-600 text-black hover:bg-yellow-300',
    blue: 'bg-blue-500 border-blue-700 text-white hover:bg-blue-400',
    gray: 'bg-gray-500 border-gray-700 text-white hover:bg-gray-400',
    purple: 'bg-purple-600 border-purple-800 text-white hover:bg-purple-500',
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

// --- SEARCH RESULTS SCREEN ---
const SearchResultsScreen = ({ query, videos, user, onUserClick, onWatch, onBack }) => {
  // Filter Videos
  const matchedVideos = videos.filter(v => 
    v.title.toLowerCase().includes(query.toLowerCase())
  );

  // Filter Channels (Get unique authors that match query)
  const matchedChannels = videos.reduce((acc, v) => {
    if (v.username.toLowerCase().includes(query.toLowerCase())) {
      if (!acc.find(c => c.uid === v.userId)) {
        acc.push({ uid: v.userId, displayName: v.username });
      }
    }
    return acc;
  }, []);

  return (
    <div className="min-h-screen bg-[#202020] p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <PixelButton color="gray" onClick={onBack} className="flex items-center gap-2 mb-4">
            <ArrowLeft size={16} /> BACK TO FEED
          </PixelButton>
          <h2 className="text-white pixel-font text-xl md:text-2xl border-b-4 border-white pb-2">
            SEARCH RESULTS FOR "{query}"
          </h2>
        </div>

        {/* CHANNELS SECTION */}
        {matchedChannels.length > 0 && (
          <div className="mb-8">
            <h3 className="text-yellow-400 pixel-font text-sm mb-4">PLAYERS FOUND</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {matchedChannels.map(channel => (
                <div 
                  key={channel.uid}
                  onClick={() => onUserClick(channel)}
                  className="bg-[#333] border-2 border-white p-4 flex items-center gap-4 cursor-pointer hover:bg-[#444] transition-colors"
                >
                  <div className="w-12 h-12 bg-yellow-400 rounded-full border-2 border-black flex items-center justify-center">
                    <span className="text-black font-bold text-lg pixel-font">{channel.displayName[0].toUpperCase()}</span>
                  </div>
                  <span className="text-white font-bold pixel-font truncate">{channel.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIDEOS SECTION */}
        <div>
          <h3 className="text-green-400 pixel-font text-sm mb-4">LEVELS FOUND ({matchedVideos.length})</h3>
          {matchedVideos.length === 0 ? (
            <p className="text-gray-500 pixel-font text-xs">NO LEVELS FOUND MATCHING THIS QUERY.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {matchedVideos.map((video, idx) => (
                <VideoCard 
                  key={video.id || idx}
                  video={video} 
                  user={user} 
                  onUserClick={onUserClick}
                  onWatch={onWatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- WATCH SCREEN ---
const WatchScreen = ({ video, currentUser, onBack, onNavigateToChannel, subscribedTo = [] }) => {
  const [uploaderData, setUploaderData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showShare, setShowShare] = useState(false);
  
  const likedBy = video.likedBy || [];
  const initialHasLiked = currentUser && likedBy.includes(currentUser.uid);
  const [isLikedOptimistic, setIsLikedOptimistic] = useState(initialHasLiked);
  const [likeCountOptimistic, setLikeCountOptimistic] = useState(likedBy.length);

  const videoRef = useRef(null);

  const isUploadedFile = video.url.includes('firebasestorage');
  const ytid = getYoutubeId(video.url);
  const canRenderYoutube = !isUploadedFile && ytid;

  const isSubscribed = subscribedTo.includes(video.userId);
  const isOwnChannel = currentUser?.uid === video.userId;

  useEffect(() => {
    setIsLikedOptimistic(currentUser && (video.likedBy || []).includes(currentUser.uid));
    setLikeCountOptimistic((video.likedBy || []).length);
  }, [video.likedBy, currentUser]);

  useEffect(() => {
    const fetchUploader = async () => {
      if (!video.userId) return;
      const snap = await getDoc(doc(db, USERS_COLLECTION, video.userId));
      if (snap.exists()) {
        setUploaderData(snap.data());
      }
    };
    fetchUploader();
  }, [video]);

  const handleToggleSubscribe = async () => {
    if (!currentUser) return;
    const myRef = doc(db, USERS_COLLECTION, currentUser.uid);
    const uploaderRef = doc(db, USERS_COLLECTION, video.userId);

    try {
      if (isSubscribed) {
        await updateDoc(myRef, { subscribedTo: arrayRemove(video.userId) });
        await updateDoc(uploaderRef, { subscriberCount: increment(-1) });
      } else {
        await setDoc(myRef, { subscribedTo: arrayUnion(video.userId) }, { merge: true });
        await setDoc(uploaderRef, { subscriberCount: increment(1) }, { merge: true });
      }
    } catch (e) { console.error("Sub Error", e); }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    
    const newIsLiked = !isLikedOptimistic;
    setIsLikedOptimistic(newIsLiked);
    setLikeCountOptimistic(prev => newIsLiked ? prev + 1 : prev - 1);

    const docRef = doc(db, VIDEO_COLLECTION, video.id);
    try {
      if (!newIsLiked) {
        await updateDoc(docRef, { likedBy: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(docRef, { likedBy: arrayUnion(currentUser.uid) });
      }
    } catch (e) { 
      console.error("Like Error", e);
      setIsLikedOptimistic(!newIsLiked);
      setLikeCountOptimistic(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(video.url);
    setShowShare(true);
    setTimeout(() => setShowShare(false), 2000);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
      setIsPlaying(!videoRef.current.paused);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  const MKTVButton = ({ onClick, icon: Icon }) => (
    <button 
      onClick={onClick}
      className="bg-black/50 backdrop-blur-sm border-2 border-white/50 text-white rounded-full p-3 hover:bg-white hover:text-black hover:scale-110 transition-all duration-200 shadow-lg"
    >
      <Icon size={24} fill="currentColor" className="opacity-100" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#202020] text-white font-mono flex flex-col">
      <div className="bg-[#5c94fc] p-4 border-b-4 border-black flex justify-between items-center sticky top-0 z-50 shadow-xl">
        <PixelButton color="gray" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft size={16} /> BACK
        </PixelButton>
        <div className="text-white font-black pixel-font text-xl drop-shadow-md">MKTV PLAYER</div>
      </div>

      <div className="max-w-5xl mx-auto w-full flex-1 p-4 md:p-6 space-y-6">
        
        <div className="bg-black border-4 border-white rounded-xl overflow-hidden shadow-2xl relative aspect-video group">
           <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-50">
             <div className="text-white font-black italic tracking-tighter text-3xl drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">MKTV</div>
           </div>

           {isUploadedFile ? (
             <>
                <video
                  ref={videoRef}
                  src={video.url}
                  className="w-full h-full object-contain"
                  controls={false}
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  autoPlay
                />
                <div className={`absolute bottom-6 right-6 z-30 flex gap-4 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                   <MKTVButton onClick={() => { if(videoRef.current) videoRef.current.currentTime = 0; }} icon={RotateCcw} />
                   <MKTVButton onClick={togglePlay} icon={isPlaying ? Pause : Play} />
                   <MKTVButton onClick={() => { if(videoRef.current) videoRef.current.requestFullscreen(); }} icon={Maximize} />
                </div>
                <div className="absolute bottom-0 left-0 w-full h-3 bg-gray-800/50 cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    if(videoRef.current) videoRef.current.currentTime = pos * videoRef.current.duration;
                }}>
                   <div className="h-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" style={{ width: `${progress}%` }} />
                </div>
             </>
           ) : (
             canRenderYoutube ? (
               <iframe
                  src={`https://www.youtube.com/embed/${ytid}?autoplay=1&modestbranding=1&rel=0`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
             ) : (
               <div className="flex items-center justify-center h-full text-red-500 pixel-font">VIDEO NOT FOUND</div>
             )
           )}
        </div>

        <div className="bg-[#333] border-4 border-black p-6 rounded-lg shadow-lg flex flex-col md:flex-row gap-6 justify-between">
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">{video.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-gray-400 text-xs pixel-font">
                <span>{video.createdAt ? formatTime(video.createdAt) : 'Unknown Date'}</span>
                <span>•</span>
                <span>ID: {video.id.slice(0,6)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 border-t-2 border-gray-600 pt-4">
              <div 
                className="w-12 h-12 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onNavigateToChannel({ uid: video.userId, displayName: video.username })}
              >
                <span className="text-black font-bold text-lg pixel-font">{video.username?.[0]?.toUpperCase()}</span>
              </div>
              <div>
                <h3 
                  className="font-bold text-white hover:underline cursor-pointer"
                  onClick={() => onNavigateToChannel({ uid: video.userId, displayName: video.username })}
                >
                  {video.username}
                </h3>
                <p className="text-xs text-gray-400 pixel-font">
                  {uploaderData?.subscriberCount || 0} subscribers
                </p>
              </div>
              
              {!isOwnChannel && currentUser && (
                <button 
                  onClick={handleToggleSubscribe}
                  className={`ml-4 px-4 py-2 rounded-full font-bold text-xs pixel-font transition-all ${isSubscribed ? 'bg-gray-600 text-white' : 'bg-red-600 text-white hover:bg-red-500'}`}
                >
                  {isSubscribed ? 'SUBSCRIBED' : 'SUBSCRIBE'}
                </button>
              )}
            </div>
          </div>

          <div className="flex md:flex-col gap-3 justify-start md:items-end">
             <button 
               onClick={handleLike}
               disabled={!currentUser}
               className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 transition-all active:scale-95 ${isLikedOptimistic ? 'bg-white text-red-600 border-red-600' : 'bg-[#444] border-gray-600 hover:bg-[#555]'}`}
             >
               <Heart size={20} fill={isLikedOptimistic ? "currentColor" : "none"} />
               <span className="font-bold pixel-font">{likeCountOptimistic} LIKES</span>
             </button>

             <button 
               onClick={handleShare}
               className="flex items-center gap-2 px-6 py-3 rounded-full border-2 bg-[#444] border-gray-600 hover:bg-[#555] active:scale-95"
             >
               {showShare ? <Copy size={20} className="text-green-400" /> : <Share2 size={20} />}
               <span className="font-bold pixel-font">{showShare ? 'COPIED!' : 'SHARE'}</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- WARP ZONE (CHANNEL PAGE) ---
const WarpZone = ({ targetUser, videos, currentUser, onBack, onWatch, subscribedTo = [] }) => {
  const [channelData, setChannelData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  
  const isSubscribed = subscribedTo.includes(targetUser.uid);
  const isOwnChannel = currentUser?.uid === targetUser.uid;

  useEffect(() => {
    const fetchChannel = async () => {
      if (!targetUser?.uid) return;
      try {
        const docRef = doc(db, USERS_COLLECTION, targetUser.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setChannelData(snap.data());
          setNewDesc(snap.data().description || '');
        } else if (isOwnChannel) {
          setIsEditing(true);
        }
      } catch (e) { console.error("Error fetching channel:", e); }
    };
    fetchChannel();
  }, [targetUser, currentUser]);

  const saveChannel = async () => {
    if (!currentUser) return;
    try {
      await setDoc(doc(db, USERS_COLLECTION, currentUser.uid), {
        description: newDesc,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setChannelData({ ...channelData, description: newDesc });
      setIsEditing(false);
    } catch (e) { console.error("Error saving channel:", e); }
  };

  const toggleSubscribe = async () => {
    if (!currentUser) return;
    const myRef = doc(db, USERS_COLLECTION, currentUser.uid);
    const uploaderRef = doc(db, USERS_COLLECTION, targetUser.uid);
    try {
      if (isSubscribed) {
        await updateDoc(myRef, { subscribedTo: arrayRemove(targetUser.uid) });
        await updateDoc(uploaderRef, { subscriberCount: increment(-1) });
      } else {
        await setDoc(myRef, { subscribedTo: arrayUnion(targetUser.uid) }, { merge: true });
        await setDoc(uploaderRef, { subscriberCount: increment(1) }, { merge: true });
      }
    } catch (e) { console.error("Sub Error", e); }
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
          <div className="inline-block border-4 border-white p-4 bg-black/80 max-w-2xl relative">
            
            {!isOwnChannel && currentUser && (
              <div className="absolute -top-6 -right-6 transform rotate-12">
                <button 
                  onClick={toggleSubscribe}
                  className={`p-3 border-4 border-black shadow-lg transition-all active:scale-95 ${isSubscribed ? 'bg-gray-400' : 'bg-yellow-400 hover:bg-yellow-300 animate-bounce'}`}
                >
                  <Star size={32} fill={isSubscribed ? "gray" : "white"} className="text-black" />
                </button>
              </div>
            )}

            <h2 className="text-xl md:text-2xl text-[#e52521] pixel-font mb-2">
              {targetUser.displayName}'S CHANNEL
            </h2>
            <p className="text-xs md:text-sm text-gray-300 leading-relaxed pixel-font">
              {channelData?.description || "This player hasn't written a bio yet."}
            </p>
            <p className="text-xs text-yellow-400 mt-2 pixel-font">
               {channelData?.subscriberCount || 0} SUBSCRIBERS
            </p>

            {isOwnChannel && (
              <button 
                onClick={() => setIsEditing(true)}
                className="mt-4 text-[10px] uppercase text-blue-400 hover:text-blue-300 pixel-font flex items-center gap-2 mx-auto"
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
            userVideos.map((video, index) => (
               <div key={video.id || index} className="group relative flex flex-col items-center">
                  <div className="mb-2 text-white pixel-font text-xs animate-bounce">
                    {index + 1}
                  </div>
                  
                  {/* PIPE/THUMBNAIL: Now clickable to watch */}
                  <div 
                    className="relative w-48 md:w-64 aspect-video bg-gray-900 border-4 border-white rounded mb-[-4px] z-10 overflow-hidden shadow-xl cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => onWatch(video)}
                  >
                    <img 
                      src={getYoutubeId(video.url) ? `https://img.youtube.com/vi/${getYoutubeId(video.url)}/hqdefault.jpg` : 'https://placehold.co/600x400/000000/FFFFFF?text=Level'}
                      onError={(e) => e.target.src = 'https://placehold.co/600x400/000000/FFFFFF?text=Video'} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                       <Play size={40} className="text-white drop-shadow-md" fill="white" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center w-full">
                    <div className="w-56 md:w-72 h-12 bg-gradient-to-r from-[#008800] via-[#00cc00] to-[#006600] border-4 border-black relative z-20 shadow-lg"></div>
                    <div className="w-48 md:w-64 h-32 md:h-48 bg-gradient-to-r from-[#008800] via-[#00cc00] to-[#006600] border-x-4 border-black"></div>
                  </div>
               </div>
            ))
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

const Header = ({ user, onUploadClick, onMyChannel, onHomeClick, onSearch }) => {
  const [query, setQuery] = useState('');
  const userInitial = user?.displayName ? user.displayName.charAt(0).toUpperCase() : '?';

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#5c94fc] border-b-4 border-black shadow-xl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        
        <div className="flex items-center space-x-3 cursor-pointer group shrink-0" onClick={onHomeClick}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-600 rounded-lg border-2 border-black flex items-center justify-center transform group-hover:scale-105 transition-transform">
            <span className="text-white font-bold text-lg sm:text-xl pixel-font">M</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white stroke-black pixel-font tracking-tighter drop-shadow-md hidden md:block">
            MarioTube
          </h1>
        </div>

        {/* SEARCH BAR (CENTERED) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
           <input 
             type="text" 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder="Search levels..."
             className="w-full pl-3 pr-10 py-2 border-4 border-black pixel-font text-xs md:text-sm focus:outline-none focus:ring-4 focus:ring-yellow-400"
           />
           <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black">
             <Search size={18} />
           </button>
        </form>

        {user ? (
          <div className="flex items-center space-x-2 shrink-0">
            <button 
              onClick={onMyChannel}
              className="hidden md:flex items-center space-x-2 bg-black/20 pr-3 py-1 pl-1 rounded-full hover:bg-black/40 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center shadow-sm group-hover:bg-yellow-300">
                <span className="text-black font-bold text-xs pixel-font">{userInitial}</span>
              </div>
            </button>
            
            <PixelButton color="green" onClick={onUploadClick} className="!py-2 !px-3 !text-xs flex items-center gap-1">
              <Upload size={14} /> <span className="hidden sm:inline">Upload</span>
            </PixelButton>
            
            <button 
              onClick={() => signOut(auth)}
              className="p-2 bg-red-600 text-white border-2 border-black rounded hover:bg-red-500 transition-colors"
              title="Quit Game"
            >
              <LogOut size={16} />
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
const VideoCard = ({ video, user, onUserClick, onWatch }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Optimistic Like State
  const likedBy = video.likedBy || [];
  const initialHasLiked = user && likedBy.includes(user.uid);
  const [isLikedOptimistic, setIsLikedOptimistic] = useState(initialHasLiked);
  const [likeCountOptimistic, setLikeCountOptimistic] = useState(likedBy.length);

  useEffect(() => {
    setIsLikedOptimistic(user && (video.likedBy || []).includes(user.uid));
    setLikeCountOptimistic((video.likedBy || []).length);
  }, [video.likedBy, user]);

  if (!video || !video.url) return null;

  const isUploadedFile = video.url.includes('firebasestorage');
  const ytid = getYoutubeId(video.url);
  const canRenderYoutube = !isUploadedFile && ytid;

  let thumbnail = null;
  if (canRenderYoutube) {
    thumbnail = `https://img.youtube.com/vi/${ytid}/hqdefault.jpg`;
  }

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return;

    // Optimistic Update
    const newIsLiked = !isLikedOptimistic;
    setIsLikedOptimistic(newIsLiked);
    setLikeCountOptimistic(prev => newIsLiked ? prev + 1 : prev - 1);

    try {
      const docRef = doc(db, VIDEO_COLLECTION, video.id);
      if (!newIsLiked) {
        await updateDoc(docRef, { likedBy: arrayRemove(user.uid) });
      } else {
        await updateDoc(docRef, { likedBy: arrayUnion(user.uid) });
      }
    } catch (error) { 
      // Revert if failed
      setIsLikedOptimistic(!newIsLiked);
      setLikeCountOptimistic(prev => !newIsLiked ? prev + 1 : prev - 1);
      
      try {
        const docRef = doc(db, VIDEO_COLLECTION, video.id);
        await setDoc(docRef, { likedBy: [user.uid] }, { merge: true });
      } catch (err2) {
        console.error("Like failed", err2);
      }
    }
  };

  return (
    <div 
      className="bg-white border-4 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] transform transition-all hover:-translate-y-1 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onWatch(video)}
    >
      <div className="relative aspect-video bg-black group">
          <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#000]">
             {thumbnail ? (
                <img 
                  src={thumbnail}
                  className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:opacity-80 transition-opacity"
                  alt="Thumbnail"
                />
             ) : (
               <>
                 <div className="absolute inset-0 opacity-20 bg-[#5c94fc] bg-[url('https://www.transparenttextures.com/patterns/brick-wall.png')]"></div>
                 <div className="absolute top-4 right-4 text-white opacity-50">
                    {isUploadedFile ? <Film size={48} /> : <Film size={48} />}
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
      </div>

      <div className="p-4 bg-[#f8f9fa]">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 text-gray-800 hover:text-red-600 transition-colors">{video.title}</h3>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div 
            className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 p-1 rounded transition-colors"
            onClick={(e) => { e.stopPropagation(); onUserClick({ uid: video.userId, displayName: video.username }); }}
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
                isLikedOptimistic
                  ? 'bg-red-500 border-black text-white' 
                  : user 
                    ? 'bg-yellow-400 border-black text-black hover:bg-yellow-300' 
                    : 'bg-gray-100 border-gray-300 opacity-50 cursor-not-allowed'
              }
            `}
          >
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isLikedOptimistic ? 'bg-red-300 border-red-700' : 'bg-yellow-300 border-yellow-600'}`}>
               <Heart size={10} fill={isLikedOptimistic ? "currentColor" : "none"} />
            </div>
            <span className="font-black text-sm">{likeCountOptimistic}</span>
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
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [currentView, setCurrentView] = useState('feed'); // 'feed' | 'channel' | 'watch' | 'search'
  const [channelTarget, setChannelTarget] = useState(null);
  const [watchTarget, setWatchTarget] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter State ('all' | 'subs')
  const [feedFilter, setFeedFilter] = useState('all');
  const [mySubscriptions, setMySubscriptions] = useState([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Subscription Listener (Real-time updates of who I follow)
  useEffect(() => {
    if (!user) {
      setMySubscriptions([]);
      return;
    }
    const userRef = doc(db, USERS_COLLECTION, user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMySubscriptions(data.subscribedTo || []);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Video Feed Listener
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

  // NAVIGATION HANDLERS
  const navigateToChannel = (targetUser) => {
    setChannelTarget(targetUser);
    setCurrentView('channel');
    window.scrollTo(0, 0);
  };

  const navigateToWatch = (video) => {
    setWatchTarget(video);
    setCurrentView('watch');
    window.scrollTo(0, 0);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentView('search');
    window.scrollTo(0, 0);
  };

  // RENDER LOGIC
  if (loading) return <div className="min-h-screen bg-black text-white p-10 pixel-font">LOADING...</div>;
  if (!user) return <AuthScreen onGoogleLogin={handleGoogleLogin} />;

  if (currentView === 'search') {
    return (
      <>
        <Header 
          user={user} 
          onUploadClick={() => setIsUploadOpen(true)}
          onMyChannel={() => navigateToChannel({ uid: user.uid, displayName: user.displayName })}
          onHomeClick={() => setCurrentView('feed')}
          onSearch={handleSearch}
        />
        <SearchResultsScreen 
          query={searchQuery}
          videos={videos}
          user={user}
          onUserClick={navigateToChannel}
          onWatch={navigateToWatch}
          onBack={() => setCurrentView('feed')}
        />
        <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} user={user} />
      </>
    );
  }

  if (currentView === 'watch' && watchTarget) {
    return (
      <WatchScreen
        video={watchTarget}
        currentUser={user}
        subscribedTo={mySubscriptions}
        onBack={() => setCurrentView('feed')}
        onNavigateToChannel={navigateToChannel}
      />
    );
  }

  if (currentView === 'channel' && channelTarget) {
    return (
      <WarpZone 
        targetUser={channelTarget} 
        videos={videos} 
        currentUser={user}
        subscribedTo={mySubscriptions}
        onBack={() => setCurrentView('feed')} 
        onWatch={navigateToWatch}
      />
    );
  }

  // Filter Logic for FEED
  const filteredVideos = feedFilter === 'subs' 
    ? videos.filter(v => mySubscriptions.includes(v.userId))
    : videos;

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
        onSearch={handleSearch}
      />

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between border-b-8 border-[#925a3d] pb-4 px-2 gap-4">
          <div>
            <h2 className="text-white font-black text-2xl md:text-4xl drop-shadow-[4px_4px_0_rgba(0,0,0,0.5)] uppercase italic transform -skew-x-6">
              {feedFilter === 'all' ? 'World 1-1' : 'Star World'}
            </h2>
            <p className="text-white font-bold text-sm bg-black/30 inline-block px-2 mt-1 rounded">
              {filteredVideos.length} LEVELS FOUND
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
             <button 
               onClick={() => setFeedFilter('all')}
               className={`px-4 py-2 pixel-font text-xs font-bold border-4 border-black transition-transform active:translate-y-1 ${feedFilter === 'all' ? 'bg-red-600 text-white' : 'bg-white text-black hover:bg-gray-100'}`}
             >
               <Globe size={14} className="inline mr-2" />
               WORLD 1-1
             </button>
             <button 
               onClick={() => setFeedFilter('subs')}
               className={`px-4 py-2 pixel-font text-xs font-bold border-4 border-black transition-transform active:translate-y-1 ${feedFilter === 'subs' ? 'bg-yellow-400 text-black' : 'bg-white text-black hover:bg-gray-100'}`}
             >
               <Star size={14} className="inline mr-2" />
               STAR WORLD
             </button>
          </div>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/10 border-4 border-dashed border-white/40 rounded-xl">
             <Gamepad2 size={64} className="text-white mb-4 opacity-50" />
             <p className="text-white text-xl font-bold mb-4">No levels found!</p>
             {feedFilter === 'subs' && (
                <p className="text-white/70 text-xs pixel-font mb-4">Visit a channel and click the Star to subscribe!</p>
             )}
             {feedFilter === 'all' && (
                <PixelButton color="green" onClick={() => setIsUploadOpen(true)}>Create First Level</PixelButton>
             )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVideos.map((video, idx) => (
              <VideoCard 
                key={video.id || idx}
                video={video} 
                user={user} 
                onUserClick={navigateToChannel}
                onWatch={navigateToWatch}
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


